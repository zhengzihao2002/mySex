import assert from 'node:assert/strict';
import {test} from 'node:test';
import {zh} from './i18n/zh.ts';
import {MISSIONS,RANKS,TOP_RANK_XP,rankThreshold,coupleRank,sessionXp,progression,missionProgress,endurancePoints,type MissionRun} from './progression.ts';
import {scoreSession,scoreAll} from './score.ts';
import type {SexSession} from './types';
const s:SexSession={id:'one',scoreVersion:2,kind:'intercourse',createdBy:'a',status:'done',startedAt:'2026-01-02T12:00:00Z',endedAt:'2026-01-02T12:40:00Z',durationSec:2400,pausedAt:null,pausedSec:0,ip:null,city:null,region:null,country:null,latitude:null,longitude:null,geoSource:null,place:null,rating:5,protection:null,hisOrgasms:1,herOrgasms:1,tags:['Missionary','Doggy','Seated'],notes:null,updatedAt:'2026-01-02T12:40:00Z',breaks:[]};
const run:MissionRun={id:'quest',key:'time10',kind:'intercourse',requestedBy:'a',createdAt:'2026-01-01T12:00:00Z',acceptedAt:'2026-01-01T13:00:00Z',timeZone:'UTC'};
const m=(key:string)=>MISSIONS.find(m=>m.key===key)!;
const ctx={newPlace:true,roundOfDay:2};
const now=Date.parse('2026-02-01T00:00:00Z');

test('harder v2 thresholds, exact caps, more time raises XP without changing classic scores',()=>{
  assert.deepEqual([5,10,15,20,30,40].map(n=>endurancePoints(n*60)),[2,6,11,17,30,45]);
  assert.equal(scoreSession(s,ctx).total,100);
  assert.equal(scoreSession({...s,durationSec:1200},ctx).total,72);
  assert.equal(scoreSession({...s,durationSec:1800},ctx).total,85);
  assert.equal(scoreSession({...s,durationSec:7200},ctx).total,100);
  assert.equal(sessionXp(s).total,105);
  assert.deepEqual(sessionXp({...s,durationSec:7200}),sessionXp(s));
  assert.ok(sessionXp({...s,durationSec:600}).total<sessionXp({...s,durationSec:1800}).total);
  assert.equal(sessionXp({...s,status:'active'}).total,0);
  assert.equal(sessionXp({...s,durationSec:0}).total,0);
  assert.equal(sessionXp({...s,scoreVersion:1}).total,105);
  assert.equal(sessionXp({...s,kind:'oral'}).total,0);
  assert.equal(scoreSession({...s,scoreVersion:1,durationSec:600},ctx).parts.find(p=>p.key==='duration')!.max,40);
  const old={...s,scoreVersion:1 as const,place:'Original'};
  const classic=scoreAll([old],iso=>iso.slice(0,10)).get(old.id);
  const inserted={...s,id:'new-past',startedAt:'2026-01-02T10:00:00Z',place:'New'};
  assert.deepEqual(scoreAll([inserted,old],iso=>iso.slice(0,10)).get(old.id),classic);
});

test('v2 only counts actual distinct positions, averages submitted ratings, and does not farm orgasms',()=>{
  const points=(input:SexSession,key:string)=>scoreSession(input,ctx).parts.find(p=>p.key===key)!.points;
  assert.equal(points({...s,tags:['Missionary','Missionary','Morning','Toys','Massage']},'variety'),3);
  assert.equal(points({...s,tags:['Missionary','Doggy','Morning']},'variety'),8);
  assert.equal(points({...s,tags:['Morning','Toys']},'variety'),0);
  const feeling=(rating:number|null)=>({userId:'a',feeling:'',rating,highlight:'',repeatChoice:null});
  assert.equal(points({...s,feelings:[feeling(1),feeling(4)]},'heat'),10);
  assert.equal(points({...s,feelings:[feeling(3),feeling(null)]},'heat'),12);
  assert.equal(points({...s,hisOrgasms:20,herOrgasms:20},'pleasure'),20);
  assert.equal(points({...s,hisOrgasms:null,herOrgasms:1},'pleasure'),10);
  const oral={...s,kind:'oral' as const,tags:['Oral (her)','Lying down'],hisOrgasms:null};
  assert.equal(points(oral,'pleasure'),20);
  assert.equal(points({...oral,tags:['Taking turns','Seated']},'pleasure'),10);
  assert.equal(points({...oral,tags:['69']},'pleasure'),10);
  assert.equal(points({...oral,tags:['Seated']},'pleasure'),0);
});

