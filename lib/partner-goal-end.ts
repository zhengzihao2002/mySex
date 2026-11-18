import type {NeonQueryFunction} from '@neondatabase/serverless';
import {getPartnerMissionBoard, partnerMissionMember, type PartnerMissionActor} from './partner-mission-store.ts';

type Client = NeonQueryFunction<false, false>;
export type GoalEndRequest = {id:string; goalId:string; title:string; startsAt:string; endsAt:string; requestedBy:string; createdAt:string};

async function clearExpired(client:Client, actor:PartnerMissionActor, now:string) {
  await client`delete from partner_goal_end_requests r using partner_missions m
    where r.goal_id=m.id and m.couple_id=${actor.coupleId}
      and (m.status<>'active' or m.ends_at<=${now}::timestamptz or r.created_at<=${now}::timestamptz-interval '7 days')`;
}

export async function listGoalEndRequests(client:Client, actor:PartnerMissionActor, now=new Date()):Promise<GoalEndRequest[]> {
  if (!await partnerMissionMember(client,actor)) return [];
  const at=now.toISOString();
  await clearExpired(client,actor,at);
  const rows=await client`select r.id,r.goal_id,m.title,m.starts_at,m.ends_at,r.requested_by,r.created_at from partner_goal_end_requests r
    join partner_missions m on m.id=r.goal_id
    where m.couple_id=${actor.coupleId} and m.status='active' and m.ends_at>${at}::timestamptz
    order by r.created_at`;
  return rows.map(r=>({id:r.id,goalId:r.goal_id,title:r.title,startsAt:new Date(r.starts_at).toISOString(),endsAt:new Date(r.ends_at).toISOString(),requestedBy:r.requested_by,createdAt:new Date(r.created_at).toISOString()}));
}

export async function requestGoalEnd(client:Client, actor:PartnerMissionActor, id:string, now=new Date()){
  if (!await partnerMissionMember(client,actor)) return false;
  const at=now.toISOString();
  await clearExpired(client,actor,at);
  const rows=await client`insert into partner_goal_end_requests (goal_id,requested_by,created_at)
    select id,${actor.userId},${at} from partner_missions
    where id=${id} and couple_id=${actor.coupleId} and status='active' and ends_at>${at}::timestamptz
    on conflict (goal_id) do nothing returning goal_id`;
  return rows.length>0;
}

export async function resolveGoalEnd(client:Client, actor:PartnerMissionActor, id:string, decision:'approve'|'decline'|'withdraw', now=new Date()){
  if (!await partnerMissionMember(client,actor)) return false;
  if (decision==='approve') await getPartnerMissionBoard(client,actor,now);
  const at=now.toISOString();
  const rows=await client`with handled as (
    delete from partner_goal_end_requests r using partner_missions m
    where r.goal_id=m.id and r.id=${id} and m.couple_id=${actor.coupleId}
      and m.status='active' and m.ends_at>${at}::timestamptz and r.created_at>${at}::timestamptz-interval '7 days'
      and r.requested_by in (${actor.userId},${actor.partnerId})
      and ((${decision}='withdraw' and r.requested_by=${actor.userId})
        or (${decision}<>'withdraw' and r.requested_by=${actor.partnerId}))
    returning r.goal_id
  ), ended as (
    update partner_missions m set status='cancelled', revision=revision+1, updated_at=${at}
    from handled h where m.id=h.goal_id and m.status='active' and ${decision}='approve'
    returning m.id
  ) select goal_id from handled where ${decision}<>'approve'
  union all select id from ended`;
  return rows.length>0;
}
