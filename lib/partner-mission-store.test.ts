import {createItemAsk,listItemAsks,resolveItemAsk} from "./partner-item-asks.ts";
import {listGoalEndRequests, requestGoalEnd, resolveGoalEnd} from './partner-goal-end.ts';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {before,after,beforeEach,test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import type {NeonQueryFunction} from '@neondatabase/serverless';
import {getPartnerMissionBoard,insertPartnerMission,decidePartnerMission,changeStorageItem,type MissionInput} from './partner-mission-store.ts';
const pg=new PGlite();
type Statement={text:string;values:unknown[]};
const tag=(parts:TemplateStringsArray,...values:unknown[]):Statement=>({text:parts.reduce((s,p,i)=>s+(i?`$${i}`:'')+p,''),values});
const client=Object.assign(async(parts:TemplateStringsArray,...values:unknown[])=>{const q=tag(parts,...values);return(await pg.query(q.text,q.values)).rows;},{transaction:async(queries:(tx:typeof tag)=>Statement[])=>pg.transaction(async tx=>{const results=[];for(const q of queries(tag))results.push((await tx.query(q.text,q.values)).rows);return results;})}) as unknown as NeonQueryFunction<false,false>;
const coupleId='10000000-0000-4000-8000-000000000001';
const me={coupleId,userId:'me',partnerId:'partner'},partner={coupleId,userId:'partner',partnerId:'me'},outsider={coupleId,userId:'outsider',partnerId:'me'};
const schema=await readFile(new URL('../db/schema.sql',import.meta.url),'utf8');
const at=(time:string)=>new Date(`2026-01-${time.length>5?time:('01T'+time+':00Z')}`);
const begin=new Date('2026-01-01T00:00:00Z'),end=new Date('2026-01-02T00:00:00Z');
const gift={title:'Secret cinema night',details:'Only the two of us',icon:'ticket' as const},bonus={title:'Secret double prize',details:'Custom bonus terms',icon:'crown' as const},claim={title:'Secret claim',details:'A custom favour',icon:'gift' as const};
const input:MissionInput={title:'Our challenge',description:'A shared goal',metric:'active_minutes',target:10,startsAt:begin.toISOString(),endsAt:end.toISOString(),reward:gift,bonusMultiplier:2,bonusReward:bonus,failureClaim:claim};
before(async()=>{await pg.exec(schema);await pg.exec(schema);});after(()=>pg.close());
beforeEach(async()=>{await pg.exec("truncate profiles,couples,sessions cascade; insert into profiles(user_id,name,invite_code) values('me','Me','ME'),('partner','Partner','PARTNER'),('outsider','Outsider','OUTSIDE')");await pg.query("insert into couples(id,male_id,female_id) values($1,'me','partner')",[coupleId]);await pg.query("update profiles set couple_id=$1 where user_id in ('me','partner')",[coupleId]);});
async function invited(){assert(await insertPartnerMission(client,me,input,begin));return (await getPartnerMissionBoard(client,me,begin)).missions.find(m=>m.status==='invited')!.id;}
async function active(){const id=await invited();assert(await decidePartnerMission(client,partner,id,'accept',at('00:05')));return id;}
async function session(minute=10,kind='intercourse',duration=600){const started=new Date(begin.getTime()+minute*60000),ended=new Date(started.getTime()+duration*1000);return (await pg.query<{id:string}>("insert into sessions(couple_id,created_by,kind,status,started_at,ended_at,duration_sec,paused_sec,tags,created_at,mission_saved_at) values($1,'me',$2,'done',$3,$4,$5,0,array['Missionary'],$3,$4) returning id",[coupleId,kind,started.toISOString(),ended.toISOString(),duration])).rows[0].id;}

test('invites hide terms from recipient, require actual partner acceptance, and exclude pre-acceptance/oral records',async()=>{
 const id=await invited();await session(0);await session(10,'oral');
 const incoming=await getPartnerMissionBoard(client,partner,at('00:25'));
 assert.equal(incoming.missions[0].value,0);assert.equal(incoming.missions[0].reward,null);assert.equal(incoming.missions[0].bonusReward,null);assert.equal(incoming.missions[0].failureClaim,null);assert(!JSON.stringify(incoming).includes('Secret'));
 assert.equal(await decidePartnerMission(client,me,id,'accept',at('00:05')),false);assert.equal(await decidePartnerMission(client,outsider,id,'accept',at('00:05')),false);
 assert(await decidePartnerMission(client,partner,id,'accept',at('00:05')));assert.equal(await decidePartnerMission(client,partner,id,'accept',at('00:05')),false);
 assert.equal((await getPartnerMissionBoard(client,partner,at('00:25'))).missions[0].value,0);
 await session();const earned=await getPartnerMissionBoard(client,partner,at('00:25'));
 assert.equal(earned.missions[0].value,10);assert.equal(earned.missions[0].reward?.title,gift.title);assert.equal(earned.missions[0].bonusReward,null);assert.equal(earned.items.length,1);
});

test('base and bonus pay once; redeemed rewards disappear and cannot be reused',async()=>{
 await active();await session();await session(30);
 let board=await getPartnerMissionBoard(client,partner,at('00:45'));assert.equal(board.items.length,2);assert(board.missions[0].bonusComplete);assert.equal(board.missions[0].bonusReward?.title,bonus.title);
 await Promise.all([getPartnerMissionBoard(client,partner,at('00:45')),getPartnerMissionBoard(client,me,at('00:45'))]);
 assert.equal((await pg.query('select * from partner_storage_items')).rows.length,2);
 const item=board.items.find(i=>i.kind==='prize')!;
 assert.equal(await changeStorageItem(client,me,item.id,'request',at('00:45')),false);
 assert(await changeStorageItem(client,partner,item.id,'request',at('00:45')));
 assert.equal(await changeStorageItem(client,partner,item.id,'approve',at('00:45')),false);
 assert.equal((await getPartnerMissionBoard(client,me,at('00:45'))).items[0].status,'requested');
 assert(await changeStorageItem(client,me,item.id,'decline',at('00:45')));
 assert(await changeStorageItem(client,partner,item.id,'request',at('00:45')));assert(await changeStorageItem(client,partner,item.id,'withdraw',at('00:45')));
 assert(await changeStorageItem(client,partner,item.id,'request',at('00:45')));assert(await changeStorageItem(client,me,item.id,'approve',at('00:45')));
 assert.equal(await changeStorageItem(client,me,item.id,'approve',at('00:45')),false);assert.equal(await changeStorageItem(client,partner,item.id,'request',at('00:45')),false);
 board=await getPartnerMissionBoard(client,partner,at('00:45'));assert.equal(board.items.filter(i=>i.status!=='used').length,1);assert.equal(board.items.find(i=>i.status!=='used')!.kind,'bonus');
});

test('record corrections revoke unspent rewards and restore only the same item; settled proof is stable',async()=>{
 await active();const s=await session();let board=await getPartnerMissionBoard(client,partner,at('00:25'));const item=board.items[0].id;
 await changeStorageItem(client,partner,item,'request',at('00:25'));await pg.query('update sessions set duration_sec=60 where id=$1',[s]);
 assert.equal(await changeStorageItem(client,me,item,'approve',at('00:25')),false);assert.equal((await getPartnerMissionBoard(client,partner,at('00:25'))).items.length,0);
 await pg.query('update sessions set duration_sec=600 where id=$1',[s]);board=await getPartnerMissionBoard(client,partner,at('00:25'));assert.equal(board.items[0].id,item);assert.equal(board.items[0].status,'ready');
 board=await getPartnerMissionBoard(client,partner,end);assert.equal(board.missions[0].status,'settled');assert.deepEqual(board.missions[0].sessionIds,[s]);
 await pg.query('delete from sessions where id=$1',[s]);assert.equal((await getPartnerMissionBoard(client,partner,new Date(end.getTime()+60000))).missions[0].value,10);
});

test('failure after deadline creates a reverse claim for creator, visible to partner only upon redemption request',async()=>{
 await active();let board=await getPartnerMissionBoard(client,partner,end);assert.equal(board.items.length,0);assert.equal(board.missions[0].reward,null);assert.equal(board.missions[0].failureClaim,null);
 board=await getPartnerMissionBoard(client,me,end);assert.equal(board.items.length,1);const item=board.items[0];assert.equal(item.kind,'claim');assert.equal(item.ownerId,'me');assert.equal(item.issuerId,'partner');assert.equal(item.title,claim.title);
 await getPartnerMissionBoard(client,me,end);assert.equal((await pg.query('select * from partner_storage_items')).rows.length,1);
 assert(await changeStorageItem(client,me,item.id,'request',end));assert.equal((await getPartnerMissionBoard(client,partner,end)).items[0].title,claim.title);assert(await changeStorageItem(client,partner,item.id,'approve',end));assert.equal((await getPartnerMissionBoard(client,me,end)).items.filter(i=>i.status!=='used').length,0);
});

test('cancellation and declined/expired invites never punish; outsiders and unpaired couples cannot read or mutate',async()=>{
 const id=await active();await session();let board=await getPartnerMissionBoard(client,partner,at('00:25'));assert.equal(board.items.length,1);
 assert.equal(await decidePartnerMission(client,me,id,'cancel',at('00:25')),false);
 assert(await requestGoalEnd(client,me,id,at('00:25')));
 const [request]=await listGoalEndRequests(client,partner,at('00:25'));
 assert.equal(await resolveGoalEnd(client,me,request.id,'approve',at('00:25')),false);
 assert.equal(await requestGoalEnd(client,partner,id,at('00:25')),false);
 assert(await resolveGoalEnd(client,partner,request.id,'decline',at('00:25')));
 assert.equal((await getPartnerMissionBoard(client,partner,at('00:25'))).missions[0].status,'active');
 assert(await requestGoalEnd(client,me,id,at('00:25')));
 assert.equal(await resolveGoalEnd(client,partner,request.id,'approve',at('00:25')),false);
 const [replacement]=await listGoalEndRequests(client,partner,at('00:25'));
 assert(await resolveGoalEnd(client,partner,replacement.id,'approve',at('00:25')));board=await getPartnerMissionBoard(client,me,end);assert.equal(board.missions[0].status,'cancelled');assert.equal(board.items.length,0);assert.equal((await getPartnerMissionBoard(client,partner,end)).items.length,1);
 const pending=await invited();assert(await decidePartnerMission(client,partner,pending,'decline',at('00:25')));
 await invited();await getPartnerMissionBoard(client,me,end);assert.equal((await pg.query("select * from partner_storage_items where kind='claim'")).rows.length,0);
 assert.deepEqual(await getPartnerMissionBoard(client,outsider,end),{missions:[],items:[]});assert.equal(await insertPartnerMission(client,outsider,input,begin),false);
 await pg.query('update couples set unpaired_at=now() where id=$1',[coupleId]);assert.deepEqual(await getPartnerMissionBoard(client,me,end),{missions:[],items:[]});assert.equal(await changeStorageItem(client,partner,board.items[0]?.id??'20000000-0000-4000-8000-000000000001','request',end),false);
});

test('backfilled records saved after deadline cannot change first settlement; metadata stamps live completion only once',async()=>{
 await active();const id=await session();await pg.query('update sessions set mission_saved_at=$1 where id=$2',[new Date(end.getTime()+1000).toISOString(),id]);
 const board=await getPartnerMissionBoard(client,partner,end);assert.equal(board.missions[0].value,0);assert.equal(board.missions[0].status,'settled');assert.equal(board.items.length,0);
 const live=(await pg.query<{id:string;mission_saved_at:string|null}>("insert into sessions(couple_id,created_by,status,started_at,mission_saved_at) values($1,'me','active',now(),$2) returning id,mission_saved_at",[coupleId,begin.toISOString()])).rows[0];assert.equal(live.mission_saved_at,null);
 await pg.query("update sessions set status='done',ended_at=now(),duration_sec=60 where id=$1",[live.id]);
 const stamped=(await pg.query<{mission_saved_at:Date}>("select mission_saved_at from sessions where id=$1",[live.id])).rows[0].mission_saved_at;assert(stamped);
 await pg.query("update sessions set status='done',duration_sec=120 where id=$1",[live.id]);
 assert.equal(String((await pg.query<{mission_saved_at:Date}>("select mission_saved_at from sessions where id=$1",[live.id])).rows[0].mission_saved_at),String(stamped));
});

test('unchanged polls do not rewrite missions; cancellation never revokes already-used items or creates a failure claim',async()=>{
 const id=await active();await session();let board=await getPartnerMissionBoard(client,partner,at('00:25'));const item=board.items[0].id;
 const before=(await pg.query<{revision:number}>("select revision from partner_missions where id=$1",[id])).rows[0].revision;
 await getPartnerMissionBoard(client,partner,at('00:26'));assert.equal((await pg.query<{revision:number}>("select revision from partner_missions where id=$1",[id])).rows[0].revision,before);
 assert(await changeStorageItem(client,partner,item,'request',at('00:26')));assert(await changeStorageItem(client,me,item,'approve',at('00:26')));assert(await requestGoalEnd(client,partner,id,at('00:27'))); const [request]=await listGoalEndRequests(client,me,at('00:27')); assert(await resolveGoalEnd(client,me,request.id,'approve',at('00:27')));
 board=await getPartnerMissionBoard(client,partner,end);assert.equal(board.items[0].status,'used');assert.equal(board.missions[0].status,'cancelled');assert.equal((await pg.query("select * from partner_storage_items where kind='claim'")).rows.length,0);
});

test('seven-day invitation and redemption-request expiry never expires earned Storage items',async()=>{
 const longInput={...input,endsAt:'2026-01-20T00:00:00Z'};
 assert(await insertPartnerMission(client,me,longInput,begin));
 const invite=(await getPartnerMissionBoard(client,partner,begin)).missions[0].id;
 const eightDays=new Date('2026-01-09T00:00:00Z');
 assert.equal(await decidePartnerMission(client,partner,invite,'accept',eightDays),false);
 assert.equal((await getPartnerMissionBoard(client,partner,eightDays)).missions[0].status,'cancelled');
 assert.equal((await pg.query("select * from partner_storage_items where kind='claim'")).rows.length,0);
 assert(await insertPartnerMission(client,me,longInput,begin));
 const accepted=(await getPartnerMissionBoard(client,partner,begin)).missions.find(m=>m.status==='invited')!.id;
 assert(await decidePartnerMission(client,partner,accepted,'accept',at('00:05')));await session();
 const earned=(await getPartnerMissionBoard(client,partner,at('00:25'))).items[0];
 assert(await changeStorageItem(client,partner,earned.id,'request',at('00:25')));
 assert.equal((await getPartnerMissionBoard(client,me,at('00:25'))).items[0].status,'requested');
 assert.equal(await changeStorageItem(client,me,earned.id,'approve',eightDays),false);
 const ready=(await getPartnerMissionBoard(client,partner,eightDays)).items.find(i=>i.id===earned.id)!;
 assert.equal(ready.status,'ready');assert.equal(ready.requestedAt,null);
 assert.equal((await getPartnerMissionBoard(client,me,eightDays)).items.length,0);
 assert(await changeStorageItem(client,partner,earned.id,'request',eightDays));
 assert(await changeStorageItem(client,me,earned.id,'approve',eightDays));
 assert.equal((await getPartnerMissionBoard(client,partner,eightDays)).items.find(i=>i.id===earned.id)!.status,'used');
});

test('AND goals persist separate activity progress and only award after every goal qualifies',async()=>{
 const custom={...input,goals:[{kind:'intercourse' as const,metric:'active_minutes' as const,target:10},{kind:'oral' as const,metric:'sessions' as const,target:1}]};
 assert(await insertPartnerMission(client,me,custom,begin));const id=(await getPartnerMissionBoard(client,me,begin)).missions[0].id;
 assert(await decidePartnerMission(client,partner,id,'accept',at('00:05')));await session();
 let board=await getPartnerMissionBoard(client,partner,at('00:25'));assert.equal(board.items.length,0);assert.equal(board.missions[0].baseComplete,false);assert.deepEqual(board.missions[0].goalProgress?.map(g=>g.value),[10,0]);
 await session(10,'oral');board=await getPartnerMissionBoard(client,partner,at('00:25'));assert.equal(board.items.length,1);assert(board.missions[0].baseComplete);assert.deepEqual(board.missions[0].goalProgress?.map(g=>g.value),[10,1]);
});

test('overlapping goals use each session once and prioritize the shorter goal before the deadline',async()=>{
 const configs=[
  {...input,title:'Earlier but longer',target:60,endsAt:at('04:00').toISOString(),bonusMultiplier:null,bonusReward:null},
  {...input,title:'Shorter',target:30,endsAt:at('05:00').toISOString(),bonusMultiplier:null,bonusReward:null},
 ];
 for(const config of configs) assert(await insertPartnerMission(client,me,config,begin));
 const invited=(await getPartnerMissionBoard(client,partner,begin)).missions;
 for(const mission of invited) assert(await decidePartnerMission(client,partner,mission.id,'accept',at('00:05')));
 const first=await session(10,'intercourse',1800);
 let board=await getPartnerMissionBoard(client,partner,at('00:45'));
 assert.equal(board.missions.find(m=>m.title==='Shorter')?.baseComplete,true);
 assert.equal(board.missions.find(m=>m.title==='Earlier but longer')?.value,0);
 const second=await session(60,'intercourse',3600);
 board=await getPartnerMissionBoard(client,partner,at('02:01'));
 assert.deepEqual(board.missions.find(m=>m.title==='Shorter')?.sessionIds,[first]);
 assert.deepEqual(board.missions.find(m=>m.title==='Earlier but longer')?.sessionIds,[second]);
});

test('several prize units require one separate approval each',async()=>{
 assert(await insertPartnerMission(client,me,{...input,reward:{...gift,quantity:2}},begin));
 const [goal]=(await getPartnerMissionBoard(client,partner,begin)).missions;
 assert(await decidePartnerMission(client,partner,goal.id,'accept',at('00:05')));
 await session();
 const [item]=(await getPartnerMissionBoard(client,partner,at('00:25'))).items;
 assert.equal(item.quantityRemaining,2);
 for (const remaining of [1,0]) {
  assert(await changeStorageItem(client,partner,item.id,'request',at('00:26')));
  assert(await changeStorageItem(client,me,item.id,'approve',at('00:27')));
  assert.equal(await changeStorageItem(client,me,item.id,'approve',at('00:27')),false);
  const [latest]=(await getPartnerMissionBoard(client,partner,at('00:28'))).items;
  assert.equal(latest.quantityRemaining,remaining);
  assert.equal(latest.status,remaining?'ready':'used');
 }
});

test('an approved custom item reaches Storage with partner restrictions even without a goal',async()=>{
 assert(await createItemAsk(client,partner,{...gift,title:'My custom pass'},'A special occasion'));
 const [ask]=await listItemAsks(client,me);
 assert.equal(ask.reason,'A special occasion');
 assert.equal(await resolveItemAsk(client,partner,ask.id,'approved',''),false);
 assert(await resolveItemAsk(client,me,ask.id,'approved','Weekends only'));
 assert.equal(await resolveItemAsk(client,me,ask.id,'approved',''),false);
 assert.deepEqual(await listItemAsks(client,me),[]);
 assert.equal((await listItemAsks(client,partner))[0].decision,'approved');
 const [item]=(await getPartnerMissionBoard(client,partner)).items;
 assert.equal(item.title,'My custom pass');
 assert.equal(item.details,'Weekends only');
 assert.equal(item.kind,'ask');
 assert(await createItemAsk(client,partner,gift,'Another occasion'));
 const [decline]=await listItemAsks(client,me);
 assert(await resolveItemAsk(client,me,decline.id,'declined',''));
 assert.equal((await getPartnerMissionBoard(client,partner)).items.length,1);
});
