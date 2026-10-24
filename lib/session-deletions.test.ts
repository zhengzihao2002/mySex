import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { requestSessionDeletion, respondToSessionDeletion } from './session-deletions.ts';

// Run the production SQL against isolated Postgres/WASM, never the configured Neon database.
const pg = new PGlite();
type Statement = { text: string; values: unknown[] };
const tag = (parts: TemplateStringsArray, ...values: unknown[]): Statement => ({
  text: parts.reduce((s, part, i) => s + (i ? `$${i}` : '') + part, ''), values,
});
const client = {
  transaction: async (queries: (tx: typeof tag) => Statement[]) => pg.transaction(async (tx) => {
    const results = [];
    for (const q of queries(tag)) results.push((await tx.query(q.text, q.values)).rows);
    return results;
  }),
} as unknown as NeonQueryFunction<false, false>;

const coupleId = '10000000-0000-4000-8000-000000000001';
const otherCouple = '10000000-0000-4000-8000-000000000002';
const sessionId = '20000000-0000-4000-8000-000000000001';
const otherSession = '20000000-0000-4000-8000-000000000002';
const version = '2026-01-01T10:00:00.123Z';
const newVersion = '2026-01-01T11:00:00.123Z';
const him = { coupleId, userId: 'him', partnerId: 'her' };
const her = { coupleId, userId: 'her', partnerId: 'him' };

before(async () => {
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pg.exec(schema);
  await pg.exec(schema); // The same migration is safe to reapply on every deployment.
});
after(async () => pg.close());
beforeEach(async () => {
  await pg.exec('truncate profiles, couples, sessions, session_deletion_requests cascade');
  for (const [user, sex] of [['him', 'male'], ['her', 'female'], ['other-him', 'male'], ['other-her', 'female']]) {
    await pg.query('insert into profiles (user_id, name, sex, invite_code) values ($1, $1, $2, $1)', [user, sex]);
  }
  await pg.query('insert into couples (id, male_id, female_id) values ($1, $2, $3), ($4, $5, $6)',
    [coupleId, 'him', 'her', otherCouple, 'other-him', 'other-her']);
  await pg.query('update profiles set couple_id = case when user_id in ($1, $2) then $3::uuid else $4::uuid end',
    ['him', 'her', coupleId, otherCouple]);
  await pg.query(`insert into sessions (id, couple_id, created_by, started_at, updated_at, his_orgasms)
    values ($1, $2, 'him', $3, '2026-01-01T10:00:00.123456Z', 3), ($4, $5, 'other-him', $3, $3, 1)`,
    [sessionId, coupleId, version, otherSession, otherCouple]);
});

async function requests() {
  return (await pg.query<{ id: string; status: string; requester_read_at: string | null }>(
    'select * from session_deletion_requests order by created_at, id')).rows;
}
async function exists() {
  return (await pg.query('select id from sessions where id = $1', [sessionId])).rows.length === 1;
}
async function request(who = him, activeOnly = false) {
  assert.equal(await requestSessionDeletion(client, who, sessionId, version, activeOnly), true);
  return (await requests()).find((r) => r.status === 'pending')!.id;
}

test('request preserves the record; duplicate/opposing requests never count as agreement', async () => {
  const id = await request();
  await request();
  await request(her);
  assert.equal(await exists(), true);
  assert.deepEqual((await requests()).map((r) => [r.id, r.status]), [[id, 'pending']]);
  assert.equal((await pg.query<{ his_orgasms: number }>('select his_orgasms from sessions where id = $1', [sessionId])).rows[0].his_orgasms, 3);
});

test('decline keeps the record, leaves an unread reply, and cannot later be approved', async () => {
  const id = await request();
  assert.equal(await respondToSessionDeletion(client, her, id, 'declined'), 'declined');
  assert.equal(await exists(), true);
  assert.equal((await requests())[0].requester_read_at, null);
  assert.equal(await respondToSessionDeletion(client, her, id, 'approved'), null);
  assert.equal(await exists(), true);
});

test('only recipient approval deletes, keeps a receipt, and is safe on repeated submissions', async () => {
  const id = await request();
  assert.equal(await respondToSessionDeletion(client, him, id, 'approved'), null);
  assert.equal(await exists(), true);
  assert.equal(await respondToSessionDeletion(client, her, id, 'approved'), 'approved');
  assert.equal(await exists(), false);
  assert.equal((await requests())[0].status, 'approved');
  assert.equal((await requests())[0].requester_read_at, null);
  assert.equal(await respondToSessionDeletion(client, her, id, 'approved'), null);
  assert.equal((await pg.query('select id from sessions where id = $1', [otherSession])).rows.length, 1);
});

