import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { signBackup, verifyBackup, restoreBackup, type Backup } from './backups.ts';
import { requestSessionDeletion, respondToSessionDeletion, dismissOutcome } from './session-deletions.ts';
import { editSharedSession } from './session-edits.ts';
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

const who = { coupleId, userId:'me', partnerId:'partner', isHer:false };
const secret = 'test-only-secret';
const version = '2026-01-01T10:00:00.000Z';
const session = { id:sessionId, createdBy:'me', kind:'intercourse' as const, status:'done' as const,
  startedAt:version, endedAt:'2026-01-01T10:10:00.000Z', pausedAt:null, pausedSec:0, durationSec:600,
  ip:null, city:null, region:null, country:null, latitude:null, longitude:null, geoSource:null,
  place:'Home', rating:4, protection:null, hisOrgasms:1, herOrgasms:2, tags:[], notes:'A memory', updatedAt:version, breaks:[] };
function backup(): Backup {
  return {format:'mysex-backup-v2',coupleId,ownerId:'me',exportedAt:version,sessions:[session],
    periods:[{id:'30000000-0000-4000-8000-000000000001',start:'2026-01-01',end:'2026-01-05'}],
    checkIns:['me','partner'].map(userId => ({userId,date:'2026-01-01',mood:'loved',energy:3,libido:3,flow:null,symptoms:[],note:null})),
    notes:['me','partner'].map((fromUser,i) => ({id:`40000000-0000-4000-8000-00000000000${i+1}`,fromUser,body:'Hello',kind:'note',createdAt:version,readAt:null,editedAt:null}))};
}
before(async()=> { await pg.exec(await readFile(new URL('../db/schema.sql',import.meta.url),'utf8')); });
after(async()=>pg.close());
beforeEach(async()=> {
  await pg.exec('truncate profiles,couples,sessions,deleted_session_markers cascade');
  await pg.exec("insert into profiles(user_id,name,invite_code,sex) values ('me','Me','ME','male'),('partner','Partner','PARTNER','female')");
  await pg.query("insert into couples(id,male_id,female_id) values ($1,'me','partner')",[coupleId]);
  await pg.query('update profiles set couple_id=$1',[coupleId]);
});
test('signed backup verification rejects tampering, legacy exports, another account and another partnership',()=> {
  const b=backup();const signed={...b,signature:signBackup(b,secret)};
  assert.deepEqual(verifyBackup(JSON.parse(JSON.stringify(signed,null,2)),secret,who),b);
  assert.throws(()=>verifyBackup({...signed,sessions:[]},secret,who),/verification failed/);
  assert.throws(()=>verifyBackup(b,secret,who),/new backup/);
  assert.throws(()=>verifyBackup(signed,secret,{...who,userId:'partner'}),/current partnership/);
  assert.throws(()=>verifyBackup(signed,secret,{...who,coupleId:'10000000-0000-4000-8000-000000000002'}),/current partnership/);
});
test('preview makes no writes; restore skips partner personal data and repeat imports never overwrite',async()=> {
  const b=backup();
  const preview=await restoreBackup(client,b,who,false);
  assert.deepEqual(preview,{sessions:1,periods:0,checkIns:1,notes:1,skipped:3});
  assert.equal((await pg.query('select * from sessions')).rows.length,0);
  assert.deepEqual(await restoreBackup(client,b,who,true),preview);
  await pg.query("update sessions set notes='Newer details' where id=$1",[sessionId]);
  assert.deepEqual(await restoreBackup(client,b,who,true),{sessions:0,periods:0,checkIns:0,notes:0,skipped:6});
  assert.equal((await pg.query<{notes:string}>('select notes from sessions')).rows[0].notes,'Newer details');
  assert.deepEqual((await pg.query<{user_id:string}>('select user_id from daily_logs')).rows.map(r=>r.user_id),['me']);
});
test('mutual deletion cannot be undone by a backup after the outcome is read',async()=> {
  const b=backup(); await restoreBackup(client,b,who,true);
  const v=(await pg.query<{updated_at:Date}>('select updated_at from sessions')).rows[0].updated_at.toISOString();
  assert.equal(await requestSessionDeletion(client,who,sessionId,v),true);
  const id=(await pg.query<{id:string}>('select id from session_deletion_requests')).rows[0].id;
  assert.equal(await respondToSessionDeletion(client,{...who,userId:'partner',partnerId:'me'},id,'approved'),'approved');
  await dismissOutcome(client,coupleId,'me',id);
  assert.equal((await restoreBackup(client,b,who,true)).sessions,0);
  assert.equal((await pg.query('select * from sessions')).rows.length,0);
});
test('active timers are skipped and the female owner can restore her own period data',async()=> {
  const b=backup();b.sessions[0]={...session,status:'active'};
  assert.equal((await restoreBackup(client,b,who,true)).sessions,0);
  const hers={...who,userId:'partner',partnerId:'me',isHer:true};
  assert.equal((await restoreBackup(client,b,hers,true)).periods,1);
  assert.equal((await pg.query<{user_id:string}>('select user_id from periods')).rows[0].user_id,'partner');
});
test('membership is checked again at restore time',async()=> {
  await pg.exec('update profiles set couple_id=null');
  const result=await restoreBackup(client,backup(),who,true);
  assert.equal(result.sessions+result.periods+result.checkIns+result.notes,0);
});
test('successful edit creates one recipient notice atomically; stale or cross-couple edits create none',async()=> {
  await restoreBackup(client,backup(),who,true);
  const v=(await pg.query<{updated_at:Date}>('select updated_at from sessions')).rows[0].updated_at.toISOString();
  const input={startedAt:version,durationMin:12,version:v,notes:'Updated memory'};
  assert.equal(await editSharedSession(client,who,sessionId,input),true);
  const rows=(await pg.query<{recipient_id:string}>('select * from session_edit_notices')).rows;
  assert.equal(rows.length,1);assert.equal(rows[0].recipient_id,'partner');
  assert.equal(await editSharedSession(client,who,sessionId,input),false);
  assert.equal(await editSharedSession(client,{...who,coupleId:'10000000-0000-4000-8000-000000000002'},sessionId,input),false);
  assert.equal((await pg.query('select * from session_edit_notices')).rows.length,1);
});
test('a failure inserting the notice rolls the edit back',async()=> {
  await restoreBackup(client,backup(),who,true);
  const v=(await pg.query<{updated_at:Date}>('select updated_at from sessions')).rows[0].updated_at.toISOString();
  await assert.rejects(editSharedSession(client,{...who,partnerId:'missing'},sessionId,{startedAt:version,durationMin:12,version:v,notes:'Should roll back'}));
  assert.equal((await pg.query<{notes:string}>('select notes from sessions')).rows[0].notes,'A memory');
});

