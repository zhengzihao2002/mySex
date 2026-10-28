import { createHash } from 'node:crypto';
import type { NeonQueryFunction } from '@neondatabase/serverless';

type Client = NeonQueryFunction<false, false>;

export const revocationHash = (kind: 'device' | 'session', id: string) =>
  createHash('sha256').update(`${kind}:${id}`).digest('hex');

/** Tombstones contain only anonymous hashes, never user IDs, IPs, or device details. */
export async function isDeviceRevoked(client: Client, deviceId: string | null, sessionId: string | null = null) {
  const keys = [deviceId && revocationHash('device', deviceId), sessionId && revocationHash('session', sessionId)].filter(Boolean) as string[];
  if (!keys.length) return false;
  const rows = await client`select 1 from device_revocations where key_hash = any(${keys}) and expires_at > now() limit 1`;
  return rows.length > 0;
}

/** Revoke first, then physically remove the selected device and all of its sign-in history. */
export async function forgetDevices(client: Client, userId: string, deviceId: string | null, others = false) {
  await client.transaction((tx) => [
    tx`select pg_advisory_xact_lock(hashtext(${'devices:' + userId}))`,
    tx`
    with targets as materialized (
      select device_id, auth_session_hash from devices
      where user_id = ${userId}
        and case when ${others} then device_id is distinct from ${deviceId} else device_id = ${deviceId} end
      for update
    ), marked as (
      insert into device_revocations (key_hash, expires_at)
      select encode(sha256(convert_to('device:' || device_id, 'UTF8')), 'hex'), now() + interval '400 days' from targets
      union
      select auth_session_hash, now() + interval '400 days' from targets where auth_session_hash is not null
      on conflict (key_hash) do update set expires_at = greatest(device_revocations.expires_at, excluded.expires_at)
    ), events_deleted as (
      delete from login_events where user_id = ${userId}
        and case when ${others} then device_id is distinct from ${deviceId} else device_id = ${deviceId} end
    )
    delete from devices where user_id = ${userId} and device_id in (select device_id from targets)`,
  ]);
}

type DeviceDetails = { userAgent: string | null; ip: string | null; city: string | null; region: string | null; country: string | null };

/** The same per-user lock as logout prevents an in-flight touch from restoring deleted IP data. */
export async function rememberDevice(
  client: Client, userId: string, deviceId: string, sessionId: string | null, details: DeviceDetails, login = false,
): Promise<boolean> {
  const sessionHash = sessionId ? revocationHash('session', sessionId) : null;
  const keys = [revocationHash('device', deviceId), ...(sessionHash ? [sessionHash] : [])];
  const { userAgent, ip, city, region, country } = details;
  const results = await client.transaction((tx) => {
    const queries = [
      tx`select pg_advisory_xact_lock(hashtext(${'devices:' + userId}))`,
      tx`insert into devices (device_id, user_id, user_agent, ip, city, region, country, auth_session_hash)
        select ${deviceId}, ${userId}, ${userAgent}, ${ip}, ${city}, ${region}, ${country}, ${sessionHash}
        where exists (select 1 from profiles where user_id = ${userId})
          and not exists (select 1 from device_revocations where key_hash = any(${keys}) and expires_at > now())
        on conflict (device_id) do update set
          user_id = excluded.user_id, user_agent = excluded.user_agent, ip = excluded.ip, city = excluded.city,
          region = excluded.region, country = excluded.country, last_seen = now(), auth_session_hash = excluded.auth_session_hash,
          signed_in_at = case when ${login} then now() else devices.signed_in_at end,
          revoked_at = null
        where devices.user_id = excluded.user_id
        returning device_id`,
    ];
    if (login) queries.push(
      tx`insert into login_events (user_id, device_id, user_agent, ip, city, region, country)
        select ${userId}, ${deviceId}, ${userAgent}, ${ip}, ${city}, ${region}, ${country}
        where exists (select 1 from devices where device_id = ${deviceId} and user_id = ${userId})
          and not exists (select 1 from device_revocations where key_hash = any(${keys}) and expires_at > now())`,
      tx`delete from login_events where user_id = ${userId} and id not in (
        select id from login_events where user_id = ${userId} order by at desc limit 50)`,
    );
    return queries;
  });
  return results[1].length > 0;
}

/** Every signed-in request sweeps expired inbox data; anonymous revocations keep their hourly gate. */
export async function cleanupExpiredData(client: Client) {
  await client`
    with claimed as (
      insert into app_maintenance (name, last_run) values ('retention', now())
      on conflict (name) do update set last_run = excluded.last_run
      where app_maintenance.last_run <= now() - interval '1 hour'
      returning name
    ), deleted_edits as (
      delete from session_edit_requests where created_at <= now() - interval '7 days'
    ), deleted_edit_outcomes as (
      delete from session_edit_outcomes where created_at <= now() - interval '7 days'
    ), deleted_notices as (
      delete from session_edit_notices where created_at <= now() - interval '7 days'
    ), deleted_requests as (
      delete from session_deletion_requests where created_at <= now() - interval '7 days'
    ), deleted_outcomes as (
      delete from session_deletion_outcomes where created_at <= now() - interval '7 days'
    )
    delete from device_revocations where expires_at <= now() and exists (select 1 from claimed)`;
}
