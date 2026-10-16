import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCycleModel, computeStats, dayInfo, phaseSpans, upcomingCycles } from './cycle.ts';
import { addDays } from './dates.ts';

const defaults = { cycleLength: 28, periodLength: 5 };

test('learns average cycle and period length', () => {
  const periods = [
    { start: '2026-06-01', end: '2026-06-05' },
    { start: '2026-06-30', end: '2026-07-04' },
    { start: '2026-07-29', end: '2026-08-02' },
  ];
  const s = computeStats(periods, defaults);
  assert.equal(s.avgCycle, 29);
  assert.equal(s.avgPeriod, 5);
  assert.equal(s.samples, 2);
  assert.equal(s.regularity, 'regular');
});

test('ignores implausible gaps (missed logging)', () => {
  const s = computeStats(
    [
      { start: '2026-01-01', end: null },
      { start: '2026-05-01', end: null },
      { start: '2026-05-29', end: null },
    ],
    defaults,
  );
  assert.deepEqual(s.cycleLengths.map((c) => c.length), [28]);
});

test('predicts next periods and labels phases', () => {
  const periods = [{ start: '2026-10-01', end: '2026-10-05' }];
  const m = buildCycleModel(periods, defaults, '2026-10-10')!;
  assert.equal(m.nextPeriod, '2026-10-29');
  assert.equal(m.daysLate, 0);

  assert.equal(dayInfo(m, '2026-10-01')!.phase, 'menstrual');
  assert.equal(dayInfo(m, '2026-10-01')!.isPeriod, true);
  assert.equal(dayInfo(m, '2026-10-06')!.phase, 'follicular');
  // ovulation = day index 14 (28 - 14) -> Oct 15
  const ov = dayInfo(m, '2026-10-15')!;
  assert.equal(ov.isOvulation, true);
  assert.equal(ov.phase, 'ovulation');
  assert.equal(ov.pregnancyChance, 'high');
  assert.equal(dayInfo(m, '2026-10-10')!.isFertile, true);
  assert.equal(dayInfo(m, '2026-10-20')!.phase, 'luteal');
  assert.equal(dayInfo(m, '2026-10-27')!.isPms, true);
  const next = dayInfo(m, '2026-10-29')!;
  assert.equal(next.isPredictedPeriod, true);
  assert.equal(next.cycleDay, 1);
  assert.equal(dayInfo(m, '2026-09-30'), null);
});

test('open period: future days are predicted, past days are actual', () => {
  const m = buildCycleModel([{ start: '2026-10-08', end: null }], defaults, '2026-10-09')!;
  assert.equal(dayInfo(m, '2026-10-09')!.isPeriod, true);
  assert.equal(dayInfo(m, '2026-10-11')!.isPredictedPeriod, true);
});

test('late period shifts prediction to today', () => {
  const m = buildCycleModel([{ start: '2026-09-01', end: '2026-09-05' }], defaults, '2026-10-02')!;
  assert.equal(m.daysLate, 3);
  assert.equal(m.nextPeriod, '2026-10-02');
});

test('phase spans cover the whole cycle', () => {
  const m = buildCycleModel([{ start: '2026-10-01', end: '2026-10-05' }], defaults, '2026-10-02')!;
  const spans = phaseSpans(m.cycles[0]);
  assert.equal(spans.reduce((a, s) => a + s.days, 0), 28);
  assert.deepEqual(spans.map((s) => s.phase), ['menstrual', 'follicular', 'ovulation', 'luteal']);
  const up = upcomingCycles(m, 3);
  assert.equal(up.length, 3);
  assert.equal(up[1].periodStart, addDays('2026-10-01', 28));
});
