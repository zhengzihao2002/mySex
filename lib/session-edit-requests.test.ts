import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { dismissEditOutcome, requestSessionEdit, respondToSessionEdit, withdrawSessionEdit } from './session-edit-requests.ts';
import {submitSessionChanges} from './session-experiences.ts';

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
  assert.equal(s.his_orgasms, 3); assert.equal(s.her_orgasms, null); assert.equal(s.place, 'Hotel');
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

test('a map pin is staged with personal changes and applied only by partner approval', async () => {
  await pg.query("update sessions set latitude=40,longitude=-74,geo_source='gps',city='Old area',ip='192.0.2.1',gps_named_at=$2 where id=$1", [sessionId,version]);
  const location={latitude:0,longitude:0,city:'Selected area',region:null,country:null,gpsNamedAt:version};
  assert.equal(await submitSessionChanges(client,him,sessionId,version,{hisRating:4,herRating:null,hisNotes:'My note',herNotes:'',hisOrgasms:3,herOrgasms:null},{...proposal,location}),true);
  assert.equal((await row()).latitude,40);assert.equal((await row()).city,'Old area');
  const [{id}]=await pending();
  assert.equal(await respondToSessionEdit(client,him,id,'approved'),null);
  assert.equal(await respondToSessionEdit(client,her,id,'approved'),'approved');
  const saved=await row();
  assert.equal(saved.latitude,0);assert.equal(saved.longitude,0);assert.equal(saved.geo_source,'map');
  assert.equal(saved.city,'Selected area');assert.equal(saved.region,null);assert.equal(saved.ip,'192.0.2.1');
  assert.equal(Number(saved.rating),4);assert.equal((await pending()).length,0);
});

test('declining, withdrawing, or expiring a map edit preserves the original pin', async () => {
  await pg.query("update sessions set latitude=40,longitude=-74,geo_source='gps' where id=$1", [sessionId]);
  const location={latitude:51.5,longitude:-0.1,city:null,region:null,country:null,gpsNamedAt:null};
  await requestSessionEdit(client,him,sessionId,version,{...proposal,location});
  let [{id}]=await pending();
  assert.equal(await respondToSessionEdit(client,her,id,'declined'),'declined');
  assert.equal((await row()).latitude,40);
  await requestSessionEdit(client,him,sessionId,version,{...proposal,location});
  [{id}]=await pending();assert.equal(await withdrawSessionEdit(client,coupleId,'him',id),true);
  assert.equal((await row()).longitude,-74);
  await requestSessionEdit(client,him,sessionId,version,{...proposal,location});
  [{id}]=await pending();await pg.query('update sessions set updated_at=$2 where id=$1',[sessionId,newVersion]);
  assert.equal(await respondToSessionEdit(client,her,id,'approved'),'expired');
  assert.equal((await row()).latitude,40);assert.equal((await row()).geo_source,'gps');
});

const personal={hisRating:4,herRating:3,hisNotes:'Mine',herNotes:'Hers',hisOrgasms:1,herOrgasms:2};
test('repeated submissions use one request and retain its original seven-day deadline',async()=>{
  await submitSessionChanges(client,him,sessionId,version,personal,proposal);
  const first=(await pg.query<any>('select * from session_edit_requests')).rows[0];
  await pg.query("update session_edit_requests set created_at=now()-interval '6 days'");
  const created=(await pg.query<any>('select created_at from session_edit_requests')).rows[0].created_at;
  const v=new Date((await row()).updated_at).toISOString();
  await submitSessionChanges(client,him,sessionId,v,personal,{...proposal,place:'Newest'});
  const all=(await pg.query<any>('select * from session_edit_requests')).rows;
  assert.equal(all.length,1);assert.equal(all[0].id,first.id);assert.equal(all[0].proposed.place,'Newest');
  assert.deepEqual(all[0].created_at,created);
  assert.equal((await pg.query('select 1 from session_edit_outcomes')).rows.length,0);
});

