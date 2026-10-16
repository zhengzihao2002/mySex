import { scoreAll } from './score';
import { dayInTz } from './tz';
import type { SexSession } from './types';

/** Scores sessions, grouping "rounds per day" by the couple's local calendar day. */
export function scoreSessions(sessions: SexSession[], tz: string) {
  return scoreAll(sessions, (iso) => dayInTz(iso, tz));
}

export function placeSuggestions(sessions: SexSession[]) {
  const counts = new Map<string, number>();
  for (const s of sessions) if (s.place) counts.set(s.place, (counts.get(s.place) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
}
