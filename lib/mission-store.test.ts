import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {before,after,beforeEach,test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import type {NeonQueryFunction} from '@neondatabase/serverless';
import {getMissionRuns,inviteMission,acceptMission,abandonMission} from './mission-store.ts';
import {cleanupExpiredData} from './privacy.ts';
const pg=new PGlite();
type Statement={text:string;values:unknown[]};
const tag=(parts:TemplateStringsArray,...values:unknown[]):Statement=>({text:parts.reduce((s,p,i)=>s+(i?`$${i}`:'')+p,''),values});
const client=Object.assign(async(parts:TemplateStringsArray,...values:unknown[])=>{const q=tag(parts,...values);return(await pg.query(q.text,q.values)).rows;},{transaction:async(queries:(tx:typeof tag)=>Statement[])=>pg.transaction(async tx=>{const results=[];for(const q of queries(tag))results.push((await tx.query(q.text,q.values)).rows);return results;})}) as unknown as NeonQueryFunction<false,false>;
const coupleId='10000000-0000-4000-8000-000000000001';
const me={coupleId,userId:'me',partnerId:'partner'},partner={coupleId,userId:'partner',partnerId:'me'};
const schema=await readFile(new URL('../db/schema.sql',import.meta.url),'utf8');
before(async()=>{await pg.exec(schema);await pg.exec(schema);});
after(()=>pg.close());
beforeEach(async()=>{
 await pg.exec("truncate profiles,couples,sessions,app_maintenance cascade; insert into profiles(user_id,name,invite_code) values('me','Me','ME'),('partner','Partner','PARTNER'),('outsider','Outsider','OUTSIDE')");
 await pg.query("insert into couples(id,male_id,female_id) values($1,'me','partner')",[coupleId]);
 await pg.query("update profiles set couple_id=$1 where user_id in ('me','partner')",[coupleId]);
});

test('two devices cannot duplicate or self-accept a mission; only the actual partner may accept',async()=>{
 const attempts=await Promise.all([inviteMission(client,me,'time10','intercourse','UTC'),inviteMission(client,me,'time10','intercourse','UTC')]);
 assert.equal(attempts.filter(Boolean).length,1);
 const [run]=await getMissionRuns(client,coupleId);assert.equal(run.acceptedAt,null);
 assert.equal(await acceptMission(client,me,run.id),false);
 assert.equal(await acceptMission(client,{...me,userId:'outsider'},run.id),false);
 const accepts=await Promise.all([acceptMission(client,partner,run.id),acceptMission(client,partner,run.id)]);
 assert.equal(accepts.filter(Boolean).length,1);
 assert.ok((await getMissionRuns(client,coupleId))[0].acceptedAt);
});

test('pending invitations expire physically at seven days; accepted and skipped progress survives',async()=>{
 await inviteMission(client,me,'time10','intercourse','UTC');
 await inviteMission(client,me,'days2','intercourse','UTC');
 await inviteMission(client,me,'new','intercourse','UTC',true);
 const runs=await getMissionRuns(client,coupleId);
 const accepted=runs.find(r=>r.key==='days2')!;
 await acceptMission(client,partner,accepted.id);
 await pg.exec("update couple_missions set created_at=now()-interval '8 days'");
 assert.equal(await acceptMission(client,partner,runs.find(r=>r.key==='time10')!.id),false);
 await cleanupExpiredData(client);
 assert.deepEqual((await getMissionRuns(client,coupleId)).map(r=>r.key).sort(),['days2','new']);
 assert.equal((await pg.query<{n:number}>('select count(*)::int as n from couple_missions')).rows[0].n,2);
});

test('either partner may leave; unpaired/outsider actions fail; stale IDs cannot accept replacement invitations',async()=>{
 assert.equal(await inviteMission(client,{...me,userId:'outsider'},'time10','intercourse','UTC'),false);
 await inviteMission(client,me,'time10','intercourse','UTC');const [old]=await getMissionRuns(client,coupleId);
 assert.equal(await abandonMission(client,{...me,userId:'outsider'},old.id),false);
 assert.equal(await abandonMission(client,partner,old.id),true);
 await inviteMission(client,me,'time10','intercourse','UTC');
 assert.equal(await acceptMission(client,partner,old.id),false);
 const [fresh]=await getMissionRuns(client,coupleId);assert.notEqual(fresh.id,old.id);
 await pg.query('update couples set unpaired_at=now() where id=$1',[coupleId]);
 assert.equal(await acceptMission(client,partner,fresh.id),false);
 assert.equal(await inviteMission(client,me,'days2','intercourse','UTC'),false);
 assert.equal(await abandonMission(client,partner,fresh.id),false);
});

test('migration preserves old scores and assigns v2 only to new records, including after reruns',async()=>{
 await pg.exec('alter table sessions drop column score_version');
 await pg.query("insert into sessions(couple_id,created_by,started_at) values($1,'me','2026-01-01')",[coupleId]);
 await pg.exec(schema);
 await pg.query("insert into sessions(couple_id,created_by,started_at) values($1,'me','2026-02-01')",[coupleId]);
 await pg.exec(schema);
 assert.deepEqual((await pg.query<{score_version:number}>('select score_version from sessions order by started_at')).rows.map(r=>r.score_version),[1,2]);
});
