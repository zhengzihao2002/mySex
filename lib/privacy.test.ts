import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { getGpsArea } from './gps-area.ts';
import {searchAddresses} from './address-search.ts';
import { cleanupExpiredData, forgetDevices, isDeviceRevoked, rememberDevice, revocationHash } from './privacy.ts';

const pg = new PGlite();
type Statement = { text: string; values: unknown[] };
const tag = (parts: TemplateStringsArray, ...values: unknown[]): Statement => ({
  text: parts.reduce((s, part, i) => s + (i ? `$${i}` : '') + part, ''), values,
});
const client = Object.assign(async (parts: TemplateStringsArray, ...values: unknown[]) => {
  const q = tag(parts, ...values);
  return (await pg.query(q.text, q.values)).rows;
}, {
  transaction: async (queries: (tx: typeof tag) => Statement[]) => pg.transaction(async (tx) => {
    const results = [];
    for (const q of queries(tag)) results.push((await tx.query(q.text, q.values)).rows);
    return results;
  }),
}) as unknown as NeonQueryFunction<false, false>;
const coupleId = '10000000-0000-4000-8000-000000000001';
const sessionId = '20000000-0000-4000-8000-000000000001';
const details = { userAgent: 'Test phone', ip: '192.0.2.1', city: 'Test city', region: 'Test region', country: 'US' };
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');

before(async () => { await pg.exec(schema); await pg.exec(schema); });
after(async () => pg.close());
beforeEach(async () => {
  await pg.exec('truncate profiles, couples, sessions, session_deletion_requests, device_revocations, app_maintenance cascade');
  await pg.exec(`insert into profiles (user_id, name, invite_code) values ('me', 'Me', 'ME'), ('partner', 'Partner', 'PARTNER')`);
  await pg.query("insert into couples (id, male_id, female_id) values ($1, 'me', 'partner')", [coupleId]);
  await pg.query("insert into sessions (id, couple_id, created_by, started_at) values ($1, $2, 'me', now())", [sessionId, coupleId]);
});

type TestRows = {
  devices: { device_id: string; user_id: string; signed_in_at: Date | string; ip: string | null };
  login_events: { device_id: string | null };
  session_deletion_requests: { status: string };
  device_revocations: { key_hash: string; expires_at: Date | string };
  sessions: { id: string };
};

async function rows<Table extends keyof TestRows>(table: Table): Promise<TestRows[Table][]> {
  return (await pg.query<TestRows[Table]>(`select * from ${table}`)).rows;
}

test('logout removes device and every matching login event, preserving other devices and partner data', async () => {
  await rememberDevice(client, 'me', 'this-phone', 'session-one', details, true);
  await rememberDevice(client, 'me', 'other-phone', 'session-two', details, true);
  await rememberDevice(client, 'partner', 'partner-phone', 'partner-session', details, true);
  await pg.exec("insert into login_events (user_id, device_id, ip) values ('me', 'this-phone', '192.0.2.2')");
  await forgetDevices(client, 'me', 'this-phone');
  assert.deepEqual((await rows('devices')).map((r) => r.device_id).sort(), ['other-phone', 'partner-phone']);
  assert.deepEqual((await rows('login_events')).map((r) => r.device_id).sort(), ['other-phone', 'partner-phone']);
  assert.equal(await isDeviceRevoked(client, 'this-phone'), true);
  assert.equal(await isDeviceRevoked(client, null, 'session-one'), true);
  assert.equal(await isDeviceRevoked(client, 'other-phone', 'session-two'), false);
  assert.equal((await rows('device_revocations')).length, 2);
  assert.deepEqual(Object.keys((await rows('device_revocations'))[0]).sort(), ['expires_at', 'key_hash']);
});

