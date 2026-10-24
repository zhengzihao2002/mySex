import 'server-only';
import { randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { db, sql } from './db';
import { getRequestGeo } from './geo';
import { getAuth } from './auth/server';
import { forgetDevices, isDeviceRevoked, rememberDevice, revocationHash } from './privacy';

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

/** Call after a successful sign-in: remembers the device and logs where it signed in from. */
export async function recordLogin(userId: string | null | undefined) {
  if (!userId) return;
  try {
    const previousId = await currentDeviceId();
    if (previousId) await forgetDevices(db(), userId, previousId);
    const deviceId = randomUUID();
    (await cookies()).set(DEVICE_COOKIE, deviceId, deviceCookieOptions);
    const { data } = await getAuth().getSession();
    const ua = (await headers()).get('user-agent');
    const g = await getRequestGeo();
    await rememberDevice(db(), userId, deviceId, data?.session?.id ?? null, {
      userAgent: ua, ip: g.ip, city: g.city, region: g.region, country: g.country,
    }, true);
  } catch (e) {
    console.error('[devices] recordLogin failed', e);
  }
}

/**
 * Called from the signed-in layout. Keeps "last active" fresh (at most every 10 minutes,
 * to spare the free-tier database) and reports whether this device was signed out remotely.
 */
export async function touchDevice(userId: string, sessionId: string | null = null): Promise<{ revoked: boolean }> {
  const deviceId = await currentDeviceId();
  if (!deviceId) return { revoked: false };
  if (await isDeviceRevoked(db(), deviceId, sessionId)) return { revoked: true };
  const rows = await sql`
    select user_id, revoked_at, auth_session_hash, last_seen < now() - make_interval(mins => ${TOUCH_EVERY_MIN}) as stale
    from devices where device_id = ${deviceId}`;
  const row = rows[0];
  if (row && row.user_id === userId && row.revoked_at) return { revoked: true };
  const sessionHash = sessionId ? revocationHash('session', sessionId) : null;
  if (row && row.user_id === userId && !row.stale && row.auth_session_hash === sessionHash) return { revoked: false };

  const ua = (await headers()).get('user-agent');
  const g = await getRequestGeo();
  const saved = await rememberDevice(db(), userId, deviceId, sessionId, {
    userAgent: ua, ip: g.ip, city: g.city, region: g.region, country: g.country,
  });
  return { revoked: !saved };
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