const positions=['Missionary','Doggy','Cowgirl','Reverse cowgirl','Spooning','Standing','Side by side','Seated'];
function record(id:string,date:number,minutes:number,tags=positions.slice(0,4)):SexSession{
  const start=Date.UTC(2026,0,date,12);
  return {...s,id,startedAt:new Date(start).toISOString(),endedAt:new Date(start+minutes*60000).toISOString(),durationSec:minutes*60,tags};
}
const combinations=Array.from({length:256},(_,mask)=>positions.filter((_,i)=>mask&(1<<i))).filter(tags=>tags.length===4);

test('ordinary twenty-minute records cannot complete any advanced quest',()=>{
  const history=Array.from({length:20},(_,i)=>record(String(i),i+1,20,positions));
  const game=progression(history,[],now);
  assert.equal(game.quests.length,13);assert.equal(game.missionXp,0);
  assert.equal(game.recordXp,20*55);
  assert.ok(game.quests.every(q=>q.value===0&&!q.complete));
  for(const legacy of [{...run,acceptedAt:null},{...run,skippedAt:run.createdAt},{...run,kind:'oral' as const}])assert.deepEqual(progression(history,[legacy],now),game);
});

test('one-session quests are zero until a single record meets both full duration and position requirements',()=>{
  const quest=m('forty');
  for(const rows of [[record('a',1,20)],[record('a',1,20),record('b',2,20)],[{...s,durationSec:2399,pausedSec:3600}],[record('a',1,40,positions.slice(0,2))]]){
    assert.deepEqual(missionProgress(quest,rows,now),{value:0,target:1,complete:false,evidence:[]});
  }
  assert.deepEqual(missionProgress(quest,[s],now),{value:1,target:1,complete:true,evidence:[s.id]});
  assert.equal(missionProgress(m('choreography'),[record('a',1,30,positions.slice(0,2)),record('b',2,30,positions.slice(2,4))],now).complete,false);
  assert.equal(missionProgress(m('choreography'),[record('a',1,30,positions.slice(0,4))],now).complete,true);
  assert.equal(missionProgress(m('grand-tour'),[record('a',1,40,positions.slice(0,5))],now).complete,false);
  assert.equal(missionProgress(m('grand-tour'),[record('a',1,40,positions.slice(0,6))],now).complete,true);
});

test('unfinished, future and oral sessions cannot qualify; labels are not positions',()=>{
  for(const invalid of [{...s,status:'active' as const},{...s,kind:'oral' as const},{...s,startedAt:'2027-01-01T00:00:00Z'},{...s,endedAt:'2027-01-01T00:00:00Z'}])assert.equal(progression([invalid],[],now).xp,0);
  assert.equal(missionProgress(m('thirty'),[record('a',1,40,['Missionary','Morning','Toys','Massage'])],now).value,0);
  assert.equal(missionProgress(m('thirty'),[record('a',1,40,['Missionary','Missionary','Missionary'])],now).value,0);
});

test('multi-day goals count only fully qualifying sessions on distinct UTC days',()=>{
  const a=record('a',1,40),b={...a,id:'b'},c=record('c',2,40),d=record('d',3,40);
  assert.equal(missionProgress(m('triple-summit'),[a,b],now).value,1);
  assert.equal(missionProgress(m('triple-summit'),[a,c],now).value,2);
  assert.equal(missionProgress(m('triple-summit'),[a,c,d],now).complete,true);
  assert.equal(missionProgress(m('triple-summit'),[a,c,{...d,durationSec:1200}],now).complete,false);
});

