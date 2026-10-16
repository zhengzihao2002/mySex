import 'server-only';
import { randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { sql } from './db';
import { getRequestGeo } from './geo';

export const DEVICE_COOKIE = 'mysex_device';
const TOUCH_EVERY_MIN = 10;

export const deviceCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 400,
};

export async function currentDeviceId() {
  return (await cookies()).get(DEVICE_COOKIE)?.value ?? null;
}

/** Server actions only: returns this browser's device id, creating the cookie if needed. */
async function ensureDeviceId() {
  const jar = await cookies();
  let id = jar.get(DEVICE_COOKIE)?.value;
  if (!id) {
    id = randomUUID();
    jar.set(DEVICE_COOKIE, id, deviceCookieOptions);
  }
  return id;
}

/** Call after a successful sign-in: remembers the device and logs where it signed in from. */
export async function recordLogin(userId: string | null | undefined) {
  if (!userId) return;
  try {
    const deviceId = await ensureDeviceId();
    const ua = (await headers()).get('user-agent');
    const g = await getRequestGeo();
    await sql`
      insert into devices (device_id, user_id, user_agent, ip, city, region, country, signed_in_at, last_seen, revoked_at)
      select ${deviceId}, ${userId}, ${ua}, ${g.ip}, ${g.city}, ${g.region}, ${g.country}, now(), now(), null
      where exists (select 1 from profiles where user_id = ${userId})
      on conflict (device_id) do update set
        user_id = excluded.user_id, user_agent = excluded.user_agent, ip = excluded.ip, city = excluded.city,
        region = excluded.region, country = excluded.country, signed_in_at = now(), last_seen = now(), revoked_at = null`;
    await sql`
      insert into login_events (user_id, device_id, user_agent, ip, city, region, country)
      select ${userId}, ${deviceId}, ${ua}, ${g.ip}, ${g.city}, ${g.region}, ${g.country}
      where exists (select 1 from profiles where user_id = ${userId})`;
    await sql`
      delete from login_events where user_id = ${userId} and id not in (
        select id from login_events where user_id = ${userId} order by at desc limit 50)`;
  } catch (e) {
    console.error('[devices] recordLogin failed', e);
  }
}

/**
 * Called from the signed-in layout. Keeps "last active" fresh (at most every 10 minutes,
 * to spare the free-tier database) and reports whether this device was signed out remotely.
 */
export async function touchDevice(userId: string): Promise<{ revoked: boolean }> {
  const deviceId = await currentDeviceId();
  if (!deviceId) return { revoked: false };
  const rows = await sql`
    select user_id, revoked_at, last_seen < now() - make_interval(mins => ${TOUCH_EVERY_MIN}) as stale
    from devices where device_id = ${deviceId}`;
  const row = rows[0];
  if (row && row.user_id === userId && row.revoked_at) return { revoked: true };
  if (row && row.user_id === userId && !row.stale) return { revoked: false };

  const ua = (await headers()).get('user-agent');
  const g = await getRequestGeo();
  await sql`
    insert into devices (device_id, user_id, user_agent, ip, city, region, country)
    values (${deviceId}, ${userId}, ${ua}, ${g.ip}, ${g.city}, ${g.region}, ${g.country})
    on conflict (device_id) do update set
      user_id = excluded.user_id, user_agent = excluded.user_agent, ip = excluded.ip, city = excluded.city,
      region = excluded.region, country = excluded.country, last_seen = now(),
      revoked_at = case when devices.user_id = excluded.user_id then devices.revoked_at else null end`;
  return { revoked: false };
}

export type Device = {
  deviceId: string;
  userAgent: string | null;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  signedInAt: string;
  lastSeen: string;
  revokedAt: string | null;
};

export type LoginEvent = {
  id: string;
  deviceId: string | null;
  userAgent: string | null;
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  at: string;
};

const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));

export async function getDevices(userId: string): Promise<Device[]> {
  const rows = await sql`select * from devices where user_id = ${userId} order by revoked_at nulls first, last_seen desc limit 30`;
  return rows.map((r) => ({
    deviceId: r.device_id,
    userAgent: r.user_agent,
    ip: r.ip,
    city: r.city,
    region: r.region,
    country: r.country,
    signedInAt: iso(r.signed_in_at)!,
    lastSeen: iso(r.last_seen)!,
    revokedAt: iso(r.revoked_at),
  }));
}

export async function getLoginEvents(userId: string, limit = 15): Promise<LoginEvent[]> {
  const rows = await sql`select * from login_events where user_id = ${userId} order by at desc limit ${limit}`;
  return rows.map((r) => ({
    id: String(r.id),
    deviceId: r.device_id,
    userAgent: r.user_agent,
    ip: r.ip,
    city: r.city,
    region: r.region,
    country: r.country,
    at: iso(r.at)!,
  }));
}
