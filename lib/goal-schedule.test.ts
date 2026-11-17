import {test} from 'node:test';
import assert from 'node:assert/strict';
import {goalDays,scheduledGoal} from './goal-schedule.ts';
import {progressForGoals} from './partner-mission-rules.ts';
test('daily minutes become one cumulative seven-day target, with midnight end excluded',()=>{
 const start='2026-11-17T05:00:00Z',end='2026-11-24T05:00:00Z';
 const goal=scheduledGoal({kind:'intercourse',metric:'active_minutes',target:10,perDay:10},start,end,'America/New_York');
 assert.equal(goalDays(start,end,'America/New_York'),7);assert.equal(goal.target,70);assert.equal(goal.days,7);
 const result=progressForGoals({metric:'active_minutes',target:70,startsAt:start,endsAt:end,acceptedAt:start},[goal],[{id:'one-long-session',kind:'intercourse',status:'done',startedAt:start,endedAt:'2026-11-17T07:00:00Z',durationSec:4200,pausedSec:0,tags:[]}],new Date('2026-11-18T00:00:00Z'));
 assert(result.baseComplete,'unevenly distributed minutes still meet cumulative total');
});
test('calendar-day count handles DST and a changed date window',()=>{
 assert.equal(goalDays('2026-10-31T04:00:00Z','2026-11-03T05:00:00Z','America/New_York'),3);
 assert.equal(goalDays('2026-11-17T05:00:00Z','2026-11-18T05:00:00Z','America/New_York'),1);
});

test('individually chosen partial-day targets sum to one cumulative goal; out-of-period dates never add minutes',()=>{
 const goal=scheduledGoal({kind:'intercourse',metric:'active_minutes',target:30,perDay:30,dailyTargets:{'2026-11-17':10,'2026-11-19':5,'2026-12-01':999}},'2026-11-17T20:00:00Z','2026-11-19T15:00:00Z','America/New_York');
 assert.equal(goal.target,45);assert.equal(goal.days,3);assert.deepEqual(goal.dailyTargets,{'2026-11-17':10,'2026-11-18':30,'2026-11-19':5});
});
test('days across month boundaries and daylight saving remain editable without duplication',()=>{
 const goal=scheduledGoal({kind:'oral',metric:'active_minutes',target:10,perDay:10,dailyTargets:{'2026-11-01':0}},'2026-10-31T04:00:00Z','2026-11-03T05:00:00Z','America/New_York');
 assert.equal(goal.target,20);assert.equal(Object.keys(goal.dailyTargets!).length,3);
});