test('atlas needs all positions, enough qualifying records and enough days',()=>{
  const one=record('a',1,40,positions);
  const partial=missionProgress(m('atlas'),[one],now);
  assert.equal(partial.complete,false);assert.equal(partial.value,1/12);
  assert.deepEqual(partial.checks?.map(c=>c.value),[8,1,1]);
  const sameDay=Array.from({length:12},(_,i)=>({...one,id:String(i)}));
  assert.equal(missionProgress(m('atlas'),sameDay,now).complete,false);
  const records=Array.from({length:12},(_,i)=>record(String(i),i+1,25,positions));
  const complete=missionProgress(m('atlas'),records,now);
  assert.equal(complete.complete,true);assert.equal(complete.value,1);
  assert.equal(missionProgress(m('atlas'),records.map(s=>({...s,tags:positions.slice(0,7)})),now).complete,false);
});

test('combination quests require distinct sets and days, not reordered copies',()=>{
  const copies=Array.from({length:12},(_,i)=>record(String(i),i+1,30,i%2?combinations[0]:[...combinations[0]].reverse()));
  assert.equal(missionProgress(m('twelve-routes'),copies,now).complete,false);
  assert.equal(missionProgress(m('twelve-routes'),copies,now).checks?.[0].value,1);
  const varied=Array.from({length:12},(_,i)=>record(String(i),i+1,30,combinations[i]));
  assert.equal(missionProgress(m('twelve-routes'),varied,now).complete,true);
  assert.equal(missionProgress(m('twelve-routes'),varied.map(s=>({...s,startedAt:varied[0].startedAt,endedAt:varied[0].endedAt})),now).complete,false);
});

test('the finale needs all other goals and a separate qualifying session afterwards',()=>{
  const records=Array.from({length:20},(_,i)=>record(String(i),i+1,40,combinations[i]));
  records.push(record('atlas-finish',21,40,positions));
  const before=progression(records,[],now);
  assert.equal(before.quests.filter(q=>q.complete).length,12);
  assert.equal(before.quests.find(q=>q.mission.finale)!.value,0);
  const final=record('final',22,40,positions.slice(0,5));
  const all=progression([...records,final],[],now);
  assert.equal(all.quests.filter(q=>q.complete).length,13);
  assert.equal(all.missionXp,11000);
  assert.ok(all.quests.find(q=>q.mission.finale)!.evidence.includes(final.id));
  assert.deepEqual(progression([...records,final,final],[run,run],now),all);
  assert.equal(progression(records,[],now).missionXp,8500);
});

test('rank titles and upgrade costs remain unique and increasingly demanding',()=>{
  assert.ok(RANKS.length>=100);assert.equal(new Set(RANKS).size,RANKS.length);
  assert.ok(RANKS.every(title=>!!zh[title]));assert.equal(new Set(RANKS.map(title=>zh[title])).size,RANKS.length);
  for(let i=1;i<RANKS.length;i++){
    assert.equal(coupleRank(rankThreshold(i)).level,i+1);
    assert.equal(coupleRank(rankThreshold(i)-1).level,i);
    assert.equal(rankThreshold(i)-rankThreshold(i-1),150+(i-1)*100);
  }
  assert.equal(TOP_RANK_XP,499950);
  assert.equal(coupleRank(TOP_RANK_XP).level,100);
});

test('existing session XP is independent of the advanced quest requirements and score version',()=>{
  const classic={...s,scoreVersion:1 as const,durationSec:1200};
  const unversioned={...classic,id:'old',scoreVersion:undefined};
  const untimed={...classic,id:'unknown-time',durationSec:null};
  const before=scoreSession(classic,ctx),game=progression([classic,unversioned,untimed,classic],[],now);
  assert.equal(game.recordXp,55+55+25);assert.equal(game.missionXp,0);
  assert.deepEqual(scoreSession(classic,ctx),before);
  assert.equal(progression([{...untimed,kind:'oral'}],[],now).xp,0);
  const large=progression(Array.from({length:4800},(_,i)=>({...s,id:String(i)})),[],now);
  assert.equal(large.rank.level,100);
});
