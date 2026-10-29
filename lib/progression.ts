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
export type Mission={key:string;path:'explorer'|'endurance'|'rhythm'|'finale';title:string;description:string;xp:number;target:number;rule:'new'|'positions'|'collection'|'minutes'|'days'|'return'|'finale';requires?:string};
export const MISSIONS:Mission[]=[
  {key:'new',path:'explorer',title:/*i18n*/'Uncharted territory',description:/*i18n*/'Record your first position in the library.',xp:50,target:1,rule:'new'},
  {key:'duet',path:'explorer',title:/*i18n*/'The switch-up',description:/*i18n*/'Record two different positions in one session.',xp:100,target:2,rule:'positions',requires:'new'},
  {key:'trio',path:'explorer',title:/*i18n*/'Three-act adventure',description:/*i18n*/'Record three different positions in one session.',xp:150,target:3,rule:'positions',requires:'duet'},
  {key:'collection',path:'explorer',title:/*i18n*/'The position atlas',description:/*i18n*/'Collect four different positions across your sessions.',xp:150,target:4,rule:'collection',requires:'trio'},
  {key:'time10',path:'endurance',title:/*i18n*/'Find your rhythm',description:/*i18n*/'Record 10 active minutes in one session.',xp:50,target:10,rule:'minutes'},
  {key:'time15',path:'endurance',title:/*i18n*/'Hold the flame',description:/*i18n*/'Record 15 active minutes in one session.',xp:100,target:15,rule:'minutes',requires:'time10'},
  {key:'time20',path:'endurance',title:/*i18n*/'Beyond the familiar',description:/*i18n*/'Record 20 active minutes in one session.',xp:100,target:20,rule:'minutes',requires:'time15'},
  {key:'time30',path:'endurance',title:/*i18n*/'The long game',description:/*i18n*/'Record 30 active minutes in one session.',xp:150,target:30,rule:'minutes',requires:'time20'},
  {key:'time40',path:'endurance',title:/*i18n*/'Endurance crown',description:/*i18n*/'Record 40 active minutes in one session. Optional summit; no extra time rewards beyond it.',xp:150,target:40,rule:'minutes',requires:'time30'},
  {key:'days2',path:'rhythm',title:/*i18n*/'Encore together',description:/*i18n*/'Record sessions on two different days. No deadline.',xp:50,target:2,rule:'days'},
  {key:'days3',path:'rhythm',title:/*i18n*/'Our recurring adventure',description:/*i18n*/'Record sessions on three different days. No deadline.',xp:100,target:3,rule:'days',requires:'days2'},
  {key:'return',path:'rhythm',title:/*i18n*/'A favourite returns',description:/*i18n*/'Revisit the same position on three different days.',xp:150,target:3,rule:'return',requires:'days3'},
  {key:'finale',path:'finale',title:/*i18n*/'Chapter champions',description:/*i18n*/'Complete the three paths through 30 minutes, plus a session with 20 active minutes and two positions.',xp:300,target:1,rule:'finale'},
];
export type MissionRun={id:string;key:string;kind:SessionKind;requestedBy:string;createdAt:string;acceptedAt:string|null;skippedAt?:string|null;timeZone:string};
export type MissionProgress={value:number;target:number;complete:boolean;evidence:string[]};
const timestamp=(s:string)=>new Date(s).getTime();
const day=(iso:string)=>new Date(iso).toISOString().slice(0,10);
/** Automatic, one-time goals: current saved evidence is the source of truth. */
export function missionProgress(m:Mission,sessions:SexSession[],now=Date.now()):MissionProgress {
  const eligible=[...new Map(sessions.map(s=>[s.id,s])).values()].filter(s=>s.kind==='intercourse'&&s.status==='done'&&(s.durationSec==null||s.durationSec>0)&&timestamp(s.startedAt)<=now&&(!s.endedAt||timestamp(s.endedAt)<=now)).sort((a,b)=>a.startedAt.localeCompare(b.startedAt)||a.id.localeCompare(b.id));
  let value=0;let evidence:string[]=[];
  const collected=new Set<string>();const days=new Set<string>();const revisits=new Map<string,Map<string,string>>();
  for(const s of eligible){
    const positions=positionTags(s);let candidate=0;
    if(m.rule==='minutes')candidate=(s.durationSec??0)/60;
    if(m.rule==='positions')candidate=positions.length;
    if(m.rule==='new')candidate=positions.length?1:0;
    if(m.rule==='finale')candidate=(s.durationSec??0)>=1200&&positions.length>=2?1:0;
    if(['minutes','positions','new','finale'].includes(m.rule)){
      if(candidate>value){value=candidate;evidence=[s.id];}
    }else if(m.rule==='collection'){
      const old=collected.size;positions.forEach(p=>collected.add(p));if(collected.size>old)evidence.push(s.id);value=collected.size;
    }else if(m.rule==='days'){
      const d=day(s.startedAt);if(!days.has(d)){days.add(d);evidence.push(s.id);}value=days.size;
    }else if(m.rule==='return'){
      for(const p of positions){const entries=revisits.get(p)??new Map<string,string>();entries.set(day(s.startedAt),s.id);revisits.set(p,entries);if(entries.size>value){value=entries.size;evidence=[...entries.values()];}}
    }
    if(value>=m.target)break;
  }
  return {value:Math.min(value,m.target),target:m.target,complete:value>=m.target,evidence};
}
// Legacy invitations are ignored: neither acceptance nor a stored skip can alter rewards.
export function progression(sessions:SexSession[],_legacyRuns:MissionRun[]=[],now=Date.now()) {
  const quests=MISSIONS.map(mission=>({...missionProgress(mission,sessions,now),mission}));
  const finale=quests.find(q=>q.mission.rule==='finale')!;
  const prerequisites=['collection','time30','return'].map(key=>quests.find(q=>q.mission.key===key)!);
  finale.complete=finale.complete&&prerequisites.every(q=>q.complete);
  if(finale.complete)finale.evidence=[...new Set([...finale.evidence,...prerequisites.flatMap(q=>q.evidence)])];
  const validRecords=[...new Map(sessions.map(s=>[s.id,s])).values()].filter(s=>timestamp(s.startedAt)<=now&&(!s.endedAt||timestamp(s.endedAt)<=now));
  const recordXp=validRecords.reduce((sum,s)=>sum+sessionXp(s).total,0);
  const missionXp=quests.filter(q=>q.complete).reduce((sum,q)=>sum+q.mission.xp,0);
  return {quests,recordXp,missionXp,xp:recordXp+missionXp,rank:coupleRank(recordXp+missionXp)};
}
