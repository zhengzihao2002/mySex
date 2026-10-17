// The mySex Score: every finished session is rated 0–100 by the app.
// Computed on the fly (never stored), so tuning the formula re-scores history for free.

export type ScoreInput = {
  id: string;
  startedAt: string;
  durationSec: number | null;
  rating: number | null;
  hisOrgasms: number | null;
  herOrgasms: number | null;
  tags: string[];
  place: string | null;
  city: string | null;
  status?: string;
};

export type ScorePart = { key: string; label: string; points: number; max: number };
export type Score = { total: number; grade: string; emoji: string; parts: ScorePart[] };

const ADVENTURE_TAGS = new Set(['Outdoors', 'Car', 'Shower', 'Roleplay', 'Toys', 'Mirror', 'Blindfold', 'Standing']);

// i18n:begin
export function grade(total: number) {
  if (total >= 90) return { grade: 'Legendary', emoji: '👑' };
  if (total >= 75) return { grade: 'Steamy', emoji: '💦' };
  if (total >= 60) return { grade: 'Hot', emoji: '🔥' };
  if (total >= 40) return { grade: 'Solid', emoji: '😏' };
  return { grade: 'Warm-up', emoji: '🙂' };
}

export function scoreSession(s: ScoreInput, ctx: { newPlace: boolean; roundOfDay: number }): Score {
  const minutes = Math.max(0, (s.durationSec ?? 0) / 60);
  // Duration: 40 pts with diminishing returns — 5 min ≈ 11, 15 min ≈ 25, 30 min ≈ 35, 60 min ≈ 39.
  const duration = 40 * (1 - Math.exp(-minutes / 15));

  const her = s.herOrgasms ?? 0;
  const his = s.hisOrgasms ?? 0;
  const herPts = her > 0 ? Math.min(20, 12 + (her - 1) * 4) : 0;
  const hisPts = his > 0 ? Math.min(8, 6 + (his - 1) * 2) : 0;

  const heat = s.rating ? s.rating * 3 : 0;
  const variety = Math.min(8, s.tags.length * 2);

  let adventure = 0;
  if (ctx.newPlace) adventure += 3;
  if (s.tags.some((t) => ADVENTURE_TAGS.has(t))) adventure += 3;
  if (ctx.roundOfDay >= 2) adventure += 3;

  const parts: ScorePart[] = [
    { key: 'duration', label: 'Stamina', points: duration, max: 40 },
    { key: 'her', label: 'Her pleasure', points: herPts, max: 20 },
    { key: 'his', label: 'His pleasure', points: hisPts, max: 8 },
    { key: 'heat', label: 'Heat rating', points: heat, max: 15 },
    { key: 'variety', label: 'Variety', points: variety, max: 8 },
    { key: 'adventure', label: 'Adventure', points: Math.min(9, adventure), max: 9 },
  ].map((p) => ({ ...p, points: Math.round(p.points) }));
  // i18n:end

  const total = Math.min(100, parts.reduce((a, p) => a + p.points, 0));
  return { total, ...grade(total), parts };
}

/** Scores every finished session, using history for "new place" and "rounds per day" bonuses. */
export function scoreAll(sessions: ScoreInput[], dayOf: (iso: string) => string): Map<string, Score> {
  const done = sessions.filter((s) => s.status !== 'active').sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const seenPlaces = new Set<string>();
  const perDay = new Map<string, number>();
  const out = new Map<string, Score>();
  for (const s of done) {
    const placeKey = (s.place || s.city || '').trim().toLowerCase();
    const newPlace = !!placeKey && seenPlaces.size > 0 && !seenPlaces.has(placeKey);
    if (placeKey) seenPlaces.add(placeKey);
    const day = dayOf(s.startedAt);
    const round = (perDay.get(day) ?? 0) + 1;
    perDay.set(day, round);
    out.set(s.id, scoreSession(s, { newPlace, roundOfDay: round }));
  }
  return out;
}
