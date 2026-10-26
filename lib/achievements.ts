import { storyAchievements } from './story-achievements.ts';
import type { Score } from './score';
import { longestDailyStreak, weeklyStreak } from './stats.ts';
import { dayInTz, hourInTz } from './tz.ts';
import type { SexSession, DailyLog, LoveNote } from './types';

export type Achievement = { key: string; emoji: string; title: string; desc: string; unlocked: boolean; collection?: 'stories' };

export function achievements(input: SexSession[], scores: Map<string, Score>, tz: string, today: string, activity: { logs: DailyLog[]; notes: LoveNote[] } = { logs: [], notes: [] }): Achievement[] {
  const sessions = input.filter(s => s.status === 'done');
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
  const written = sessions.filter(s => s.notes?.trim()).length;
  const rated = sessions.filter(s => s.rating != null).length;
  const pauses = sessions.filter(s => s.pausedSec > 0 || s.breaks.length > 0).length;
  const months = new Set(days.map(d => d.slice(0, 7))).size;
  const years = new Set(days.map(d => d.slice(0, 4))).size;
  const oral = sessions.filter(s => s.kind === 'oral').length;
  const authors = new Map<string, number>();
  sessions.forEach(s => authors.set(s.createdBy, (authors.get(s.createdBy) ?? 0) + 1));
  const together = authors.size >= 2 ? Math.min(...authors.values()) : 0;
  // These are collections of memories, with no deadline or required pace.
  // Titles and descriptions below carry individual i18n markers.
  add('memories-3', '📚', /*i18n*/ 'A little collection', /*i18n*/ '3 saved sessions of either kind', sessions.length >= 3);
  add('memories-5', '📚', /*i18n*/ 'Five memories', /*i18n*/ '5 saved sessions of either kind', sessions.length >= 5);
  add('memories-20', '📚', /*i18n*/ 'Twenty chapters', /*i18n*/ '20 saved sessions of either kind', sessions.length >= 20);
  add('memories-25', '📚', /*i18n*/ 'Quarter century', /*i18n*/ '25 saved sessions of either kind', sessions.length >= 25);
  add('memories-75', '📚', /*i18n*/ 'Memory album', /*i18n*/ '75 saved sessions of either kind', sessions.length >= 75);
  add('memories-150', '📚', /*i18n*/ 'Our anthology', /*i18n*/ '150 saved sessions of either kind', sessions.length >= 150);
  add('memories-200', '📚', /*i18n*/ 'Two hundred stories', /*i18n*/ '200 saved sessions of either kind', sessions.length >= 200);
  add('memories-250', '📚', /*i18n*/ 'A growing library', /*i18n*/ '250 saved sessions of either kind', sessions.length >= 250);
  add('memories-500', '📚', /*i18n*/ 'Five hundred memories', /*i18n*/ '500 saved sessions of either kind', sessions.length >= 500);
  add('oral-1', '👅', /*i18n*/ 'Another kind of closeness', /*i18n*/ '1 oral session saved', oral >= 1);
  add('oral-5', '👅', /*i18n*/ 'Sweet collection', /*i18n*/ '5 oral sessions saved', oral >= 5);
  add('oral-10', '👅', /*i18n*/ 'Ten sweet memories', /*i18n*/ '10 oral sessions saved', oral >= 10);
  add('oral-25', '👅', /*i18n*/ 'Sweet anthology', /*i18n*/ '25 oral sessions saved', oral >= 25);
  add('oral-50', '👅', /*i18n*/ 'Sweet archive', /*i18n*/ '50 oral sessions saved', oral >= 50);
  add('reflection-1', '✍️', /*i18n*/ 'Put it into words', /*i18n*/ 'Add personal notes to 1 session', written >= 1);
  add('reflection-5', '✍️', /*i18n*/ 'Small reflections', /*i18n*/ 'Add personal notes to 5 sessions', written >= 5);
  add('reflection-10', '✍️', /*i18n*/ 'Our journal', /*i18n*/ 'Add personal notes to 10 sessions', written >= 10);
  add('reflection-25', '✍️', /*i18n*/ 'Storytellers', /*i18n*/ 'Add personal notes to 25 sessions', written >= 25);
  add('reflection-50', '✍️', /*i18n*/ 'Pages of us', /*i18n*/ 'Add personal notes to 50 sessions', written >= 50);
  add('rated-1', '💭', /*i18n*/ 'How it felt', /*i18n*/ 'Reflect with a rating on 1 session', rated >= 1);
  add('rated-5', '💭', /*i18n*/ 'Looking back', /*i18n*/ 'Reflect with a rating on 5 sessions', rated >= 5);
  add('rated-10', '💭', /*i18n*/ 'Thoughtful ten', /*i18n*/ 'Reflect with a rating on 10 sessions', rated >= 10);
  add('rated-25', '💭', /*i18n*/ 'Our perspective', /*i18n*/ 'Reflect with a rating on 25 sessions', rated >= 25);
  add('place-1', '📍', /*i18n*/ 'A place in our story', /*i18n*/ 'Name 1 place', places.size >= 1);
  add('place-2', '📍', /*i18n*/ 'A change of scene', /*i18n*/ 'Name 2 different places', places.size >= 2);
  add('place-3', '📍', /*i18n*/ 'Our little map', /*i18n*/ 'Name 3 different places', places.size >= 3);
  add('months-3', '🗓️', /*i18n*/ 'Three calendar pages', /*i18n*/ 'Memories in 3 different months, at any pace', months >= 3);
  add('months-6', '🗓️', /*i18n*/ 'Across six months', /*i18n*/ 'Memories in 6 different months, at any pace', months >= 6);
  add('months-12', '🗓️', /*i18n*/ 'Twelve chapters', /*i18n*/ 'Memories in 12 different months, at any pace', months >= 12);
  add('months-24', '🗓️', /*i18n*/ 'Twenty-four chapters', /*i18n*/ 'Memories in 24 different months, at any pace', months >= 24);
  add('years-2', '🌱', /*i18n*/ 'Across the years', /*i18n*/ 'Memories in 2 different calendar years', years >= 2);
  add('years-3', '🌱', /*i18n*/ 'Our continuing story', /*i18n*/ 'Memories in 3 different calendar years', years >= 3);
  add('pause-1', '🍵', /*i18n*/ 'A moment to pause', /*i18n*/ '1 session with a recorded break', pauses >= 1);
  add('pause-5', '🍵', /*i18n*/ 'Room to breathe', /*i18n*/ '5 sessions with a recorded break', pauses >= 5);
  add('pause-10', '🍵', /*i18n*/ 'Our own rhythm', /*i18n*/ '10 sessions with a recorded break', pauses >= 10);
  add('authors-1', '🤝', /*i18n*/ 'Both our voices', /*i18n*/ 'Each partner has saved 1 session', together >= 1);
  add('authors-5', '🤝', /*i18n*/ 'Shared journal', /*i18n*/ 'Each partner has saved 5 sessions', together >= 5);
  add('authors-10', '🤝', /*i18n*/ 'Coauthors', /*i18n*/ 'Each partner has saved 10 sessions', together >= 10);
  add('checkin-1', '🌤️', /*i18n*/ 'Checking in', /*i18n*/ '1 check-in shared, with no streak required', activity.logs.length >= 1);
  add('checkin-5', '🌤️', /*i18n*/ 'Listening to yourself', /*i18n*/ '5 check-ins shared, with no streak required', activity.logs.length >= 5);
  add('checkin-10', '🌤️', /*i18n*/ 'Ten honest moments', /*i18n*/ '10 check-ins shared, with no streak required', activity.logs.length >= 10);
  add('checkin-25', '🌤️', /*i18n*/ 'Getting to know us', /*i18n*/ '25 check-ins shared, with no streak required', activity.logs.length >= 25);
  add('checkin-50', '🌤️', /*i18n*/ 'A habit of reflection', /*i18n*/ '50 check-ins shared, with no streak required', activity.logs.length >= 50);
  add('checkin-100', '🌤️', /*i18n*/ 'A hundred check-ins', /*i18n*/ '100 check-ins shared, with no streak required', activity.logs.length >= 100);
  add('notes-1', '💌', /*i18n*/ 'A note for you', /*i18n*/ '1 note in your shared collection', activity.notes.length >= 1);
  add('notes-5', '💌', /*i18n*/ 'Little messages', /*i18n*/ '5 notes in your shared collection', activity.notes.length >= 5);
  add('notes-10', '💌', /*i18n*/ 'Love letters', /*i18n*/ '10 notes in your shared collection', activity.notes.length >= 10);
  add('notes-25', '💌', /*i18n*/ 'Words between us', /*i18n*/ '25 notes in your shared collection', activity.notes.length >= 25);
  add('notes-50', '💌', /*i18n*/ 'Our letterbox', /*i18n*/ '50 notes in your shared collection', activity.notes.length >= 50);
  add('notes-100', '💌', /*i18n*/ 'A hundred little notes', /*i18n*/ '100 notes in your shared collection', activity.notes.length >= 100);
  // i18n:end
  return [...storyAchievements(sessions, tz, activity), ...list];
}
