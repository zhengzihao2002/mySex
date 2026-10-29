import assert from 'node:assert/strict';
import {test} from 'node:test';
import {savedCelebration} from './session-rewards.ts';
import {progression} from './progression.ts';
import type {SexSession} from './types';
const s:SexSession={createdBy:'me',pausedAt:null,ip:null,region:null,country:null,latitude:null,longitude:null,geoSource:null,protection:null,notes:null,updatedAt:'2026-01-02T12:40:00Z',id:'saved',kind:'intercourse',status:'done',scoreVersion:2,startedAt:'2026-01-02T12:00:00Z',endedAt:'2026-01-02T12:40:00Z',durationSec:2400,pausedSec:0,breaks:[],rating:5,tags:['Missionary','Doggy','Seated'],hisOrgasms:1,herOrgasms:1,place:null,city:null};
const day=(iso:string)=>iso.slice(0,10),now=Date.parse('2026-02-01T00:00:00Z');
test('save reward carries exact old/new XP and new quest bonuses with authoritative saved score',()=>{
  const snapshot=savedCelebration([s],s.id,day,now)!;
  assert.equal(snapshot.score.total,100);
  assert.deepEqual(snapshot.reward,{beforeXp:0,afterXp:1055,sessionXp:105,missionXp:950,completedMissions:['thirty','thirty-five','forty']});
  assert.deepEqual(savedCelebration([s,s],s.id,day,now),snapshot);
});
test('already-earned goals do not award again and classic records still count',()=>{
  const past={...s,id:'past',scoreVersion:1 as const,startedAt:'2026-01-01T12:00:00Z',endedAt:null};
  const result=savedCelebration([past,s],s.id,day,now)!;
  assert.equal(result.reward!.beforeXp,progression([past],[],now).xp);
  assert.equal(result.reward!.afterXp,progression([past,s],[],now).xp);
  assert.equal(result.reward!.missionXp,0); // second day does not meet an advanced multi-day goal
  assert.deepEqual(result.reward!.completedMissions,[]);
  assert.equal(savedCelebration([{...s,kind:'oral'}],s.id,day,now)!.reward,undefined);
  assert.equal(savedCelebration([{...s,status:'active'}],s.id,day,now),undefined);
});
