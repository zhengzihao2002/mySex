import {randomUUID} from 'node:crypto';
import type {NeonQueryFunction} from '@neondatabase/serverless';
import {allocateGoalSessionsByAssignee,type MissionGoal,type Metric} from './partner-mission-rules.ts';
type Client=NeonQueryFunction<false,false>;
export type PartnerMissionActor={coupleId:string;userId:string;partnerId:string};
export type RewardIcon='gift'|'ticket'|'sparkles'|'camera'|'coins'|'heart'|'crown';
export type RewardInput={quantity?:number;title:string;details:string;icon:RewardIcon};
export type MissionInput={goals?:MissionGoal[];title:string;description:string;metric:Metric;target:number;startsAt:string;endsAt:string;reward:RewardInput|null;bonusMultiplier:number|null;bonusReward:RewardInput|null;failureClaim:RewardInput|null};
export type PartnerMission=MissionInput & {endRequested?:boolean;goalProgress?:Array<MissionGoal & {value:number}>;id:string;createdAt:string;issuerId:string;assigneeId:string;status:'invited'|'active'|'declined'|'cancelled'|'settled';acceptedAt:string|null;value:number;sessionIds:string[];baseComplete:boolean;bonusComplete:boolean;expired:boolean};
export type StorageItem={quantityRemaining?:number;id:string;missionId:string|null;missionTitle:string;title:string;details:string;icon:RewardIcon;kind:'prize'|'bonus'|'claim'|'ask';ownerId:string;issuerId:string;status:'ready'|'requested'|'used'|'revoked'|'forfeited';createdAt:string;requestedAt:string|null};
const iso=(v:unknown)=>v instanceof Date?v.toISOString():String(v);
export async function partnerMissionMember(client:Client,a:PartnerMissionActor){
 const rows=await client`select c.id from couples c join profiles p on p.user_id=${a.userId} and p.couple_id=c.id join profiles other on other.user_id=${a.partnerId} and other.couple_id=c.id
 where c.id=${a.coupleId} and c.unpaired_at is null and ((c.male_id=${a.userId} and c.female_id=${a.partnerId}) or (c.female_id=${a.userId} and c.male_id=${a.partnerId}))`;
 return rows.length>0;
}
export async function insertPartnerMission(client:Client,a:PartnerMissionActor,input:MissionInput,now=new Date()){
 if(!await partnerMissionMember(client,a))return false;
 const rows=await client`insert into partner_missions(couple_id,issuer_id,assignee_id,title,description,metric,target,starts_at,ends_at,reward,bonus_multiplier,bonus_reward,failure_claim,goals,created_at,updated_at)
 select c.id,${a.userId},${a.partnerId},${input.title},${input.description},${input.metric},${input.target},${input.startsAt},${input.endsAt},${JSON.stringify(input.reward)}::jsonb,${input.bonusMultiplier},${JSON.stringify(input.bonusReward)}::jsonb,${JSON.stringify(input.failureClaim)}::jsonb,${JSON.stringify(input.goals??null)}::jsonb,${now.toISOString()},${now.toISOString()}
 from couples c join profiles p on p.user_id=${a.userId} and p.couple_id=c.id join profiles other on other.user_id=${a.partnerId} and other.couple_id=c.id
 where c.id=${a.coupleId} and c.unpaired_at is null and ${a.userId} in (c.male_id,c.female_id) and ${a.partnerId} in (c.male_id,c.female_id)
 returning id`;
 return rows.length>0;
}
export async function decidePartnerMission(client:Client,a:PartnerMissionActor,id:string,decision:'accept'|'decline'|'cancel',now=new Date()){
 if(!await partnerMissionMember(client,a))return false;
 const status=decision==='accept'?'active':decision==='decline'?'declined':'cancelled';
 const results=await client.transaction(tx=>[
  tx`select user_id from profiles where user_id in (${a.userId},${a.partnerId}) order by user_id for share`,
  tx`update partner_missions m set status=${status},accepted_at=case when ${decision}='accept' then ${now.toISOString()}::timestamptz else accepted_at end,updated_at=${now.toISOString()},revision=revision+1
  from couples c,profiles p,profiles other where m.id=${id} and m.couple_id=${a.coupleId} and c.id=m.couple_id and c.unpaired_at is null and p.user_id=${a.userId} and p.couple_id=c.id and other.user_id=${a.partnerId} and other.couple_id=c.id and ${a.userId} in (c.male_id,c.female_id) and ${a.partnerId} in(c.male_id,c.female_id)
  and (( ${decision} in ('accept','decline') and m.assignee_id=${a.userId} and m.status='invited' and m.ends_at>${now.toISOString()}::timestamptz and m.created_at>${now.toISOString()}::timestamptz-interval '7 days') or (${decision}='cancel' and m.status='invited' and m.issuer_id=${a.userId} and m.ends_at>${now.toISOString()}::timestamptz)) returning m.id`,
 ]);
 return results[1].length>0;
}