test('a known device belonging to the partner cannot be deleted or revoked', async () => {
  await rememberDevice(client, 'partner', 'partner-phone', 'partner-session', details, true);
  await forgetDevices(client, 'me', 'partner-phone');
  assert.equal((await rows('devices')).length, 1);
  assert.equal((await rows('login_events')).length, 1);
  assert.equal(await isDeviceRevoked(client, 'partner-phone', 'partner-session'), false);
  assert.equal(await rememberDevice(client, 'me', 'partner-phone', 'my-session', details, true), false);
  assert.equal((await rows('devices'))[0].user_id, 'partner');
  assert.equal((await rows('login_events')).length, 1);
});

test('sign out other devices clears their rows, history, and orphan history while preserving this device', async () => {
  await rememberDevice(client, 'me', 'this-phone', 'session-one', details, true);
  await rememberDevice(client, 'me', 'other-phone', 'session-two', details, true);
  await rememberDevice(client, 'partner', 'partner-phone', 'partner-session', details, true);
  await pg.exec("insert into login_events (user_id, device_id, ip) values ('me', 'old-orphan', '192.0.2.3')");
  await forgetDevices(client, 'me', 'this-phone', true);
  assert.deepEqual((await rows('devices')).map((r) => r.device_id).sort(), ['partner-phone', 'this-phone']);
  assert.deepEqual((await rows('login_events')).map((r) => r.device_id).sort(), ['partner-phone', 'this-phone']);
  assert.equal(await isDeviceRevoked(client, 'other-phone', 'session-two'), true);
  assert.equal(await isDeviceRevoked(client, 'this-phone', 'session-one'), false);
});

test('revoked browsers and sessions cannot recreate IP records; a fresh authenticated login can', async () => {
  await rememberDevice(client, 'me', 'old-device', 'old-session', details, true);
  await forgetDevices(client, 'me', 'old-device');
  assert.equal(await rememberDevice(client, 'me', 'old-device', 'old-session', details), false);
  assert.equal(await rememberDevice(client, 'me', 'new-cookie', 'old-session', details, true), false);
  assert.equal((await rows('devices')).length, 0);
  assert.equal((await rows('login_events')).length, 0);
  assert.equal(await rememberDevice(client, 'me', 'new-device', 'new-session', details, true), true);
  assert.equal((await rows('devices')).length, 1);
  assert.equal((await rows('login_events')).length, 1);
});

