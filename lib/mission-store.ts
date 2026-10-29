import type {NeonQueryFunction} from '@neondatabase/serverless';
import type {MissionRun} from './progression';
import type {SessionKind} from './types';
type Client=NeonQueryFunction<false,false>;
type Actor={coupleId:string;userId:string;partnerId:string};
export async function getMissionRuns(client:Client,coupleId:string):Promise<MissionRun[]> {
  const rows=await client`select * from couple_missions where couple_id=${coupleId}
    and (accepted_at is not null or skipped_at is not null or created_at>now()-interval '7 days') order by created_at`;
  const iso=(v:Date|string)=>v instanceof Date?v.toISOString():String(v);
  return rows.map(r=>({id:r.id,key:r.mission_key,kind:r.kind,requestedBy:r.requested_by,createdAt:iso(r.created_at),acceptedAt:r.accepted_at?iso(r.accepted_at):null,skippedAt:r.skipped_at?iso(r.skipped_at):null,timeZone:r.time_zone}));
}
/** Actor/membership checked again inside each mutation; a stale invite cannot be accepted. */
export async function inviteMission(client:Client,a:Actor,key:string,kind:SessionKind,timeZone:string,skip=false) {
  const result=await client.transaction(tx=>[
    tx`select user_id from profiles where user_id in (${a.userId},${a.partnerId}) order by user_id for share`,
    tx`delete from couple_missions where couple_id=${a.coupleId} and accepted_at is null and skipped_at is null and created_at<=now()-interval '7 days'`,
    tx`insert into couple_missions(couple_id,mission_key,kind,requested_by,time_zone,skipped_at)
      select ${a.coupleId},${key},${kind},${a.userId},${timeZone},case when ${skip} then now() else null end
      from couples c join profiles p on p.user_id=${a.userId} and p.couple_id=c.id
      join profiles other on other.user_id=${a.partnerId} and other.couple_id=c.id
      where c.id=${a.coupleId} and c.unpaired_at is null
      and ${a.userId} in (c.male_id,c.female_id) and ${a.partnerId} in (c.male_id,c.female_id)
      on conflict(couple_id,kind,mission_key) do nothing returning id`,
  ]);
  return result[2].length>0;
}
export async function acceptMission(client:Client,a:Actor,id:string) {
  const result=await client.transaction(tx=>[
    tx`select user_id from profiles where user_id in (${a.userId},${a.partnerId}) order by user_id for share`,
    tx`update couple_missions m set accepted_at=now() from couples c,profiles p,profiles other
      where m.id=${id} and m.couple_id=${a.coupleId} and c.id=m.couple_id and c.unpaired_at is null
      and p.user_id=${a.userId} and p.couple_id=c.id and other.user_id=${a.partnerId} and other.couple_id=c.id
      and ${a.userId} in (c.male_id,c.female_id) and m.requested_by=${a.partnerId}
      and m.accepted_at is null and m.skipped_at is null and m.created_at>now()-interval '7 days' returning m.id`,
  ]);
  return result[1].length>0;
}
export async function abandonMission(client:Client,a:Actor,id:string) {
  const rows=await client`delete from couple_missions m using couples c,profiles p
    where m.id=${id} and m.couple_id=${a.coupleId} and c.id=m.couple_id and c.unpaired_at is null
    and p.user_id=${a.userId} and p.couple_id=c.id and ${a.userId} in (c.male_id,c.female_id) returning m.id`;
  return rows.length>0;
}
