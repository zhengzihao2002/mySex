import assert from 'node:assert/strict';
import { test } from 'node:test';
import { achievements } from './achievements.ts';
import type { SexSession, DailyLog, LoveNote } from './types';
const s: SexSession = { id:'one', createdBy:'me',kind:'oral',status:'done',startedAt:'2026-01-01T00:30:00Z',endedAt:null,pausedAt:null,pausedSec:0,durationSec:600,ip:null,city:null,region:null,country:null,latitude:null,longitude:null,geoSource:null,place:null,rating:null,protection:null,hisOrgasms:null,herOrgasms:null,tags:[],notes:null,updatedAt:'2026-01-01T00:30:00Z',breaks:[] };
const badges = (sessions: SexSession[], tz='UTC') => achievements(sessions,new Map(),tz,'2026-02-01');
const unlocked = (sessions: SexSession[], key:string, tz='UTC') => badges(sessions,tz).find(b=>b.key===key)!.unlocked;
test('87 unique badges; empty data unlocks none, and drafts do not count',()=> {
  const empty=badges([]); assert.equal(empty.length,87); assert.equal(new Set(empty.map(b=>b.key)).size,87);
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

test('story combinations must occur in the same finished session',()=> {
  assert.equal(unlocked([{...s,tags:['Massage']},{...s,tags:['Slow & sensual']}],'spa-night'),false);
  assert.equal(unlocked([{...s,tags:['Massage','Slow & sensual']}],'spa-night'),true);
  assert.equal(unlocked([{...s,status:'active',tags:['Massage','Slow & sensual']}],'spa-night'),false);
  assert.equal(unlocked([{...s,tags:['Roleplay'],notes:'  '}],'plot-twist'),false);
});
test('midnight badge uses local dates and ignores unfinished sessions',()=> {
  const crossing={...s,startedAt:'2026-01-01T23:55:00Z',endedAt:'2026-01-02T00:10:00Z'};
  assert.equal(unlocked([crossing],'midnight-chapter'),true);
  assert.equal(unlocked([crossing],'midnight-chapter','America/Los_Angeles'),false);
  assert.equal(unlocked([{...crossing,endedAt:null}],'midnight-chapter'),false);
});
test('homecoming and encore describe chronology, place and tags rather than counts',()=> {
  const a={...s,place:'Home',tags:['Massage'],startedAt:'2026-01-01T10:00:00Z'};
  const b={...s,id:'b',place:'Hotel',startedAt:'2026-01-02T10:00:00Z'};
  const c={...a,id:'c',place:' home ',startedAt:'2026-01-03T10:00:00Z'};
  assert.equal(unlocked([c,a,b],'homecoming'),true);
  assert.equal(unlocked([a,c],'homecoming'),false);
  assert.equal(unlocked([a,c],'encore-scene'),true);
  assert.equal(unlocked([a,{...c,kind:'intercourse'}],'encore-scene'),false);
  assert.equal(unlocked([a,{...c,tags:['Toys']}],'encore-scene'),false);
  assert.equal(unlocked([a,{...c,startedAt:a.startedAt}],'encore-scene'),false);
});
test('paired check-in stories require different authors, actual moods and the same day',()=> {
  const l:DailyLog={userId:'me',date:'2026-01-01',mood:null,energy:null,libido:null,flow:null,symptoms:[],note:null};
  const check=(logs:DailyLog[],key:string)=>achievements([],new Map(),'UTC','2026-01-01',{logs,notes:[]}).find(b=>b.key===key)!.unlocked;
  assert.equal(check([l,{...l,userId:'partner'}],'same-wavelength'),false);
  assert.equal(check([{...l,mood:'happy'},{...l,mood:'happy'}],'same-wavelength'),false);
  assert.equal(check([{...l,mood:'happy'},{...l,userId:'partner',mood:'happy'}],'same-wavelength'),true);
  assert.equal(check([{...l,mood:'happy'},{...l,userId:'partner',mood:'tired'}],'different-pages'),true);
  assert.equal(check([{...l,note:'My day'},{...l,userId:'partner',note:'Your day',date:'2026-01-02'}],'two-perspectives'),false);
  assert.equal(check([{...l,note:'My day'},{...l,userId:'partner',note:'Your day'}],'two-perspectives'),true);
});
test('love note stories use the note kind, authors and time window',()=> {
  const n:LoveNote={id:'n',fromUser:'me',body:'A memory',kind:'note',createdAt:'2026-01-01T23:45:00Z',readAt:null,editedAt:null};
  const check=(notes:LoveNote[],key:string,tz='UTC')=>achievements([{...s,endedAt:'2026-01-01T23:30:00Z'}],new Map(),tz,'2026-01-02',{logs:[],notes}).find(b=>b.key===key)!.unlocked;
  assert.equal(check([n],'post-credits'),true);
  assert.equal(check([{...n,createdAt:'2026-01-01T23:29:00Z'}],'post-credits'),false);
  assert.equal(check([{...n,createdAt:'2026-01-02T01:30:01Z'}],'post-credits'),false);
  assert.equal(check([{...n,kind:'tease'}],'post-credits'),false);
  assert.equal(check([n,{...n,id:'b'}],'paper-planes'),false);
  assert.equal(check([n,{...n,id:'b',fromUser:'partner',createdAt:'2026-01-02T00:15:00Z'}],'paper-planes'),false);
  assert.equal(check([n,{...n,id:'b',fromUser:'partner',createdAt:'2026-01-02T00:15:00Z'}],'paper-planes','America/Los_Angeles'),true);
});
