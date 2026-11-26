import assert from 'node:assert/strict';
import {test} from 'node:test';
import {allocateGoalSessions, allocateGoalSessionsByAssignee, progressForGoals, progressForMission, type MissionRule, type MissionSession} from './partner-mission-rules.ts';

const now = new Date('2026-11-17T12:00:00Z');
const rule: MissionRule = {metric:'active_minutes', target:30, startsAt:'2026-11-16T00:00:00Z', endsAt:'2026-11-18T00:00:00Z', acceptedAt:'2026-11-16T09:00:00Z'};
function session(id:string, changes:Partial<MissionSession> = {}): MissionSession {
  return {id, kind:'intercourse', status:'done', startedAt:'2026-11-16T10:00:00Z', endedAt:'2026-11-16T10:40:00Z', durationSec:1800, pausedSec:600, tags:['Missionary'], ...changes};
}

test('counts exact active minutes and total minutes separately, without rounding down partial minutes', () => {
  const records = [session('first', {durationSec:1501, pausedSec:299})];
  const active = progressForMission(rule, records, now);
  assert.equal(active.value, 1501 / 60);
  assert.equal(active.baseComplete, false);
  assert.equal(active.expired, false);
  const total = progressForMission({...rule, metric:'total_minutes'}, records, now);
  assert.equal(total.value, 30);
  assert.equal(total.baseComplete, true);
});

test('sums eligible sessions once and returns deterministic chronological proof IDs', () => {
  const first = session('first');
  const second = session('second', {startedAt:'2026-11-17T10:00:00Z', endedAt:'2026-11-17T10:40:00Z'});
  const records = [second, first, first];
  assert.deepEqual(progressForMission(rule, records, now), {value:60, sessionIds:['first','second'], baseComplete:true, expired:false});
  assert.equal(progressForMission({...rule, metric:'sessions', target:3}, records, now).value, 2);
  assert.deepEqual(records.map(s => s.id), ['second','first','first'], 'does not reorder caller data');
});

test('requires acceptance, then counts the whole window including records saved before joining', () => {
  assert.deepEqual(progressForMission({...rule, acceptedAt:null}, [session('first')], now), {value:0, sessionIds:[], baseComplete:false, expired:false});
  const records = [session('before', {startedAt:'2026-11-16T08:59:59Z'}), session('at', {startedAt:rule.acceptedAt!}), session('early', {startedAt:'2026-11-15T23:59:59Z'})];
  assert.deepEqual(progressForMission(rule, records, now).sessionIds, ['before','at']);
  const window = {...rule, startsAt:'2026-11-17T00:00:00Z'};
  assert.equal(progressForMission(window, records, now).value, 0);
});

test('only saved intercourse fully within the window and already ended can contribute', () => {
  const records = [
    session('oral', {kind:'oral'}),
    session('live', {status:'active', endedAt:null}),
    session('future', {startedAt:'2026-11-17T13:00:00Z', endedAt:'2026-11-17T13:40:00Z'}),
    session('crosses-end', {startedAt:'2026-11-17T23:45:00Z', endedAt:'2026-11-18T00:15:00Z'}),
    session('starts-at-end', {startedAt:rule.endsAt, endedAt:rule.endsAt, durationSec:0, pausedSec:0}),
    session('ends-at-end', {startedAt:'2026-11-17T23:20:00Z', endedAt:rule.endsAt}),
  ];
  assert.equal(progressForMission(rule, records, now).value, 0);
  assert.deepEqual(progressForMission(rule, records, new Date(rule.endsAt)), {value:60, sessionIds:['future','ends-at-end'], baseComplete:true, expired:true});
  assert.equal(progressForMission({...rule, acceptedAt:null}, records, new Date(rule.endsAt)).expired, true);
});

test('position goals count unique known intercourse positions, not pace, oral-only activities or unknown labels', () => {
  const records = [session('first', {tags:['Missionary','Missionary','Massage','69','Slow & sensual','unknown']}),
    session('repeat', {tags:['Missionary']}),
    session('new', {startedAt:'2026-11-17T10:00:00Z', endedAt:'2026-11-17T10:40:00Z', tags:['Lotus','Standing','Oral (her)']})];
  assert.deepEqual(progressForMission({...rule, metric:'positions', target:3}, records, now), {value:3, sessionIds:['first','new'], baseComplete:true, expired:false});
});

test('rejects malformed or incomplete saved records without poisoning valid progress', () => {
  const invalid = [
    session('null-duration', {durationSec:null}),
    session('negative-duration', {durationSec:-1}),
    session('nan-duration', {durationSec:NaN}),
    session('infinite-duration', {durationSec:Infinity}),
    session('negative-break', {pausedSec:-1}),
    session('invalid-break', {pausedSec:NaN}),
    session('bad-start', {startedAt:'bad-date'}),
    session('bad-end', {endedAt:'bad-date'}),
    session('no-end', {endedAt:null}),
    session('reversed', {endedAt:'2026-11-16T09:00:00Z'}),
    session(''),
  ];
  assert.deepEqual(progressForMission(rule, [...invalid, session('valid')], now).sessionIds, ['valid']);
});

test('malformed rules and clocks never grant completion', () => {
  for (const invalid of [{target:0}, {target:Infinity}, {startsAt:'invalid'}, {endsAt:rule.startsAt}, {acceptedAt:'invalid'}, {acceptedAt:rule.endsAt}]) {
    const progress = progressForMission({...rule, ...invalid}, [session('first')], now);
    assert.equal(progress.value, 0);
    assert.equal(progress.baseComplete, false);
  }
  assert.deepEqual(progressForMission(rule, [session('first')], new Date(NaN)), {value:0, sessionIds:[], baseComplete:false, expired:false});
});


