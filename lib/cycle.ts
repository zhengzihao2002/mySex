// Menstrual cycle model: learns cycle/period length from logged periods, predicts future
// periods, and labels any calendar day with its phase, fertile window and pregnancy odds.
// Pure functions only — shared by server and client.

import { addDays, fromDayNum, toDayNum } from './dates.ts';

export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export type PeriodInput = { start: string; end: string | null };

export type CycleDefaults = { cycleLength: number; periodLength: number };

export type Cycle = {
  start: string;
  length: number;
  periodLength: number;
  /** Day index (0-based, from start) of the predicted ovulation day. */
  ovulationIndex: number;
  predicted: boolean;
  /** Actual period whose end hasn't been logged yet. */
  open: boolean;
};

export type CycleStats = {
  avgCycle: number;
  avgPeriod: number;
  cycleSd: number;
  samples: number;
  cycleLengths: { start: string; length: number }[];
  regularity: 'regular' | 'somewhat irregular' | 'irregular' | 'learning';
  confidence: 'low' | 'medium' | 'high';
  /** ± days to show around predictions. */
  window: number;
};

export type CycleModel = {
  stats: CycleStats;
  cycles: Cycle[];
  today: string;
  nextPeriod: string;
  daysLate: number;
};

export type DayInfo = {
  date: string;
  phase: Phase;
  cycleDay: number;
  cycleLength: number;
  predictedCycle: boolean;
  isPeriod: boolean;
  isPredictedPeriod: boolean;
  isFertile: boolean;
  isOvulation: boolean;
  isPms: boolean;
  pregnancyChance: 'low' | 'medium' | 'high';
};

export const LUTEAL_DAYS = 14;
const MIN_CYCLE = 15;
const MAX_CYCLE = 60;

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function computeStats(periods: PeriodInput[], defaults: CycleDefaults): CycleStats {
  const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start));
  const lengths: { start: string; length: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const len = toDayNum(sorted[i].start) - toDayNum(sorted[i - 1].start);
    if (len >= MIN_CYCLE && len <= MAX_CYCLE) lengths.push({ start: sorted[i - 1].start, length: len });
  }
  const recent = lengths.slice(-6).map((c) => c.length);

  let avgCycle = defaults.cycleLength;
  let sd = 0;
  if (recent.length) {
    // Weighted mean: the most recent cycle counts the most.
    let wSum = 0;
    let total = 0;
    recent.forEach((len, i) => {
      const w = i + 1;
      wSum += w;
      total += len * w;
    });
    avgCycle = total / wSum;
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    sd = Math.sqrt(recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length);
  }

  const periodLens = sorted
    .filter((p) => p.end)
    .map((p) => toDayNum(p.end!) - toDayNum(p.start) + 1)
    .filter((n) => n >= 1 && n <= 15)
    .slice(-6);
  const avgPeriod = periodLens.length
    ? periodLens.reduce((a, b) => a + b, 0) / periodLens.length
    : defaults.periodLength;

  const samples = recent.length;
  // i18n:begin
  const regularity: CycleStats['regularity'] =
    samples < 2 ? 'learning' : sd <= 3 ? 'regular' : sd <= 7 ? 'somewhat irregular' : 'irregular';
  const confidence: CycleStats['confidence'] =
    samples >= 6 && sd <= 3 ? 'high' : samples >= 3 && sd <= 7 ? 'medium' : 'low';
  // i18n:end
  const window = samples < 2 ? 3 : Math.min(7, Math.max(1, Math.round(sd)));

  return {
    avgCycle: round1(avgCycle),
    avgPeriod: round1(avgPeriod),
    cycleSd: round1(sd),
    samples,
    cycleLengths: lengths,
    regularity,
    confidence,
    window,
  };
}

function ovulationIndexFor(length: number, periodLength: number) {
  return Math.max(periodLength + 1, length - LUTEAL_DAYS);
}