test('either partner can save personal entries without invalidating the pending shared change',async()=>{
  await submitSessionChanges(client,him,sessionId,version,personal,proposal);
  const [{id}]=await pending();
  let v=new Date((await row()).updated_at).toISOString();
  assert.equal(await submitSessionChanges(client,him,sessionId,v,{...personal,hisNotes:'Updated'},null),true);
  v=new Date((await row()).updated_at).toISOString();
  assert.equal(await submitSessionChanges(client,her,sessionId,v,{...personal,herNotes:'Partner updated'},null),true);
  assert.equal((await pending()).length,1);
  assert.equal(await respondToSessionEdit(client,her,id,'approved'),'approved');
  assert.equal((await row()).place,'Hotel');
  assert.equal((await pg.query('select 1 from session_edit_outcomes')).rows.length,1);
});

test('restoring all original shared values removes the request while keeping personal changes',async()=>{
  await submitSessionChanges(client,him,sessionId,version,personal,proposal);
  const v=new Date((await row()).updated_at).toISOString();
  assert.equal(await submitSessionChanges(client,him,sessionId,v,{...personal,hisNotes:'Still saved'},null,true),true);
  assert.equal((await pending()).length,0);assert.equal((await row()).place,null);
  assert.equal((await pg.query<any>("select feeling from session_feelings where user_id='him'")).rows[0].feeling,'Still saved');
});

test('a partner counterproposal stays one request and requires the other partner to approve it',async()=>{
  await submitSessionChanges(client,him,sessionId,version,personal,proposal);
  const [{id}]=await pending();const v=new Date((await row()).updated_at).toISOString();
  assert.equal(await submitSessionChanges(client,her,sessionId,v,personal,{...proposal,place:'Counterproposal'}),true);
  assert.equal((await pending()).length,1);assert.equal((await pending())[0].id,id);
  assert.equal(await respondToSessionEdit(client,her,id,'approved'),null);
  assert.equal(await respondToSessionEdit(client,him,id,'approved'),'approved');
  assert.equal((await row()).place,'Counterproposal');
});

test('an expired edit cannot be approved even before a cleanup sweep',async()=>{
  await requestSessionEdit(client,him,sessionId,version,proposal);
  const [{id}]=await pending();await pg.exec("update session_edit_requests set created_at=now()-interval '7 days'");
  assert.equal(await respondToSessionEdit(client,her,id,'approved'),null);
  assert.equal((await row()).place,null);
});

test('a withdrawn or replaced proposal cannot be resurrected by an in-flight save',async()=>{
  await submitSessionChanges(client,him,sessionId,version,personal,proposal);
  const first=(await pg.query<any>('select * from session_edit_requests')).rows[0];
  const v=new Date((await row()).updated_at).toISOString();
  await withdrawSessionEdit(client,coupleId,'him',first.id);
  assert.equal(await submitSessionChanges(client,him,sessionId,v,personal,proposal,true,{id:first.id,proposed:first.proposed}),false);
  assert.equal((await pending()).length,0);
});

test('approval is bound to the proposal reviewed, so a stale inbox cannot approve a newer pin',async()=>{
  await submitSessionChanges(client,him,sessionId,version,personal,proposal);
  const first=(await pg.query<any>('select * from session_edit_requests')).rows[0];
  const v=new Date((await row()).updated_at).toISOString();
  const latest={...proposal,location:{latitude:42,longitude:-76,city:'Latest',region:null,country:'US',gpsNamedAt:null}};
  await submitSessionChanges(client,him,sessionId,v,personal,latest);
  assert.equal(await respondToSessionEdit(client,her,first.id,'approved',JSON.stringify(first.proposed)),null);
  assert.equal((await row()).latitude,null);
  assert.equal(await respondToSessionEdit(client,her,first.id,'approved',JSON.stringify(latest)),'approved');
  assert.equal((await row()).latitude,42);
});
