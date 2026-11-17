import {dayInTz,safeTz} from './tz.ts';
import type {MissionGoal} from './partner-mission-rules.ts';
/** Count selected local calendar dates; an end at midnight excludes that final date. */
export function goalDays(startsAt:string,endsAt:string,timeZone:string){
 const zone=safeTz(timeZone),start=Date.parse(startsAt),end=Date.parse(endsAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 0;
 const first=Date.parse(dayInTz(new Date(start),zone)+'T00:00:00Z'),last=Date.parse(dayInTz(new Date(end-1),zone)+'T00:00:00Z');
 return Math.round((last-first)/86400000)+1;
}
export function scheduledGoal(goal:MissionGoal,startsAt:string,endsAt:string,timeZone:string):MissionGoal{
 if(goal.perDay===undefined)return goal;
 const days=goalDays(startsAt,endsAt,timeZone);
 return {...goal,target:goal.perDay*days,days,timeZone:safeTz(timeZone)};
}
