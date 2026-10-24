import assert from 'node:assert/strict';
import { test } from 'node:test';
import { achievements } from './achievements.ts';
import type { SexSession, DailyLog, LoveNote } from './types';
const s: SexSession = { id:'one', createdBy:'me',kind:'oral',status:'done',startedAt:'2026-01-01T00:30:00Z',endedAt:null,pausedAt:null,pausedSec:0,durationSec:600,ip:null,city:null,region:null,country:null,latitude:null,longitude:null,geoSource:null,place:null,rating:null,protection:null,hisOrgasms:null,herOrgasms:null,tags:[],notes:null,updatedAt:'2026-01-01T00:30:00Z',breaks:[] };
const badges = (sessions: SexSession[], tz='UTC') => achievements(sessions,new Map(),tz,'2026-02-01');
const unlocked = (sessions: SexSession[], key:string, tz='UTC') => badges(sessions,tz).find(b=>b.key===key)!.unlocked;
test('71 unique badges; empty data unlocks none, and drafts do not count',()=> {
  const empty=badges([]); assert.equal(empty.length,71); assert.equal(new Set(empty.map(b=>b.key)).size,71);
  assert.equal(empty.some(b=>b.unlocked),false); assert.equal(badges([{...s,status:'active'}]).some(b=>b.unlocked),false);
});
test('new milestones count either kind while existing intercourse milestone keeps its meaning',()=> {
  assert.equal(unlocked([s],'oral-1'),true);assert.equal(unlocked([s],'first'),false);
  assert.equal(unlocked([s,s],'memories-3'),false);assert.equal(unlocked([s,s,s],'memories-3'),true);
  assert.equal(unlocked([{...s,kind:'intercourse'}],'first'),true);
});
test('reflection, shared authorship and calendar milestones use actual data and local dates',()=> {
  assert.equal(unlocked([{...s,notes:'   '}],'reflection-1'),false);
  assert.equal(unlocked([{...s,notes:'Felt close'}],'reflection-1'),true);
  assert.equal(unlocked([s,{...s,createdBy:'partner'}],'authors-1'),true);
  const dates=[{...s,startedAt:'2025-12-31T23:30:00Z'},s];
  assert.equal(unlocked(dates,'years-2'),true);
  assert.equal(unlocked(dates,'years-2','America/Los_Angeles'),false);
});
test('notes and check-ins unlock independently of having sex',()=> {
  const log: DailyLog={userId:'me',date:'2026-01-01',mood:'tired',energy:1,libido:null,flow:null,symptoms:[],note:null};
  const note: LoveNote={id:'n',fromUser:'me',body:'Thinking of you',kind:'note',createdAt:s.startedAt,readAt:null,editedAt:null};
  const result=achievements([],new Map(),'UTC','2026-01-01',{logs:[log],notes:[note]});
  assert.equal(result.find(b=>b.key==='checkin-1')!.unlocked,true);
  assert.equal(result.find(b=>b.key==='notes-1')!.unlocked,true);
  assert.equal(result.find(b=>b.key==='first')!.unlocked,false);
});