test('another couple cannot request or approve deletion, even with known IDs', async () => {
  const id = await request();
  const stranger = { coupleId: otherCouple, userId: 'other-her', partnerId: 'other-him' };
  assert.equal(await requestSessionDeletion(client, stranger, sessionId, version), false);
  assert.equal(await respondToSessionDeletion(client, stranger, id, 'approved'), null);
  assert.equal(await respondToSessionDeletion(client, { ...stranger, coupleId }, id, 'approved'), null);
  assert.equal(await exists(), true);
});

test('stale requester screens cannot give consent to a newer record', async () => {
  await pg.query('update sessions set updated_at = $1 where id = $2', [newVersion, sessionId]);
  assert.equal(await requestSessionDeletion(client, him, sessionId, version), false);
  assert.equal((await requests()).length, 0);
  assert.equal(await exists(), true);
});

test('editing after a request invalidates approval and notifies without deleting', async () => {
  const id = await request();
  await pg.query('update sessions set updated_at = $1, notes = $2 where id = $3', [newVersion, 'Edited later', sessionId]);
  assert.equal(await respondToSessionDeletion(client, her, id, 'approved'), 'expired');
  assert.equal(await exists(), true);
  assert.equal((await requests())[0].requester_read_at, null);
  assert.equal(await requestSessionDeletion(client, him, sessionId, newVersion), true);
  const next = (await requests()).find((r) => r.status === 'pending')!;
  assert.equal(await respondToSessionDeletion(client, her, next.id, 'approved'), 'approved');
  assert.equal(await exists(), false);
});

test('a fresh request retires outdated pending consent without creating duplicates', async () => {
  await request();
  await pg.query('update sessions set updated_at = $1 where id = $2', [newVersion, sessionId]);
  assert.equal(await requestSessionDeletion(client, him, sessionId, newVersion), true);
  assert.deepEqual((await requests()).map((r) => r.status).sort(), ['expired', 'pending']);
  assert.equal(await exists(), true);
});

test('discard also requires mutual agreement and cannot target a finished record', async () => {
  assert.equal(await requestSessionDeletion(client, him, sessionId, version, true), false);
  await pg.query("update sessions set status = 'active' where id = $1", [sessionId]);
  const id = await request(him, true);
  assert.equal(await exists(), true);
  assert.equal(await respondToSessionDeletion(client, her, id, 'approved'), 'approved');
  assert.equal(await exists(), false);
});

test('finishing a live timer invalidates an earlier discard request', async () => {
  await pg.query("update sessions set status = 'active' where id = $1", [sessionId]);
  const id = await request(him, true);
  await pg.query("update sessions set status = 'done', updated_at = $1 where id = $2", [newVersion, sessionId]);
  assert.equal(await respondToSessionDeletion(client, her, id, 'approved'), 'expired');
  assert.equal(await exists(), true);
});

test('unpairing blocks responses from a stale context; reconnecting restores the request', async () => {
  const id = await request();
  await pg.query('update profiles set couple_id = null where couple_id = $1', [coupleId]);
  await pg.query('update couples set unpaired_at = now() where id = $1', [coupleId]);
  assert.equal(await respondToSessionDeletion(client, her, id, 'approved'), null);
  assert.equal(await exists(), true);
  await pg.query('update profiles set couple_id = $1 where user_id in ($2, $3)', [coupleId, 'him', 'her']);
  await pg.query('update couples set unpaired_at = null where id = $1', [coupleId]);
  assert.equal(await respondToSessionDeletion(client, her, id, 'approved'), 'approved');
});

test('a failed deletion rolls back the approval and leaves the request pending', async () => {
  const id = await request();
  await pg.exec(`create function reject_test_deletion() returns trigger language plpgsql as $$
    begin raise exception 'test deletion failure'; end $$;
    create trigger reject_test_deletion before delete on sessions for each row execute function reject_test_deletion();`);
  try {
    await assert.rejects(respondToSessionDeletion(client, her, id, 'approved'), /test deletion failure/);
    assert.equal(await exists(), true);
    assert.equal((await requests())[0].status, 'pending');
  } finally {
    await pg.exec('drop trigger reject_test_deletion on sessions; drop function reject_test_deletion()');
  }
});

test('seven-day-old pending requests cannot approve deletion, even before scheduled cleanup', async () => {
  const id = await request();
  await pg.query("update session_deletion_requests set created_at = now() - interval '7 days' where id = $1", [id]);
  assert.equal(await respondToSessionDeletion(client, her, id, 'approved'), null);
  assert.equal(await exists(), true);
  assert.equal(await requestSessionDeletion(client, him, sessionId, version), true);
  const current = await requests();
  assert.equal(current.length, 1);
  assert.notEqual(current[0].id, id);
});
