import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreAll,scoreSession} from './score.ts';
const base={id:'a',kind:'intercourse',startedAt:'2026-10-01T20:00:00Z',rating:5,hisOrgasms:1,herOrgasms:1,tags:['Missionary','Doggy','Seated'],place:null,city:null};

test('all old/imported/current records use the same one-hour calculation',()=>{
  for(const scoreVersion of [undefined,1,2,3] as const){
    assert.equal(scoreSession({...base,scoreVersion,durationSec:2400}).total,75);
    assert.equal(scoreSession({...base,scoreVersion,durationSec:3599}).parts[0].points,44);
    assert.equal(scoreSession({...base,scoreVersion,durationSec:3600}).total,100);
  }
});

test('endurance cannot round up to full points early and XP remains a separate curve',()=>{
  const points=(seconds:number)=>scoreSession({...base,durationSec:seconds}).parts[0].points;
  assert.deepEqual([300,600,900,1200,1800,2400,3599,3600,7200].map(points),[0,1,3,5,11,20,44,45,45]);
  assert.equal(points(-1),0);assert.equal(points(NaN),0);assert.equal(points(Infinity),0);
});

test('history averages and best-record inputs contain every generation, without old location/round bonuses',()=>{
  const rows=([1,2,3] as const).map((scoreVersion,i)=>({...base,id:String(i),scoreVersion,durationSec:2400,place:i?'Hotel':'Home'}));
  const scores=scoreAll([...rows,{...base,id:'active',status:'active',durationSec:3600}]);
  assert.equal(scores.size,3);
  assert.deepEqual([...scores.values()].map(s=>s.total),[75,75,75]);
  assert.deepEqual(scoreSession(rows[0],{newPlace:true,roundOfDay:10}),scoreSession(rows[0],{newPlace:false,roundOfDay:1}));
  assert.deepEqual(scoreAll([...rows].reverse()).get('0'),scores.get('0'));
});

test('oral uses the same duration curve while preserving its recipient-based pleasure and zero invented data',()=>{
  const oral={...base,kind:'oral',tags:['Oral (her)','Lying down'],hisOrgasms:null,durationSec:2400};
  assert.equal(scoreSession(oral).parts[0].points,20);
  assert.equal(scoreSession(oral).parts.find(p=>p.key==='pleasure')!.points,20);
  assert.equal(scoreSession({...oral,durationSec:3600}).parts[0].points,45);
  assert.equal(scoreSession({...base,durationSec:null,rating:null,hisOrgasms:null,herOrgasms:null,tags:[]}).total,0);
});
