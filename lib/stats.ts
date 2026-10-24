import { toDayNum } from './dates.ts';

/** Monday-based week index of a YYYY-MM-DD date. */
export function weekIndex(day: string) {
  return Math.floor((toDayNum(day) + 3) / 7);
}

/** Consecutive weeks (ending this week or last) with at least one session. */
export function weeklyStreak(days: string[], today: string) {
  const weeks = new Set(days.map(weekIndex));
  let w = weekIndex(today);
  if (!weeks.has(w)) w -= 1;
  let streak = 0;
  while (weeks.has(w)) {
    streak++;
    w--;
  }
  return streak;
}

export function longestDailyStreak(days: string[]) {
  const nums = [...new Set(days.map(toDayNum))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < nums.length; i++) {
    run = i > 0 && nums[i] === nums[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}
