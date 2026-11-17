import assert from 'node:assert/strict';
import {test} from 'node:test';
import {progressForMission, type MissionRule, type MissionSession} from './partner-mission-rules.ts';

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

test('requires acceptance and excludes sessions started before the later of acceptance and window start', () => {
  assert.deepEqual(progressForMission({...rule, acceptedAt:null}, [session('first')], now), {value:0, sessionIds:[], baseComplete:false, expired:false});
  const records = [session('before', {startedAt:'2026-11-16T08:59:59Z'}), session('at', {startedAt:rule.acceptedAt!})];
  assert.deepEqual(progressForMission(rule, records, now).sessionIds, ['at']);
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