type MissionRow={end_requested:boolean;goals:MissionGoal[]|null;goal_progress:Array<MissionGoal & {value:number}>|null;id:string;couple_id:string;issuer_id:string;assignee_id:string;title:string;description:string;metric:Metric;target:number|string;starts_at:unknown;ends_at:unknown;reward:RewardInput|null;bonus_multiplier:number|string|null;bonus_reward:RewardInput|null;failure_claim:RewardInput|null;status:PartnerMission['status'];accepted_at:unknown;created_at:unknown;progress_value:number|string;proof_ids:string[];revision:number};
const readMissions=async(client:Client,a:PartnerMissionActor)=>await client`select m.*, exists(select 1 from partner_goal_end_requests r where r.goal_id=m.id and r.created_at>now()-interval '7 days') as end_requested from partner_missions m join couples c on c.id=m.couple_id join profiles p on p.user_id=${a.userId} and p.couple_id=c.id join profiles other on other.user_id=${a.partnerId} and other.couple_id=c.id where m.couple_id=${a.coupleId} and c.unpaired_at is null and ${a.userId} in(c.male_id,c.female_id) and ${a.partnerId} in(c.male_id,c.female_id) order by m.created_at desc` as unknown as MissionRow[];
export async function getPartnerMissionBoard(client:Client,a:PartnerMissionActor,now=new Date()):Promise<{missions:PartnerMission[];items:StorageItem[]}>{
 if(!await partnerMissionMember(client,a))return {missions:[],items:[]};
 // A declined invitation only lives on as the sender's Inbox notice, for at most seven days.
 await client`delete from partner_missions where couple_id=${a.coupleId} and status='declined'
   and updated_at<=${now.toISOString()}::timestamptz-interval '7 days'`;
 let rows=await readMissions(client,a);
 await client`delete from partner_goal_end_requests r using partner_missions m
   where r.goal_id=m.id and m.couple_id=${a.coupleId}
   and (m.status<>'active' or m.ends_at<=${now.toISOString()}::timestamptz
     or r.created_at<=${now.toISOString()}::timestamptz-interval '7 days')`;
 // Expire the approval request, not the earned item. Either partner's visit
 // returns stale requests to Storage so their owner can ask again later.
 await client`update partner_storage_items i set status='ready',requested_at=null
 from couples c,profiles p,profiles other where i.couple_id=${a.coupleId} and c.id=i.couple_id and c.unpaired_at is null
 and p.user_id=${a.userId} and p.couple_id=c.id and other.user_id=${a.partnerId} and other.couple_id=c.id
 and i.status='requested' and i.requested_at<=${now.toISOString()}::timestamptz-interval '7 days'`;

 const sessions=rows.some(m=>m.status==='active')?await client`select id,kind,status,started_at,ended_at,duration_sec,paused_sec,tags,created_at,mission_saved_at from sessions where couple_id=${a.coupleId} and status='done'`:[];
 const saved=sessions.map(s=>({id:s.id,kind:s.kind,status:s.status,startedAt:iso(s.started_at),endedAt:s.ended_at?iso(s.ended_at):null,durationSec:s.duration_sec,pausedSec:s.paused_sec,tags:s.tags??[],createdAt:iso(s.mission_saved_at??s.created_at)}));
 const reserved=new Map<string,Set<string>>();
 for(const m of rows)if(m.status==='settled'||m.status==='cancelled'){const ids=reserved.get(m.assignee_id)??new Set<string>();for(const id of m.proof_ids??[])ids.add(id);reserved.set(m.assignee_id,ids);}
 const allocation=allocateGoalSessionsByAssignee(
  rows.filter(m=>m.status==='active').map(m=>({
   id:m.id,
   assigneeId:m.assignee_id,
   rule:{metric:m.metric,target:Number(m.target),startsAt:iso(m.starts_at),endsAt:iso(m.ends_at),acceptedAt:m.accepted_at?iso(m.accepted_at):null},
   goals:m.goals??[{kind:'intercourse',metric:m.metric,target:Number(m.target)}],
   bonusMultiplier:m.bonus_multiplier==null?null:Number(m.bonus_multiplier),
  })),
  saved,
  reserved,
  now,
 );
 for (const m of rows) {
  if (m.status==='invited' && (new Date(iso(m.ends_at))<=now || new Date(iso(m.created_at)).getTime()<=now.getTime()-7*86400000)) {
   await decideExpiredInvite(client,a,m.id,now);
  }
 }
 const active = rows.filter(m=>m.status==='active');
 const changed = active.filter(m=>{
  const result=allocation.get(m.id)!;
  return result.expired || Number(m.progress_value)!==result.value ||
   JSON.stringify(m.proof_ids)!==JSON.stringify(result.sessionIds) ||
   JSON.stringify(m.goal_progress?.map(({kind,metric,target,value})=>({kind,metric,target,value})))!==
    JSON.stringify(result.checks.map(({kind,metric,target,value})=>({kind,metric,target,value})));
 });
 // Commit allocations together. A competing refresh must not write part of an
 // allocation calculated against a different set of goal revisions.
 if (changed.length) {
  const snapshot=JSON.stringify(rows.filter(m=>m.accepted_at).map(m=>[m.id,m.revision]).sort((x,y)=>String(x[0]).localeCompare(String(y[0]))));
  await client.transaction(tx=>[
   tx`select user_id from profiles where user_id in (${a.userId},${a.partnerId}) order by user_id for share`,
   tx`select pg_advisory_xact_lock(hashtextextended(${a.coupleId},0))`,
   tx`select id from partner_missions where couple_id=${a.coupleId} order by id for update`,
   tx`select set_config('mysex.allocation_current',
    (coalesce(jsonb_agg(jsonb_build_array(id,revision) order by id),'[]'::jsonb)=${snapshot}::jsonb)::text,true)
    from partner_missions where couple_id=${a.coupleId} and accepted_at is not null`,
   ...changed.flatMap(m=>{
    const result=allocation.get(m.id)!;
    const base=result.baseComplete,bonus=!!m.bonus_multiplier&&result.value>=Number(m.target)*Number(m.bonus_multiplier);
    const evaluated=now.toISOString(),token=randomUUID();
    const prize=base?m.reward:null,extra=bonus?m.bonus_reward:null,claim=result.expired&&!base?m.failure_claim:null;
    return [
     tx`update partner_missions m set goal_progress=${JSON.stringify(result.checks.map(({kind,metric,target,value})=>({kind,metric,target,value})))}::jsonb,progress_value=${result.value},proof_ids=${result.sessionIds}::uuid[],evaluated_at=${evaluated},evaluation_token=${token},status=case when ${result.expired} then 'settled' else 'active' end,revision=revision+1,updated_at=${evaluated}
     from couples c,profiles p,profiles other where m.id=${m.id} and m.couple_id=${a.coupleId} and m.revision=${m.revision} and current_setting('mysex.allocation_current',true)='true' and m.status='active' and c.id=m.couple_id and c.unpaired_at is null and p.user_id=${a.userId} and p.couple_id=c.id and other.user_id=${a.partnerId} and other.couple_id=c.id returning m.id`,
     ...(['prize','bonus','claim'] as const).map((kind,index)=>{
      const reward=[prize,extra,claim][index];
      const owner=kind==='claim'?m.issuer_id:m.assignee_id,issuer=kind==='claim'?m.assignee_id:m.issuer_id;
      return tx`insert into partner_storage_items(mission_id,couple_id,owner_id,issuer_id,kind,title,details,icon,created_at,quantity_remaining)
        select m.id,m.couple_id,${owner},${issuer},${kind},${reward?.title??''},${reward?.details??''},${reward?.icon??'gift'},${evaluated}::timestamptz,${reward?.quantity??1}
        from partner_missions m where m.id=${m.id} and m.couple_id=${a.coupleId} and m.revision=${m.revision+1} and m.evaluation_token=${token}::uuid and m.status in ('active','settled') and ${!!reward}
        on conflict(mission_id,kind) do update set status='ready',requested_at=null where partner_storage_items.status='revoked'`;
     }),
     tx`update partner_storage_items i set status='revoked',requested_at=null from partner_missions m where i.mission_id=m.id and m.id=${m.id} and m.couple_id=${a.coupleId} and m.revision=${m.revision+1} and m.evaluation_token=${token}::uuid and i.status in ('ready','requested') and ((i.kind='prize' and ${!prize}) or(i.kind='bonus' and ${!extra}) or(i.kind='claim' and ${!claim}))`,
    ];
   }),
  ]);
 }
 rows=await readMissions(client,a);
 const missions=rows.map(m=>{
  const value=Number(m.progress_value),baseComplete=!!m.accepted_at&&value>=Number(m.target),bonusMultiplier=m.bonus_multiplier?Number(m.bonus_multiplier):null,bonusComplete=!!bonusMultiplier&&baseComplete&&value>=Number(m.target)*bonusMultiplier,expired=new Date(iso(m.ends_at))<=now;
  // Both partners see the reward and bonus reward; only the issuer sees the punishment.
  const issuer=m.issuer_id===a.userId;
  return {endRequested:m.end_requested,goals:m.goals??undefined,goalProgress:m.goal_progress??undefined,id:m.id,title:m.title,description:m.description,metric:m.metric,target:Number(m.target),startsAt:iso(m.starts_at),endsAt:iso(m.ends_at),createdAt:iso(m.created_at),issuerId:m.issuer_id,assigneeId:m.assignee_id,status:m.status,acceptedAt:m.accepted_at?iso(m.accepted_at):null,value,sessionIds:m.proof_ids,baseComplete,bonusMultiplier,bonusComplete,expired,reward:m.reward,bonusReward:m.bonus_reward,failureClaim:issuer?m.failure_claim:null};
 });
 const items=await client`select i.*,m.title as mission_title from partner_storage_items i left join partner_missions m on m.id=i.mission_id join couples c on c.id=i.couple_id join profiles p on p.user_id=${a.userId} and p.couple_id=c.id join profiles other on other.user_id=${a.partnerId} and other.couple_id=c.id where i.couple_id=${a.coupleId} and c.unpaired_at is null and ((i.owner_id=${a.userId} and i.status in ('ready','requested','used')) or (i.issuer_id=${a.userId} and i.status='requested')) order by i.created_at desc`;
 return {missions,items:items.map(i=>({quantityRemaining:i.quantity_remaining,id:i.id,missionId:i.mission_id,missionTitle:i.mission_title??'Item request',title:i.title,details:i.details,icon:i.icon,kind:i.kind,ownerId:i.owner_id,issuerId:i.issuer_id,status:i.status,createdAt:iso(i.created_at),requestedAt:i.requested_at?iso(i.requested_at):null}))};
}
async function decideExpiredInvite(client:Client,a:PartnerMissionActor,id:string,now:Date){
 await client`update partner_missions m set status='cancelled',revision=revision+1,updated_at=${now.toISOString()} from couples c,profiles p where m.id=${id} and m.couple_id=${a.coupleId} and m.status='invited' and (m.ends_at<=${now.toISOString()}::timestamptz or m.created_at<=${now.toISOString()}::timestamptz-interval '7 days') and c.id=m.couple_id and c.unpaired_at is null and p.user_id=${a.userId} and p.couple_id=c.id`;
}
export async function changeStorageItem(client:Client,a:PartnerMissionActor,id:string,action:'request'|'withdraw'|'approve'|'decline',now=new Date(),expectedRequest?:string,declineReason=""){
 if(!await partnerMissionMember(client,a))return false;
 // Recheck earned eligibility before accepting or spending a token.
 await getPartnerMissionBoard(client,a,now);
 const status=action==='approve'?'used':action==='request'?'requested':'ready';
 const rows=await client`with handled as (
 update partner_storage_items i set status=case when ${action}='approve' and i.quantity_remaining>1 then 'ready' else ${status} end,
 quantity_remaining=i.quantity_remaining-case when ${action}='approve' then 1 else 0 end,requested_at=case when ${action}='request' then ${now.toISOString()}::timestamptz else null end,used_at=case when ${action}='approve' then ${now.toISOString()}::timestamptz else used_at end
 from couples c,profiles p,profiles other where i.id=${id} and i.quantity_remaining>0 and i.couple_id=${a.coupleId} and c.id=i.couple_id and c.unpaired_at is null and p.user_id=${a.userId} and p.couple_id=c.id and other.user_id=${a.partnerId} and other.couple_id=c.id and (( ${action}='request' and i.owner_id=${a.userId} and i.status='ready') or (${action}='withdraw' and i.owner_id=${a.userId} and i.status='requested') or (${action} in ('approve','decline') and i.issuer_id=${a.userId} and i.status='requested'
 and (${expectedRequest??null}::timestamptz is null or i.requested_at=${expectedRequest??null}::timestamptz))) returning i.id,i.couple_id,i.owner_id,i.title
 ), reply as (
   insert into partner_storage_declines (couple_id,recipient_id,title,reason)
   select couple_id,owner_id,title,${declineReason} from handled where ${action}='decline'
 ) select id from handled`;
 return rows.length>0;
}

export async function forfeitStorageItem(client:Client, actor:PartnerMissionActor, id:string) {
  const rows = await client`
    update partner_storage_items item
    set status='forfeited', quantity_remaining=0, requested_at=null
    from couples c, profiles owner, profiles partner
    where item.id=${id} and item.owner_id=${actor.userId} and item.issuer_id=${actor.partnerId}
      and item.couple_id=${actor.coupleId} and c.id=item.couple_id and c.unpaired_at is null
      and owner.user_id=item.owner_id and owner.couple_id=c.id
      and partner.user_id=item.issuer_id and partner.couple_id=c.id
      and item.status in ('ready','requested') and item.quantity_remaining>0
    returning item.id`;
  return rows.length>0;
}

/** The sender dismisses the notice of a declined invitation; the goal is then deleted. */
export async function dismissDeclinedMission(client:Client,a:PartnerMissionActor,id:string){
 if(!await partnerMissionMember(client,a))return false;
 const rows=await client`delete from partner_missions where id=${id} and couple_id=${a.coupleId}
   and issuer_id=${a.userId} and status='declined' returning id`;
 return rows.length>0;
}
