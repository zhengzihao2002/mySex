// The mySex Score: every finished session is rated 0–100 by the app.
// One current formula for every record. Imported version metadata is ignored.
import {endurancePoints,positionTags} from "./progression.ts";

export type ScoreInput = {
  id: string;
  scoreVersion?: 1 | 2 | 3;
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
export type Score = { total: number; grade: string; emoji: string; parts: ScorePart[] };

// i18n:begin
export function grade(total: number) {
  if (total >= 90) return { grade: 'Legendary', emoji: '👑' };
  if (total >= 75) return { grade: 'Steamy', emoji: '💦' };
  if (total >= 60) return { grade: 'Hot', emoji: '🔥' };
  if (total >= 40) return { grade: 'Solid', emoji: '😏' };
  return { grade: 'Warm-up', emoji: '🙂' };
}

/** All records use the same current calculation, regardless of imported metadata. */
export function scoreSession(s:ScoreInput,_ctx?:{newPlace:boolean;roundOfDay:number}):Score {
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
  return {total,...grade(total),parts};
}

/** Scores all completed records with the same formula used by live recording. */
export function scoreAll(sessions:ScoreInput[],_dayOf?:(iso:string)=>string):Map<string,Score>{
  return new Map(sessions.filter(s=>s.status!=='active').map(s=>[s.id,scoreSession(s)]));
}