test('subminute sessions complete an exact minute goal without cumulative rounding error', () => {
  const records = Array.from({length:60}, (_, index) => session(String(index), {durationSec:1, pausedSec:0}));
  const progress = progressForMission({...rule, target:1}, records, now);
  assert.equal(progress.value,1);
  assert.equal(progress.baseComplete,true);
});

test('AND goals require both activities; extra intercourse cannot replace missing oral',()=>{
 const goals=[{kind:'intercourse' as const,metric:'active_minutes' as const,target:30},{kind:'oral' as const,metric:'sessions' as const,target:2}];
 assert.equal(progressForGoals(rule,goals,[session('sex',{durationSec:7200})],now).baseComplete,false);
 const both=[session('sex'),session('oral1',{kind:'oral'}),session('oral2',{kind:'oral'})];
 const done=progressForGoals(rule,goals,both,now);assert(done.baseComplete);assert.deepEqual(done.checks.map(g=>g.value),[30,2]);
 assert.equal(done.value,rule.target);
 assert.equal(progressForGoals(rule,goals,[...both,session('more',{durationSec:1800})],now).value,rule.target,'bonus also requires oral target to double');
});
test('oral position goals count only recorded oral positions',()=>{
 const result=progressForMission({...rule,kind:'oral',metric:'positions',target:2},[session('oral',{kind:'oral',tags:['69','Lying down','Missionary']})],now);
 assert.equal(result.value,2);assert(result.baseComplete);
});


test('either activity shares one target and can complete using only one activity', () => {
  const oral = session('oral', {kind:'oral', durationSec:1200, pausedSec:300});
  const intercourse = session('intercourse', {durationSec:600, pausedSec:300});
  const records = [oral, intercourse, oral, session('invalid-kind', {kind:'unknown'})];
  const either = {...rule, kind:'either' as const};
  assert.deepEqual(progressForMission(either, records, now), {
    value:30, sessionIds:['intercourse','oral'], baseComplete:true, expired:false,
  });
  assert.equal(progressForMission({...either, metric:'total_minutes'}, records, now).value, 40);
  assert.equal(progressForMission({...either, metric:'sessions', target:1}, [oral], now).baseComplete, true);
  assert.equal(progressForMission({...either, metric:'sessions', target:1}, [intercourse], now).baseComplete, true);
});

test('either activity counts each distinct position once using each record’s own position choices', () => {
  const records = [
    session('first', {tags:['Seated','Missionary','69']}),
    session('second', {kind:'oral',tags:['Seated','69','Doggy']}),
    session('third', {kind:'oral',tags:['Seated']}),
  ];
  assert.deepEqual(progressForMission({...rule,kind:'either',metric:'positions',target:3},records,now), {
    value:3, sessionIds:['first','second'], baseComplete:true, expired:false,
  });
});

test('allocation weighs remaining conditions, breaks ties by deadline and defers stretch',()=>{
 const duration={kind:'intercourse' as const,metric:'active_minutes' as const,target:30};
 const oral={kind:'oral' as const,metric:'sessions' as const,target:1};
 const goals=[
  {id:'combined',rule:{...rule,endsAt:'2026-11-17T22:00:00Z'},goals:[duration,oral],bonusMultiplier:null},
  {id:'later',rule,goals:[duration],bonusMultiplier:null},
  {id:'sooner',rule:{...rule,endsAt:'2026-11-17T23:00:00Z'},goals:[duration],bonusMultiplier:2},
 ];
 const results=allocateGoalSessions(goals,[
  {...session('first'),createdAt:'2026-11-16T10:40:00Z'},
  {...session('second'),createdAt:'2026-11-16T11:40:00Z'},
  {...session('oral',{kind:'oral'}),createdAt:'2026-11-16T12:40:00Z'},
  {...session('third'),createdAt:'2026-11-16T13:40:00Z'},
 ],new Set(),now);
 assert.deepEqual(results.get('sooner')?.sessionIds,['first']);
 assert.deepEqual(results.get('later')?.sessionIds,['second']);
 assert.deepEqual(results.get('combined')?.sessionIds,['third','oral']);
 assert.equal(results.get('combined')?.baseComplete,true);
});

test('one record advances goals both partners set for each other, but only one goal per partner',()=>{
 const duration={kind:'intercourse' as const,metric:'active_minutes' as const,target:30};
 const goals=[
  {id:'for-her',assigneeId:'her',rule,goals:[duration],bonusMultiplier:null},
  {id:'for-him',assigneeId:'him',rule,goals:[duration],bonusMultiplier:null},
  {id:'for-him-later',assigneeId:'him',rule:{...rule,endsAt:'2026-11-19T00:00:00Z'},goals:[duration],bonusMultiplier:null},
 ];
 const results=allocateGoalSessionsByAssignee(goals,[{...session('shared'),createdAt:'2026-11-16T10:40:00Z'}],new Map(),now);
 assert.deepEqual(results.get('for-her')?.sessionIds,['shared']);
 assert.deepEqual(results.get('for-him')?.sessionIds,['shared']);
 assert.equal(results.get('for-her')?.baseComplete,true);
 assert.equal(results.get('for-him')?.baseComplete,true);
 assert.deepEqual(results.get('for-him-later')?.sessionIds,[]);
 const reserved=allocateGoalSessionsByAssignee(goals,[{...session('shared'),createdAt:'2026-11-16T10:40:00Z'}],new Map([['him',new Set(['shared'])]]),now);
 assert.deepEqual(reserved.get('for-her')?.sessionIds,['shared'],'proof settled for one partner does not block the other');
 assert.deepEqual(reserved.get('for-him')?.sessionIds,[]);
});
