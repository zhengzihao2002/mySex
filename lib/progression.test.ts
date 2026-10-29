import assert from 'node:assert/strict';
import {test} from 'node:test';
import {zh} from './i18n/zh.ts';
import {MISSIONS,RANKS,rankThreshold,coupleRank,sessionXp,progression,missionProgress,missionUnlocked,endurancePoints,type MissionRun} from './progression.ts';
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
  assert.equal(sessionXp({...s,scoreVersion:1}).total,0);
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

test('missions require both acceptance, saved evidence after acceptance and matching activity',()=>{
  for(const r of [{...run,acceptedAt:null},{...run,acceptedAt:'2026-01-03T00:00:00Z'},{...run,skippedAt:run.createdAt}])assert.equal(missionProgress(m('time10'),r,[s],now).complete,false);
  for(const entry of [{...s,status:'active' as const},{...s,kind:'oral' as const},{...s,startedAt:'2027-01-01T00:00:00Z'},{...s,endedAt:'2027-01-01T00:00:00Z'}])assert.equal(missionProgress(m('time10'),run,[entry],now).complete,false);
  assert.deepEqual(missionProgress(m('time10'),run,[s],now),{value:10,target:10,complete:true,evidence:['one']});
  assert.equal(missionProgress(m('time30'),run,[{...s,durationSec:600,pausedSec:3600}],now).complete,false);
});

test('new positions compare against history; mood labels and position cards cannot supply proof',()=>{
  const history={...s,id:'past',startedAt:'2025-12-31T00:00:00Z'};
  assert.equal(missionProgress(m('new'),run,[history,s],now).complete,false);
  assert.equal(missionProgress(m('new'),run,[history,{...s,tags:['Morning','Toys']}],now).complete,false);
  assert.equal(missionProgress(m('new'),run,[history,{...s,tags:['Standing']}],now).complete,true);
  assert.equal(missionProgress(m('trio'),run,[{...s,tags:['Missionary','Toys','Morning']}],now).value,1);
  assert.equal(missionProgress(m('collection'),run,[s,{...s,id:'two',tags:['Standing']}],now).complete,true);
});

test('rhythm counts different local days, and favourite returns requires the same position',()=>{
  const a={...s,startedAt:'2026-01-02T01:00:00Z',endedAt:null,tags:['Missionary']};
  const b={...a,id:'two',startedAt:'2026-01-02T23:00:00Z'};
  const c={...a,id:'three',startedAt:'2026-01-03T23:00:00Z'};
  assert.equal(missionProgress(m('days2'),run,[a,b],now).value,1);
  const local={...run,timeZone:'America/New_York'};
  assert.equal(missionProgress(m('days2'),local,[a,b],now).complete,true);
  assert.equal(missionProgress(m('return'),local,[a,b,c],now).complete,true);
  assert.equal(missionProgress(m('return'),local,[a,b,{...c,tags:['Seated']}],now).complete,false);
});

test('one canonical reward, edited/deleted proof reevaluates, later short entries never erase earned XP',()=>{
  const one=progression([s],[run],now);
  assert.equal(one.missionXp,50);assert.equal(one.recordXp,105);
  assert.equal(progression([s,s],[run,run],now).xp,one.xp);
  assert.equal(progression([],[run],now).xp,0);
  assert.equal(progression([{...s,durationSec:60}],[run],now).missionXp,0);
  assert.ok(progression([s,{...s,id:'short',durationSec:60}],[run],now).xp>one.xp);
  assert.equal(progression([s],[],now).missionXp,0);
});

test('rank titles and thresholds stay distinct and increasingly demanding; skipping gives no reward',()=>{
  assert.ok(RANKS.length>=50);
  assert.equal(new Set(RANKS).size,RANKS.length);
  assert.ok(RANKS.every(title=>!!zh[title]));
  assert.equal(new Set(RANKS.map(title=>zh[title])).size,RANKS.length);
  for(let i=1;i<RANKS.length;i++){
    assert.equal(coupleRank(rankThreshold(i)).level,i+1);
    assert.equal(coupleRank(rankThreshold(i)-1).level,i);
    if(i>1)assert.ok(rankThreshold(i)-rankThreshold(i-1)>rankThreshold(i-1)-rankThreshold(i-2));
  }
  assert.equal(coupleRank(1e9).level,RANKS.length);
  assert.equal(missionUnlocked(m('time15'),'intercourse',[],[s],now),false);
  const skip={...run,acceptedAt:null,skippedAt:run.createdAt};
  assert.equal(missionUnlocked(m('time15'),'intercourse',[skip],[],now),true);
  assert.equal(progression([],[skip],now).missionXp,0);
  assert.equal(missionUnlocked(m('time15'),'oral',[skip],[],now),false);
});
