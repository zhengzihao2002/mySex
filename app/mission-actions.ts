'use server';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {requireCouple,getSessions} from '@/lib/data';
import {db} from '@/lib/db';
import {MISSIONS,missionUnlocked,missionProgress} from '@/lib/progression';
import {getMissionRuns,inviteMission,acceptMission,abandonMission} from '@/lib/mission-store';
import type {ActionResult,SessionKind} from '@/lib/types';

export async function changeMission(input:{action:'invite'|'accept'|'abandon'|'skip';key?:string;kind?:SessionKind;timeZone?:string;id?:string}):Promise<ActionResult> {
  const p=z.object({action:z.enum(['invite','accept','abandon','skip']),key:z.string().max(30).optional(),kind:z.literal('intercourse').optional(),timeZone:z.string().max(100).optional(),id:z.uuid().optional()}).safeParse(input);
  if(!p.success)return {ok:false,error:/*i18n*/'Invalid input'};
  const ctx=await requireCouple(),d=p.data;
  const actor={coupleId:ctx.couple.id,userId:ctx.me.userId,partnerId:ctx.partner.userId};
  const [runs,sessions]=await Promise.all([getMissionRuns(db(),ctx.couple.id),getSessions(ctx.couple.id)]);
  let ok=false;
  if(d.action==='invite'||d.action==='skip') {
    const m=MISSIONS.find(m=>m.key===d.key);
    if(!m||!d.kind||!missionUnlocked(m,d.kind,runs,sessions))return {ok:false,error:/*i18n*/'Complete the earlier mission first.'};
    const tz=d.timeZone??'UTC';
    try{new Intl.DateTimeFormat('en',{timeZone:tz});}catch{return {ok:false,error:/*i18n*/'Invalid input'};}
    ok=await inviteMission(db(),actor,m.key,d.kind,tz,d.action==='skip');
  }else{
    const run=runs.find(r=>r.id===d.id),m=MISSIONS.find(m=>m.key===run?.key);
    if(!run||run.kind!=='intercourse'||!m)return {ok:false,error:/*i18n*/'This mission changed. Refresh and try again.'};
    if(d.action==='accept') {
      if(!missionUnlocked(m,run.kind,runs,sessions))return {ok:false,error:/*i18n*/'Complete the earlier mission first.'};
      ok=await acceptMission(db(),actor,run.id);
    }else{
      if(missionProgress(m,run,sessions).complete)return {ok:false,error:/*i18n*/'Completed missions stay in your trophy collection.'};
      ok=await abandonMission(db(),actor,run.id);
    }
  }
  revalidatePath('/','layout');
  return ok?{ok:true}:{ok:false,error:/*i18n*/'This mission changed. Refresh and try again.'};
}
