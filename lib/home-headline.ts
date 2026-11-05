import { diffDays } from './dates.ts';
import { dayInTz } from './tz.ts';
import type { SexSession } from './types';

type Session = Pick<SexSession, 'kind' | 'status' | 'startedAt'>;
export function homeHeadline(sessions: readonly Session[], today: string, tz: string) {
  if (sessions.some(session => session.status === 'active')) return { state: 'recording', daysSince: null } as const;
  const days = sessions.filter(session => session.kind === 'intercourse' && session.status === 'done' && Number.isFinite(Date.parse(session.startedAt)))
    .map(session => dayInTz(session.startedAt, tz)).filter(day => day <= today);
  const lastDay = days.reduce<string | null>((last, day) => last === null || day > last ? day : last, null);
  if (!lastDay) return { state: 'first', daysSince: null } as const;
  const daysSince = diffDays(today, lastDay);
  const recentDays = new Set(days.filter(day => diffDays(today, day) < 7));
  const state = daysSince >= 14 ? 'longBreak' : daysSince >= 7 ? 'week' : recentDays.size >= 3 ? 'rhythm' : daysSince === 0 ? 'today' : daysSince === 1 ? 'yesterday' : 'recent';
  return { state, daysSince } as const;
}
