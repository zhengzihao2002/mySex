import {ACTIVITY_GROUPS} from './activity-details.ts';
import type {SexSession, SessionKind} from './types';

export function positionTags(s: Pick<SexSession,'kind'|'tags'>): string[] {
  const allowed=new Set(ACTIVITY_GROUPS[s.kind].find(g=>g.key==='positions')!.tags);
  return [...new Set(s.tags)].filter(tag=>allowed.has(tag));
}
export const endurancePoints=(seconds:number)=>Math.round(45*Math.pow(Math.min(Math.max(0,seconds)/2400,1),1.4));
/** Derived from one canonical record, never an increment on Save. Legacy records earn no retroactive XP. */
export function sessionXp(s: Pick<SexSession,'status'|'scoreVersion'|'durationSec'|'kind'>) {
  if(s.kind!=='intercourse'||s.status!=='done'||s.scoreVersion!==2||(s.durationSec??0)<=0)return {base:0,endurance:0,total:0};
  const base=25;
  const endurance=Math.round(80*Math.pow(Math.min(s.durationSec!/2400,1),1.4));
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
export const rankThreshold=(index:number)=>{
  const last=RANKS.length-1;
  const classic=50*index*index+100*index;
  const finalClassic=50*last*last+100*last;
  // Retain the introductory 150 XP step, then progressively widen the gaps.
  const climb=index*index*Math.max(0,index-1)/(last*last*(last-1));
  return Math.round((classic+(TOP_RANK_XP-finalClassic)*climb)/50)*50;
};
export function coupleRank(xp:number,intercourseRecords=Infinity) {
  let index=0;while(index<RANKS.length-1&&xp>=rankThreshold(index+1))index++;
  if(index===RANKS.length-1&&intercourseRecords<TOP_RANK_RECORD_TARGET)index--;
  const floor=rankThreshold(index),ceiling=index<RANKS.length-1?rankThreshold(index+1):null;
  return {recordsRemaining:index===RANKS.length-2?Math.max(0,TOP_RANK_RECORD_TARGET-intercourseRecords):0,level:index+1,title:RANKS[index],floor,ceiling,nextTitle:ceiling?RANKS[index+1]:null,progress:ceiling?Math.min(1,(xp-floor)/(ceiling-floor)):1};
}
export type Mission={key:string;path:'explorer'|'endurance'|'rhythm'|'finale';title:string;description:string;xp:number;target:number;rule:'new'|'positions'|'collection'|'minutes'|'days'|'return'|'finale';requires?:string};
export const MISSIONS:Mission[]=[
  {key:'new',path:'explorer',title:/*i18n*/'Uncharted territory',description:/*i18n*/'Record a position you had never recorded before accepting this mission.',xp:50,target:1,rule:'new'},
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
  {key:'finale',path:'finale',title:/*i18n*/'Chapter champions',description:/*i18n*/'After the three paths, record 20 active minutes and two positions in one session.',xp:300,target:1,rule:'finale'},
];
export const TOP_RANK_RECORD_TARGET=5000;
// Round above the maximum rewards from 5,000 records and all finite missions.
export const TOP_RANK_XP=Math.ceil((TOP_RANK_RECORD_TARGET*105+MISSIONS.reduce((sum,m)=>sum+m.xp,0))/10000)*10000;
export type MissionRun={id:string;key:string;kind:SessionKind;requestedBy:string;createdAt:string;acceptedAt:string|null;skippedAt?:string|null;timeZone:string};
export type MissionProgress={value:number;target:number;complete:boolean;evidence:string[]};
const timestamp=(s:string)=>new Date(s).getTime();
const day=(iso:string,tz:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
export function missionProgress(m:Mission,run:MissionRun,sessions:SexSession[],now=Date.now()):MissionProgress {
  if(run.kind!=='intercourse'||!run.acceptedAt||run.skippedAt)return {value:0,target:m.target,complete:false,evidence:[]};
  const start=timestamp(run.acceptedAt);
  const unique=[...new Map(sessions.map(s=>[s.id,s])).values()];
  const eligible=unique.filter(s=>s.kind===run.kind&&s.status==='done'&&(s.durationSec??0)>0&&timestamp(s.startedAt)>=start&&timestamp(s.startedAt)<=now&&(!s.endedAt||timestamp(s.endedAt)<=now)).sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
  const baseline=new Set(unique.filter(s=>s.kind===run.kind&&s.status==='done'&&timestamp(s.startedAt)<start).flatMap(positionTags));
  let value=0;let evidence:string[]=[];
  const collected=new Set<string>();const days=new Set<string>();const revisits=new Map<string,Map<string,string>>();
  for(const s of eligible){
    const positions=positionTags(s);let candidate=0;
    if(m.rule==='minutes')candidate=(s.durationSec??0)/60;
    if(m.rule==='positions')candidate=positions.length;
    if(m.rule==='new')candidate=positions.some(p=>!baseline.has(p))?1:0;
    if(m.rule==='finale')candidate=(s.durationSec??0)>=1200&&positions.length>=2?1:0;
    if(['minutes','positions','new','finale'].includes(m.rule)){
      if(candidate>value){value=candidate;evidence=[s.id];}
    }else if(m.rule==='collection'){
      const old=collected.size;positions.forEach(p=>collected.add(p));if(collected.size>old)evidence.push(s.id);value=collected.size;
    }else if(m.rule==='days'){
      const d=day(s.startedAt,run.timeZone);if(!days.has(d)){days.add(d);evidence.push(s.id);}value=days.size;
    }else if(m.rule==='return'){
      for(const p of positions){const entries=revisits.get(p)??new Map<string,string>();entries.set(day(s.startedAt,run.timeZone),s.id);revisits.set(p,entries);if(entries.size>value){value=entries.size;evidence=[...entries.values()];}}
    }
    if(value>=m.target)break;
  }
  return {value:Math.min(value,m.target),target:m.target,complete:value>=m.target,evidence};
}
export function progression(sessions:SexSession[],runs:MissionRun[],now=Date.now()) {
  const uniqueRuns=[...new Map(runs.filter(r=>r.kind==='intercourse').map(r=>[`${r.kind}:${r.key}`,r])).values()];
  const quests=uniqueRuns.flatMap(run=>{const m=MISSIONS.find(m=>m.key===run.key);return m?[{...missionProgress(m,run,sessions,now),run,mission:m}]:[];});
  const validRecords=[...new Map(sessions.map(s=>[s.id,s])).values()].filter(s=>timestamp(s.startedAt)<=now&&(!s.endedAt||timestamp(s.endedAt)<=now));
  const recordXp=validRecords.reduce((sum,s)=>sum+sessionXp(s).total,0);
  const intercourseRecords=validRecords.filter(s=>s.kind==='intercourse'&&sessionXp(s).total>0).length;
  const missionXp=quests.filter(q=>q.complete).reduce((sum,q)=>sum+q.mission.xp,0);
  return {quests,recordXp,missionXp,intercourseRecords,xp:recordXp+missionXp,rank:coupleRank(recordXp+missionXp,intercourseRecords)};
}
export function missionUnlocked(m:Mission,kind:SessionKind,runs:MissionRun[],sessions:SexSession[],now=Date.now()) {
  if(kind!=='intercourse')return false;
  const complete=(key:string)=>{const run=runs.find(r=>r.kind===kind&&r.key===key);const mission=MISSIONS.find(x=>x.key===key);return !!run&&!!mission&&(!!run.skippedAt||missionProgress(mission,run,sessions,now).complete);};
  // The 40-minute summit is optional for the finale.
  return m.rule==='finale'?['collection','time30','return'].every(complete):!m.requires||complete(m.requires);
}
