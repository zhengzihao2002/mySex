import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { dismissEditOutcome, requestSessionEdit, respondToSessionEdit, withdrawSessionEdit } from './session-edit-requests.ts';

// Run the production SQL against isolated Postgres/WASM, never the configured Neon database.
const pg = new PGlite();
type Statement = { text: string; values: unknown[] };
const tag = (parts: TemplateStringsArray, ...values: unknown[]): Statement => ({
  text: parts.reduce((s, part, i) => s + (i ? `$${i}` : '') + part, ''), values,
});
const client = Object.assign(async (parts: TemplateStringsArray, ...values: unknown[]) => {
  const q = tag(parts, ...values); return (await pg.query(q.text, q.values)).rows;
}, {
  transaction: async (queries: (tx: typeof tag) => Statement[]) => pg.transaction(async (tx) => {
    const results = []; for (const q of queries(tag)) results.push((await tx.query(q.text, q.values)).rows); return results;
  }),
}) as unknown as NeonQueryFunction<false, false>;

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
  await pg.exec('truncate profiles, couples, sessions, session_edit_requests, session_edit_outcomes cascade');
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

const proposal = { startedAt: '2026-01-01T09:00:00.000Z', durationMin: 20, breakMin: 5, place: 'Hotel', rating: 4, herOrgasms: 2, hisOrgasms: 1, tags: ['Kissing'], notes: 'better' };
const pending = async () => (await pg.query<{ id: string }>('select id from session_edit_requests')).rows;
const row = async () => (await pg.query<any>('select * from sessions where id = $1', [sessionId])).rows[0];

test('an edit changes nothing until the partner agrees', async () => {
  assert.equal(await requestSessionEdit(client, him, sessionId, version, proposal), true);
  assert.equal((await row()).his_orgasms, 3);
  assert.equal((await pending()).length, 1);
});

test('only the recipient can answer; approving applies the edit and notifies the requester', async () => {
  await requestSessionEdit(client, him, sessionId, version, proposal);
  const [{ id }] = await pending();
  assert.equal(await respondToSessionEdit(client, him, id, 'approved'), null); // requester cannot self-approve
  assert.equal((await row()).his_orgasms, 3);
  assert.equal(await respondToSessionEdit(client, her, id, 'approved'), 'approved');
  const s = await row();
  assert.equal(s.his_orgasms, 1); assert.equal(s.her_orgasms, 2); assert.equal(s.place, 'Hotel');
  assert.equal(s.duration_sec, 1200); assert.equal(s.paused_sec, 300); assert.deepEqual(s.tags, ['Kissing']);
  assert.equal((await pending()).length, 0);
  const out = (await pg.query<any>('select * from session_edit_outcomes')).rows;
  assert.equal(out.length, 1); assert.equal(out[0].status, 'approved'); assert.equal(out[0].recipient_id, 'him');
  await dismissEditOutcome(client, coupleId, 'him', out[0].id);
  assert.equal((await pg.query('select 1 from session_edit_outcomes')).rows.length, 0);
});

test('declining keeps the record and tells the requester', async () => {
  await requestSessionEdit(client, him, sessionId, version, proposal);
  const [{ id }] = await pending();
  assert.equal(await respondToSessionEdit(client, her, id, 'declined'), 'declined');
  assert.equal((await row()).his_orgasms, 3);
  assert.equal((await pg.query<any>('select status from session_edit_outcomes')).rows[0].status, 'declined');
});

test('an outdated request is closed without applying', async () => {
  await requestSessionEdit(client, him, sessionId, version, proposal);
  const [{ id }] = await pending();
  await pg.query("update sessions set updated_at = now(), notes = 'changed meanwhile' where id = $1", [sessionId]);
  assert.equal(await respondToSessionEdit(client, her, id, 'approved'), 'expired');
  assert.equal((await row()).notes, 'changed meanwhile');
});

test('stale version is refused; own pending edit is replaced; partner pending edit blocks', async () => {
  assert.equal(await requestSessionEdit(client, him, sessionId, newVersion, proposal), false);
  assert.equal(await requestSessionEdit(client, him, sessionId, version, proposal), true);
  assert.equal(await requestSessionEdit(client, him, sessionId, version, { ...proposal, notes: 'v2' }), true);
  assert.equal((await pending()).length, 1);
  assert.equal((await pg.query<any>('select proposed from session_edit_requests')).rows[0].proposed.notes, 'v2');
  assert.equal(await requestSessionEdit(client, her, sessionId, version, { ...proposal, notes: 'hers' }), false);
});

test('requester can withdraw; other couples cannot touch it', async () => {
  await requestSessionEdit(client, him, sessionId, version, proposal);
  const [{ id }] = await pending();
  assert.equal(await withdrawSessionEdit(client, coupleId, 'her', id), false);
  assert.equal(await respondToSessionEdit(client, { coupleId: otherCouple, userId: 'other-her', partnerId: 'other-him' }, id, 'approved'), null);
  assert.equal(await withdrawSessionEdit(client, coupleId, 'him', id), true);
  assert.equal((await pending()).length, 0);
});
