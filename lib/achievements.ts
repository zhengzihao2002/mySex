import type { Score } from './score';
import { longestDailyStreak, weeklyStreak } from './stats';
import { dayInTz, hourInTz } from './tz';
import type { SexSession } from './types';

export type Achievement = { key: string; emoji: string; title: string; desc: string; unlocked: boolean };

export function achievements(sessions: SexSession[], scores: Map<string, Score>, tz: string, today: string): Achievement[] {
  const days = sessions.map((s) => dayInTz(s.startedAt, tz));
  const perDay = new Map<string, number>();
  days.forEach((d) => perDay.set(d, (perDay.get(d) ?? 0) + 1));
  const hours = sessions.map((s) => hourInTz(s.startedAt, tz));
  const cities = new Set(sessions.map((s) => s.city).filter(Boolean));
  const countries = new Set(sessions.map((s) => s.country).filter(Boolean));
  const places = new Set(sessions.map((s) => s.place?.toLowerCase()).filter(Boolean));
  const tags = new Set(sessions.flatMap((s) => s.tags));
  const mins = sessions.map((s) => (s.durationSec ?? 0) / 60);
  const best = Math.max(0, ...[...scores.values()].map((s) => s.total));

  const list: Achievement[] = [];
  const add = (key: string, emoji: string, title: string, desc: string, unlocked: boolean) =>
    list.push({ key, emoji, title, desc, unlocked });

  // i18n:begin
  const inter = sessions.filter((s) => s.kind !== 'oral').length;
  add('first', '💋', 'First time', 'Log your first session', inter >= 1);
  add('ten', '🔟', 'Getting busy', '10 sessions', inter >= 10);
  add('fifty', '🏅', 'Half century', '50 sessions', inter >= 50);
  add('hundred', '💯', 'Century club', '100 sessions', inter >= 100);
  add('marathon', '🏃', 'Marathon', 'A session of 60+ minutes', mins.some((m) => m >= 60));
  add('quickie', '⚡', 'Speed run', 'Done in under 5 minutes', mins.some((m) => m > 0 && m < 5));
  add('double', '✌️', 'Double dip', 'Twice in one day', [...perDay.values()].some((n) => n >= 2));
  add('hattrick', '🎩', 'Hat trick', 'Three times in one day', [...perDay.values()].some((n) => n >= 3));
  add('early', '🌅', 'Early birds', 'Between 5 and 8 am', hours.some((h) => h >= 5 && h < 8));
  add('owl', '🦉', 'Night owls', 'Between midnight and 4 am', hours.some((h) => h < 4));
  add('lunch', '🥪', 'Lunch break', 'Between noon and 2 pm', hours.some((h) => h >= 12 && h < 14));
  add('legend', '👑', 'Legendary', 'Score 90+ on a session', best >= 90);
  add('multi', '💦', 'Multiple', 'She came 2+ times in one session', sessions.some((s) => (s.herOrgasms ?? 0) >= 2));
  add('roam', '🗺️', 'Room to room', '5 different places', places.size >= 5);
  add('cities', '🌍', 'Globetrotters', 'Sessions in 3+ cities', cities.size >= 3);
  add('passport', '✈️', 'Passport stamps', 'Sessions in 2+ countries', countries.size >= 2);
  add('explorer', '🧭', 'Explorers', 'Tried 10+ different things', tags.size >= 10);
  add('weekly', '🔥', 'On fire', '4-week streak', weeklyStreak(days, today) >= 4);
  add('daily', '📆', 'Daily dose', '7 days in a row', longestDailyStreak(days) >= 7);
  add('outdoors', '🌲', 'Fresh air', 'Did it outdoors', tags.has('Outdoors'));
  add('car', '🚗', 'Backseat', 'Did it in a car', tags.has('Car'));
  // i18n:end
  return list;
}