test('foreground touches preserve sign-in time and do not add login events', async () => {
  await rememberDevice(client, 'me', 'phone', 'session', details, true);
  await pg.exec("update devices set signed_in_at = '2026-01-01T00:00:00Z'");
  await rememberDevice(client, 'me', 'phone', 'session', { ...details, ip: '192.0.2.4' });
  assert.equal(new Date(String((await rows('devices'))[0].signed_in_at)).toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal((await rows('devices'))[0].ip, '192.0.2.4');
  assert.equal((await rows('login_events')).length, 1);
});

test('every foreground sweep physically removes all expired inbox types but preserves records and fresh items', async () => {
  for(const age of ['8 days','6 days']) {
    await pg.query(`insert into session_deletion_requests
      (couple_id,session_id,requested_by,recipient_id,session_version,session_started_at,session_kind,created_at,status)
      values ($1,$2,'me','partner',now(),now(),'intercourse',now()-$3::interval,'declined')`, [coupleId,sessionId,age]);
    await pg.query(`insert into session_edit_requests(couple_id,session_id,requested_by,recipient_id,session_version,proposed,created_at)
      values ($1,$2,'me','partner',now(),'{}',now()-$3::interval) on conflict(session_id) do nothing`,[coupleId,sessionId,age]);
    for(const table of ['session_deletion_outcomes','session_edit_outcomes'])await pg.query(`insert into ${table}
      (id,couple_id,session_id,requested_by,recipient_id,session_started_at,session_kind,status,created_at)
      values (gen_random_uuid(),$1,$2,'me','partner',now(),'intercourse','declined',now()-$3::interval)`,[coupleId,sessionId,age]);
    await pg.query(`insert into session_edit_notices(couple_id,session_id,edited_by,recipient_id,created_at)
      values ($1,$2,'me','partner',now()-$3::interval)`,[coupleId,sessionId,age]);
  }
  await cleanupExpiredData(client);
  for(const table of ['session_deletion_requests','session_deletion_outcomes','session_edit_outcomes','session_edit_notices'])
    assert.equal((await pg.query(`select 1 from ${table}`)).rows.length,1,table);
  assert.equal((await pg.query('select 1 from session_edit_requests')).rows.length,0);
  assert.equal((await rows('sessions')).length,1);
  // A pending request that expires between logins is swept even while the hourly revocation gate is closed.
  await pg.query(`insert into session_edit_requests(couple_id,session_id,requested_by,recipient_id,session_version,proposed,created_at)
    values ($1,$2,'me','partner',now(),'{}',now()-interval '7 days')`,[coupleId,sessionId]);
  await cleanupExpiredData(client);
  assert.equal((await pg.query('select 1 from session_edit_requests')).rows.length,0);
  assert.equal((await pg.query('select 1 from session_edit_outcomes')).rows.length,1); // No new expiry reply that survives the deadline.
});

test('cleanup removes expired anonymous markers and throttles repeated database sweeps', async () => {
  await pg.query("insert into device_revocations (key_hash, expires_at) values ($1, now() - interval '1 day'), ($2, now() + interval '1 day')",
    [revocationHash('device', 'old'), revocationHash('device', 'active')]);
  await cleanupExpiredData(client);
  assert.deepEqual((await rows('device_revocations')).map((r) => r.key_hash), [revocationHash('device', 'active')]);
  await pg.query("insert into device_revocations (key_hash, expires_at) values ($1, now() - interval '1 day')", [revocationHash('device', 'another')]);
  await cleanupExpiredData(client);
  assert.equal((await rows('device_revocations')).length, 2);
  await pg.exec("update app_maintenance set last_run = now() - interval '2 hours'");
  await cleanupExpiredData(client);
  assert.equal((await rows('device_revocations')).length, 1);
});

test('deployment migration scrubs existing signed-out devices and orphan IP history', async () => {
  await rememberDevice(client, 'me', 'revoked-phone', 'old-session', details, true);
  await rememberDevice(client, 'me', 'active-phone', 'active-session', details, true);
  await pg.exec("update devices set revoked_at = now() where device_id = 'revoked-phone'");
  await pg.exec("insert into login_events (user_id, device_id, ip) values ('me', 'missing-phone', '192.0.2.5')");
  await pg.exec(schema);
  assert.deepEqual((await rows('devices')).map((r) => r.device_id), ['active-phone']);
  assert.deepEqual((await rows('login_events')).map((r) => r.device_id), ['active-phone']);
  assert.equal(await isDeviceRevoked(client, 'revoked-phone', 'old-session'), true);
  assert.equal(await isDeviceRevoked(client, 'active-phone', 'active-session'), false);
});

test('deployment migrates unread outcomes, removes handled requests and read notices, and is idempotent', async () => {
  for (const status of ['approved','declined','cancelled','expired']) {
    await pg.query(`insert into session_deletion_requests
      (couple_id,session_id,requested_by,recipient_id,session_version,session_started_at,session_kind,status)
      values ($1,$2,'me','partner',now(),now(),'intercourse',$3)`, [coupleId,sessionId,status]);
  }
  await pg.exec(schema); await pg.exec(schema);
  assert.equal((await rows('session_deletion_requests')).length,0);
  assert.equal((await pg.query('select * from session_deletion_outcomes')).rows.length,3);
});

test('GPS naming gate enforces a shared one-request-per-second limit in Postgres',async()=> {
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;return Response.json({address:{city:'Test city'}})};
  try {
    await getGpsArea(client,{latitude:0,longitude:0});
    await getGpsArea(client,{latitude:1,longitude:1});
    assert.deepEqual(await searchAddresses(client,'12 Example Road','en'),{error:'busy'});
    assert.equal(calls,1);
    await pg.exec("update app_maintenance set last_run=clock_timestamp()-interval '2 seconds' where name='gps-area-lookup'");
    await getGpsArea(client,{latitude:1,longitude:1});assert.equal(calls,2);
  } finally {globalThis.fetch=original}
});
