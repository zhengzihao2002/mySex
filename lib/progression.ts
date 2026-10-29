import {ACTIVITY_GROUPS} from './activity-details.ts';
import type {SexSession, SessionKind} from './types';

export function positionTags(s: Pick<SexSession,'kind'|'tags'>): string[] {
  const allowed=new Set(ACTIVITY_GROUPS[s.kind].find(g=>g.key==='positions')!.tags);
  return [...new Set(s.tags)].filter(tag=>allowed.has(tag));
}
export const endurancePoints=(seconds:number)=>Math.round(45*Math.pow(Math.min(Math.max(0,seconds)/2400,1),1.4));
/** Derived from one canonical record, never an increment on Save. Historical and new completed intercourse records use the same XP rules. */
export function sessionXp(s: Pick<SexSession,'status'|'scoreVersion'|'durationSec'|'kind'>) {
  if(s.kind!=='intercourse'||s.status!=='done'||(s.durationSec!=null&&s.durationSec<=0))return {base:0,endurance:0,total:0};
  const base=25;
  const endurance=Math.round(80*Math.pow(Math.min((s.durationSec??0)/2400,1),1.4));
  return {base,endurance,total:base+endurance};
}
// i18n:begin
export const RANKS=[
  "Spark Starters",
  "Heartfire Companions",
  "Secret Allies",
  "Hidden Spark Duo",
  "Chemistry Seekers",
  "Magnetic Partners",
  "Moonlight Adventurers",
  "Midnight Pathfinders",
  "Flame Keepers",
  "Blazing Promise",
  "Daring Duo",
  "Boldhearted Partners",
  "Rhythm Masters",
  "Harmony Virtuosos",
  "Velvet Trailblazers",
  "Silken Dreamseekers",
  "Ember Cavaliers",
  "Ruby Lancers",
  "Scarlet Champions",
  "Rosefire Victors",
  "Crimson Legends",
  "Garnet Oathbound",
  "Tempest Riders",
  "Stormcrest Companions",
  "Thunderbound Partners",
  "Lightning Vanguards",
  "Eclipse Vanguard",
  "Shadowmoon Ascendants",
  "Aurora Ascendants",
  "Polar Radiance",
  "Twin Phoenixes",
  "Phoenix Heartbound",
  "Supernova Sovereigns",
  "Nova Flame Regents",
  "Solar Crown Bearers",
  "Helios Luminaries",
  "Starfire Conquerors",
  "Meteor Crowned",
  "Moonfall Monarchs",
  "Lunar Apex",
  "Astral Paladins",
  "Astral Crestbearers",
  "Nebula Navigators",
  "Nebula Flamebound",
  "Cometforged Heroes",
  "Cometwing Champions",
  "Galaxy Sentinels",
  "Galactic Luminaries",
  "Celestial Regents",
  "Skyvault Sovereigns",
  "Stardust Alchemists",
  "Cosmic Transmuters",
  "Constellation Weavers",
  "Zodiac Dreamkeepers",
  "Orbit Breakers",
  "Gravity Unbound",
  "Horizon Transcenders",
  "Eventide Transcendents",
  "Infinity Voyagers",
  "Limitless Wayfarers",
  "Dreamrealm Architects",
  "Reverie Realmkeepers",
  "Mythic Oathkeepers",
  "Epic Covenant",
  "Destiny Forgemasters",
  "Fateweaving Paragons",
  "Empyrean Luminaries",
  "Heavenfire Ascendants",
  "Radiant Immortals",
  "Deathless Radiance",
  "Eternal Flamebearers",
  "Timeless Heartflame",
  "Chronicle Sovereigns",
  "Saga Crowned",
  "Era Definers",
  "Epoch Trailmakers",
  "Aeon Ascendants",
  "Aeon Crownkeepers",
  "Worldheart Guardians",
  "Worldsoul Concord",
  "Boundless Paragons",
  "Transcendent Unity",
  "Voidlight Emperors",
  "Voidstar Crowned",
  "Cosmic Lawmakers",
  "Celestial Order Forgers",
  "Reality Shapers",
  "Worldweaving Sovereigns",
  "Origin Flamekeepers",
  "Primal Radiance",
  "Primordial Crown Bearers",
  "Firstlight Architects",
  "Genesis Dreamforgers",
  "Creation Oathbound",
  "Omniverse Overlords",
  "Allrealm Ascendants",
  "Beyond Eternity",
  "Everlasting Apex",
  "The Unwritten Legend",
  "The Boundless Myth",
] as const;
// i18n:end
// Upgrade costs are 150, 250, 350, ... XP; every upgrade costs 100 XP more.
export const rankThreshold=(index:number)=>50*index*index+100*index;
export const TOP_RANK_XP=rankThreshold(RANKS.length-1);
export function coupleRank(xp:number) {
  let index=0;while(index<RANKS.length-1&&xp>=rankThreshold(index+1))index++;
  const floor=rankThreshold(index),ceiling=index<RANKS.length-1?rankThreshold(index+1):null;
  return {level:index+1,title:RANKS[index],floor,ceiling,nextTitle:ceiling?RANKS[index+1]:null,progress:ceiling?Math.min(1,(xp-floor)/(ceiling-floor)):1};
}
export type Mission={key:string;path:'explorer'|'endurance'|'rhythm'|'finale';title:string;description:string;xp:number;target:number;rule:'session'|'days'|'atlas'|'combinations';minMinutes:number;minPositions:number;minDays?:number;minSessions?:number;finale?:boolean};
export const MISSIONS:Mission[]=[
  {key:'choreography',path:'explorer',title:/*i18n*/'Four-part choreography',description:/*i18n*/'In ONE session: at least 30 active minutes and four different positions.',xp:250,target:1,rule:'session',minMinutes:30,minPositions:4},
  {key:'fivefold',path:'explorer',title:/*i18n*/'Fivefold expedition',description:/*i18n*/'In ONE session: at least 35 active minutes and five different positions.',xp:400,target:1,rule:'session',minMinutes:35,minPositions:5},
  {key:'grand-tour',path:'explorer',title:/*i18n*/'The grand tour',description:/*i18n*/'In ONE session: at least 40 active minutes and six different positions.',xp:600,target:1,rule:'session',minMinutes:40,minPositions:6},
  {key:'atlas',path:'explorer',title:/*i18n*/'Master the atlas',description:/*i18n*/'Collect all eight positions across at least 12 sessions on eight different days. Every qualifying session needs 25 active minutes and three positions.',xp:1000,target:1,rule:'atlas',minMinutes:25,minPositions:3,minDays:8,minSessions:12},
  {key:'thirty',path:'endurance',title:/*i18n*/'The endurance trial',description:/*i18n*/'In ONE session: at least 30 active minutes and three different positions.',xp:200,target:1,rule:'session',minMinutes:30,minPositions:3},
  {key:'thirty-five',path:'endurance',title:/*i18n*/'Beyond the plateau',description:/*i18n*/'In ONE session: at least 35 active minutes and three different positions.',xp:300,target:1,rule:'session',minMinutes:35,minPositions:3},
  {key:'forty',path:'endurance',title:/*i18n*/'The forty-minute summit',description:/*i18n*/'In ONE session: at least 40 active minutes and three different positions.',xp:450,target:1,rule:'session',minMinutes:40,minPositions:3},
  {key:'triple-summit',path:'endurance',title:/*i18n*/'Three summits',description:/*i18n*/'On three different days, record a session with 40 active minutes and three positions each time.',xp:700,target:3,rule:'days',minMinutes:40,minPositions:3},
  {key:'five-summits',path:'endurance',title:/*i18n*/'The crown circuit',description:/*i18n*/'On five different days, record a session with 40 active minutes and four positions each time.',xp:1000,target:5,rule:'days',minMinutes:40,minPositions:4},
  {key:'ten-days',path:'rhythm',title:/*i18n*/'Ten-day odyssey',description:/*i18n*/'On ten different days, record a session with 25 active minutes and three positions each time. No deadline.',xp:800,target:10,rule:'days',minMinutes:25,minPositions:3},
  {key:'twenty-days',path:'rhythm',title:/*i18n*/'Twenty-day legend',description:/*i18n*/'On twenty different days, record a session with 30 active minutes and four positions each time. No deadline.',xp:1400,target:20,rule:'days',minMinutes:30,minPositions:4},
  {key:'twelve-routes',path:'rhythm',title:/*i18n*/'Twelve original routes',description:/*i18n*/'Record 12 different position combinations across at least 12 different days. Each session needs 30 active minutes and at least four positions.',xp:1400,target:1,rule:'combinations',minMinutes:30,minPositions:4,minDays:12,minSessions:12},
  {key:'finale',path:'finale',title:/*i18n*/'The ultimate chapter',description:/*i18n*/'Complete all 12 other quests, then qualify with ONE session containing 40 active minutes and five different positions.',xp:2500,target:1,rule:'session',minMinutes:40,minPositions:5,finale:true},
];
export type MissionRun={id:string;key:string;kind:SessionKind;requestedBy:string;createdAt:string;acceptedAt:string|null;skippedAt?:string|null;timeZone:string};
export type MissionCheck={label:string;value:number;target:number};
export type MissionProgress={value:number;target:number;complete:boolean;evidence:string[];checks?:MissionCheck[]};
const timestamp=(s:string)=>new Date(s).getTime();
const day=(iso:string)=>new Date(iso).toISOString().slice(0,10);
/** Only whole records satisfying every session condition can advance these advanced goals. */
export function missionProgress(m:Mission,sessions:SexSession[],now=Date.now()):MissionProgress {
  const eligible=[...new Map(sessions.map(s=>[s.id,s])).values()].filter(s=>s.kind==='intercourse'&&s.status==='done'&&(s.durationSec??0)>=m.minMinutes*60&&positionTags(s).length>=m.minPositions&&timestamp(s.startedAt)<=now&&(!s.endedAt||timestamp(s.endedAt)<=now)).sort((a,b)=>a.startedAt.localeCompare(b.startedAt)||a.id.localeCompare(b.id));
  if(m.rule==='session')return {value:eligible.length?1:0,target:1,complete:eligible.length>0,evidence:eligible.length?[eligible[0].id]:[]};
  const perDay=new Map<string,string>(),positions=new Set<string>(),combinations=new Map<string,string>();
  for(const s of eligible){
    if(!perDay.has(day(s.startedAt)))perDay.set(day(s.startedAt),s.id);
    const tags=positionTags(s);tags.forEach(tag=>positions.add(tag));
    const combo=[...tags].sort().join('|');if(!combinations.has(combo))combinations.set(combo,s.id);
  }
  if(m.rule==='days')return {value:Math.min(perDay.size,m.target),target:m.target,complete:perDay.size>=m.target,evidence:[...perDay.values()].slice(0,m.target)};
  const checks:MissionCheck[]=m.rule==='atlas'?[
    {label:/*i18n*/'Distinct positions',value:Math.min(8,positions.size),target:8},
    {label:/*i18n*/'Qualifying sessions',value:Math.min(m.minSessions!,eligible.length),target:m.minSessions!},
    {label:/*i18n*/'Qualifying days',value:Math.min(m.minDays!,perDay.size),target:m.minDays!},
  ]:[
    {label:/*i18n*/'Distinct combinations',value:Math.min(m.minSessions!,combinations.size),target:m.minSessions!},
    {label:/*i18n*/'Qualifying days',value:Math.min(m.minDays!,perDay.size),target:m.minDays!},
  ];
  const value=Math.min(...checks.map(c=>c.value/c.target));
  const proof=new Set(eligible.slice(0,m.minSessions!).map(s=>s.id));
  [...perDay.values()].slice(0,m.minDays!).forEach(id=>proof.add(id));
  if(m.rule==='atlas'){
    const witnessed=new Set<string>();
    for(const s of eligible){const before=witnessed.size;positionTags(s).forEach(tag=>witnessed.add(tag));if(witnessed.size>before)proof.add(s.id);if(witnessed.size>=8)break;}
  }else [...combinations.values()].slice(0,m.minSessions!).forEach(id=>proof.add(id));
  return {value,target:1,complete:value>=1,evidence:[...proof],checks};
}
// Legacy invitations are ignored: neither acceptance nor a stored skip can alter rewards.
export function progression(sessions:SexSession[],_legacyRuns:MissionRun[]=[],now=Date.now()) {
  const quests=MISSIONS.map(mission=>({...missionProgress(mission,sessions,now),mission}));
  const finale=quests.find(q=>q.mission.finale)!;
  const prerequisites=quests.filter(q=>!q.mission.finale);
  const records=new Map(sessions.map(s=>[s.id,s]));
  const finishedAt=(s:SexSession)=>s.endedAt?timestamp(s.endedAt):timestamp(s.startedAt)+((s.durationSec??0)+s.pausedSec)*1000;
  const allPassed=prerequisites.every(q=>q.complete);
  const cutoff=allPassed?Math.max(...prerequisites.flatMap(q=>q.evidence.map(id=>finishedAt(records.get(id)!)))):Infinity;
  const finalRecord=sessions.filter(s=>timestamp(s.startedAt)>=cutoff&&missionProgress(finale.mission,[s],now).complete).sort((a,b)=>a.startedAt.localeCompare(b.startedAt))[0];
  finale.complete=allPassed&&!!finalRecord;
  finale.value=finale.complete?1:0;
  finale.evidence=finalRecord?[...new Set([finalRecord.id,...prerequisites.flatMap(q=>q.evidence)])]:[];
  const validRecords=[...new Map(sessions.map(s=>[s.id,s])).values()].filter(s=>timestamp(s.startedAt)<=now&&(!s.endedAt||timestamp(s.endedAt)<=now));
  const recordXp=validRecords.reduce((sum,s)=>sum+sessionXp(s).total,0);
  const missionXp=quests.filter(q=>q.complete).reduce((sum,q)=>sum+q.mission.xp,0);
  return {quests,recordXp,missionXp,xp:recordXp+missionXp,rank:coupleRank(recordXp+missionXp)};
}