export function buildCycleModel(
  periods: PeriodInput[],
  defaults: CycleDefaults,
  today: string,
  futureCycles = 12,
): CycleModel | null {
  if (!periods.length) return null;
  const sorted = [...periods].sort((a, b) => a.start.localeCompare(b.start));
  const stats = computeStats(sorted, defaults);
  const cycleLen = Math.max(MIN_CYCLE, Math.round(stats.avgCycle));
  const periodLen = Math.max(1, Math.min(cycleLen - 2, Math.round(stats.avgPeriod)));
  const todayN = toDayNum(today);

  const cycles: Cycle[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const startN = toDayNum(p.start);
    const next = sorted[i + 1];
    const pLen = p.end ? toDayNum(p.end) - startN + 1 : periodLen;
    let length: number;
    if (next) {
      length = toDayNum(next.start) - startN;
    } else {
      // Current cycle: expected length, stretched if she's late.
      length = Math.max(cycleLen, todayN - startN);
    }
    const effectivePeriod = Math.min(pLen, length);
    cycles.push({
      start: p.start,
      length,
      periodLength: effectivePeriod,
      ovulationIndex: ovulationIndexFor(length, effectivePeriod),
      predicted: false,
      open: !p.end,
    });
  }

  const last = sorted[sorted.length - 1];
  const expectedNext = toDayNum(last.start) + cycleLen;
  const daysLate = Math.max(0, todayN - expectedNext);
  const lastCycle = cycles[cycles.length - 1];
  let nextStartN = toDayNum(lastCycle.start) + lastCycle.length;
  // Only predict forward from today-ish if the last logged period is recent enough to matter.
  if (nextStartN < todayN - cycleLen * 2) nextStartN = todayN + 1;

  for (let k = 0; k < futureCycles; k++) {
    cycles.push({
      start: fromDayNum(nextStartN + k * cycleLen),
      length: cycleLen,
      periodLength: periodLen,
      ovulationIndex: ovulationIndexFor(cycleLen, periodLen),
      predicted: true,
      open: false,
    });
  }

  return { stats, cycles, today, nextPeriod: fromDayNum(nextStartN), daysLate };
}

export function findCycle(model: CycleModel, date: string): Cycle | null {
  const n = toDayNum(date);
  // Cycles are sorted; walk backwards to find the one containing the date.
  for (let i = model.cycles.length - 1; i >= 0; i--) {
    const c = model.cycles[i];
    const s = toDayNum(c.start);
    if (n >= s) return n < s + c.length ? c : null;
  }
  return null;
}

export function dayInfo(model: CycleModel, date: string): DayInfo | null {
  const c = findCycle(model, date);
  if (!c) return null;
  const d = toDayNum(date) - toDayNum(c.start);
  const O = c.ovulationIndex;
  const inPeriod = d < c.periodLength;

  let phase: Phase;
  if (inPeriod) phase = 'menstrual';
  else if (d >= O - 1 && d <= O + 1) phase = 'ovulation';
  else if (d < O - 1) phase = 'follicular';
  else phase = 'luteal';

  const afterToday = toDayNum(date) > toDayNum(model.today);
  const isPeriod = inPeriod && !c.predicted && (!c.open || !afterToday);
  const isPredictedPeriod = inPeriod && !isPeriod;

  const isFertile = d >= O - 5 && d <= O + 1;
  const pregnancyChance: DayInfo['pregnancyChance'] =
    d >= O - 2 && d <= O ? 'high' : isFertile ? 'medium' : 'low';

  return {
    date,
    phase,
    cycleDay: d + 1,
    cycleLength: c.length,
    predictedCycle: c.predicted,
    isPeriod,
    isPredictedPeriod,
    isFertile,
    isOvulation: d === O,
    isPms: phase === 'luteal' && d >= c.length - 5,
    pregnancyChance,
  };
}

export type PhaseSpan = { phase: Phase; start: string; end: string; days: number };

/** Contiguous phase ranges of a cycle, for timelines. */
export function phaseSpans(c: Cycle): PhaseSpan[] {
  const O = c.ovulationIndex;
  const bounds: [Phase, number, number][] = [
    ['menstrual', 0, c.periodLength - 1],
    ['follicular', c.periodLength, O - 2],
    ['ovulation', Math.max(c.periodLength, O - 1), O + 1],
    ['luteal', O + 2, c.length - 1],
  ];
  return bounds
    .filter(([, a, b]) => b >= a)
    .map(([phase, a, b]) => ({ phase, start: addDays(c.start, a), end: addDays(c.start, b), days: b - a + 1 }));
}

export function upcomingCycles(model: CycleModel, count = 6) {
  const todayN = toDayNum(model.today);
  return model.cycles
    .filter((c) => toDayNum(c.start) + c.length > todayN)
    .slice(0, count)
    .map((c) => ({
      cycle: c,
      periodStart: c.start,
      periodEnd: addDays(c.start, c.periodLength - 1),
      ovulation: addDays(c.start, c.ovulationIndex),
      fertileStart: addDays(c.start, c.ovulationIndex - 5),
      fertileEnd: addDays(c.start, c.ovulationIndex + 1),
    }));
}
