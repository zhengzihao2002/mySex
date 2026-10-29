// The mySex Score: every finished session is rated 0–100 by the app.
// Versioned: pre-launch records retain the classic formula. New records use v2.
import {endurancePoints,positionTags} from "./progression.ts";

export type ScoreInput = {
  id: string;
  scoreVersion?: 1 | 2;
  feelings?: {rating:number|null}[];
  kind?: string;
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
export type Score = { version?:1|2; total: number; grade: string; emoji: string; parts: ScorePart[]; context?:{newPlace:boolean;roundOfDay:number;adventurousActivity:boolean} };

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
  if(s.scoreVersion===2)return scoreV2(s);
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
  const adventurousActivity=s.tags.some((t) => ADVENTURE_TAGS.has(t));
  if (adventurousActivity) adventure += 3;
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
  return { version:1, total, ...grade(total), parts, context:{...ctx,adventurousActivity} };
}

/** Scores every finished session, using history for "new place" and "rounds per day" bonuses. */
export function scoreAll(sessions: ScoreInput[], dayOf: (iso: string) => string): Map<string, Score> {
  const done = sessions.filter((s) => s.status !== 'active').sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const seenPlaces = new Set<string>();
  const perDay = new Map<string, number>();
  const out = new Map<string, Score>();
  for (const s of done) {
    if(s.scoreVersion===2){out.set(s.id,scoreV2(s));continue;}
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

function scoreV2(s:ScoreInput):Score {
  const ratings=(s.feelings??[]).map(f=>f.rating).filter((n):n is number=>n!=null&&n>=1&&n<=5).slice(0,2);
  const heat=ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:s.rating??0;
  const both=s.tags.includes('Taking turns')||s.tags.includes('69');
  const her=s.kind!=='oral'||both||s.tags.includes('Oral (her)');
  const his=s.kind!=='oral'||both||s.tags.includes('Oral (him)');
  const recipients=Number(her)+Number(his);
  const pleasure=recipients?20/recipients*(Number(her&&(s.herOrgasms??0)>0)+Number(his&&(s.hisOrgasms??0)>0)):0;
  const count=positionTags({kind:s.kind==='oral'?'oral':'intercourse',tags:s.tags}).length;
  const parts:ScorePart[]=[
    {key:'duration',label:/*i18n*/'Active time',points:endurancePoints(s.durationSec??0),max:45},
    {key:'heat',label:/*i18n*/'Heat rating',points:Math.round(4*heat),max:20},
    {key:'pleasure',label:/*i18n*/'Shared pleasure',points:Math.round(pleasure),max:20},
    {key:'variety',label:/*i18n*/'Position variety',points:count>=3?15:count===2?8:count===1?3:0,max:15},
  ];
  const total=parts.reduce((sum,p)=>sum+p.points,0);
  return {version:2,total,...grade(total),parts};
}
