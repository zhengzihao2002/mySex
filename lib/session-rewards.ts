import {progression,sessionXp} from './progression.ts';
import {scoreAll,type Score} from './score.ts';
import type {SexSession,ActionResult} from './types';

export type XpReward={beforeXp:number;afterXp:number;sessionXp:number;missionXp:number;completedMissions:string[]};
export type SaveCelebration={session:SexSession;score:Score;reward?:XpReward};
export type SessionSaveResult=ActionResult&{celebration?:SaveCelebration};
/** Rebuild from authoritative saved rows; duplicate IDs and repeated reads cannot award twice. */
export function savedCelebration(sessions:SexSession[],id:string,dayOf:(iso:string)=>string,now=Date.now()):SaveCelebration|undefined {
  const saved=sessions.find(s=>s.id===id&&s.status==='done');if(!saved)return;
  const score=scoreAll(sessions,dayOf).get(id);if(!score)return;
  if(saved.kind==='oral')return {session:saved,score};
  const before=progression(sessions.filter(s=>s.id!==id),[],now),after=progression(sessions,[],now);
  const completedMissions=after.quests.filter(q=>q.complete&&!before.quests.find(b=>b.mission.key===q.mission.key)?.complete).map(q=>q.mission.key);
  return {session:saved,score,reward:{beforeXp:before.xp,afterXp:after.xp,sessionXp:sessionXp(saved).total,missionXp:after.missionXp-before.missionXp,completedMissions}};
}