test('backup restore preserves verified GPS area names and their source timestamp',async()=> {
  const b=backup();b.sessions[0]={...b.sessions[0],geoSource:'gps',gpsNamedAt:version,city:'Neighbourhood, Town',region:'State',country:'US'};
  await restoreBackup(client,b,who,true);
  const row=(await pg.query<{city:string;gps_named_at:Date}>('select city,gps_named_at from sessions')).rows[0];
  assert.equal(row.city,'Neighbourhood, Town');assert.equal(row.gps_named_at.toISOString(),version);
});

test('session feelings are independent per owner and reject other couples and active recordings',async()=>{
 const {storeSessionFeeling}=await import('./session-feelings.ts');await restoreBackup(client,backup(),who,true);
 const a={feeling:'Relaxed',rating:4,highlight:'The pace',repeatChoice:'yes' as const};
 assert.equal(await storeSessionFeeling(client,who,sessionId,a),true);
 assert.equal(await storeSessionFeeling(client,{...who,userId:'partner'},sessionId,{...a,feeling:'Playful'}),true);
 assert.equal(await storeSessionFeeling(client,{...who,coupleId:'10000000-0000-4000-8000-000000000002'},sessionId,a),false);
 await storeSessionFeeling(client,who,sessionId,{...a,feeling:'Comfortable'});
 const rows=(await pg.query<{user_id:string;feeling:string}>('select * from session_feelings order by user_id')).rows;
 assert.deepEqual(rows.map(r=>[r.user_id,r.feeling]),[['me','Comfortable'],['partner','Playful']]);
 await pg.exec("update sessions set status='active'");assert.equal(await storeSessionFeeling(client,who,sessionId,a),false);
 await pg.exec('delete from sessions');assert.equal((await pg.query('select * from session_feelings')).rows.length,0);
});
test('backup restore adds only the importing owner feelings and never overwrites partner feelings',async()=>{
 const b=backup();b.sessions[0].feelings=[{userId:'me',feeling:'Mine',rating:4,highlight:'A moment',repeatChoice:null},{userId:'partner',feeling:'Theirs',rating:3,highlight:'',repeatChoice:null}];
 await restoreBackup(client,b,who,true);
 const rows=(await pg.query<{user_id:string}>('select * from session_feelings')).rows;
 assert.deepEqual(rows.map(r=>r.user_id),['me']);
});
