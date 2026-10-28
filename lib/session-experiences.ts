import type {NeonQueryFunction} from '@neondatabase/serverless';
export type ExperienceInput={hisRating:number|null;herRating:number|null;hisNotes:string;herNotes:string;hisOrgasms:number|null;herOrgasms:number|null};
export function averageHeat(d:Pick<ExperienceInput,'hisRating'|'herRating'>){const values=[d.hisRating,d.herRating].filter((n):n is number=>n!=null);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;}
/** First completion can record both people on one phone. The database consumes this grant once. */
export async function initializeExperiences(client:NeonQueryFunction<false,false>,who:{coupleId:string;userId:string},id:string,d:ExperienceInput){
 const results=await client.transaction(tx=>[tx`select id from sessions where id=${id} and couple_id=${who.coupleId} for update`,tx`with initial as (
 update sessions s set experiences_initialized=true,rating=${averageHeat(d)},his_orgasms=${d.hisOrgasms},her_orgasms=${d.herOrgasms},updated_at=now()
 where s.id=${id} and s.couple_id=${who.coupleId} and s.status='done' and not s.experiences_initialized
 and exists(select 1 from profiles where user_id=${who.userId} and couple_id=s.couple_id) returning s.id,s.couple_id
 ) insert into session_feelings(session_id,user_id,feeling,rating,highlight,repeat_choice)
 select i.id,p.user_id,case when p.sex='male' then ${d.hisNotes} else ${d.herNotes} end,
 case when p.sex='male' then ${d.hisRating}::smallint else ${d.herRating}::smallint end,'',null
 from initial i join profiles p on p.couple_id=i.couple_id where p.sex in ('male','female') on conflict(session_id,user_id) do update set feeling=excluded.feeling,rating=excluded.rating,highlight='',repeat_choice=null,updated_at=now() returning session_id`]);return results[1].length>0;
}
/** Personal changes and their version-bound shared proposal commit together. */
export async function submitSessionChanges(client:NeonQueryFunction<false,false>,who:{coupleId:string;userId:string;partnerId:string},id:string,version:string,d:ExperienceInput,proposal:Record<string,unknown>|null,replaceShared=proposal!==null,expectedPending?:{id:string;proposed:Record<string,unknown>}|null){
 const rows=await client.transaction(tx=>[tx`select id from sessions where id=${id} and couple_id=${who.coupleId} for update`,tx`
 with eligible as materialized (
 select s.*,p.sex from sessions s join profiles p on p.user_id=${who.userId} and p.couple_id=s.couple_id
 join profiles partner on partner.user_id=${who.partnerId} and partner.couple_id=s.couple_id
 where s.id=${id} and s.couple_id=${who.coupleId} and s.status='done'
 and date_trunc('milliseconds',s.updated_at)=date_trunc('milliseconds',${version}::timestamptz)
 and exists(select 1 from couples c where c.id=s.couple_id and c.unpaired_at is null)
 and (not ${expectedPending!==undefined} or coalesce((select jsonb_build_object('id',r.id,'proposed',r.proposed) from session_edit_requests r where r.session_id=s.id),'null'::jsonb)=${JSON.stringify(expectedPending??null)}::jsonb)
 ), personal as (
 insert into session_feelings(session_id,user_id,feeling,rating,highlight,repeat_choice)
 select id,${who.userId},case when sex='male' then ${d.hisNotes} else ${d.herNotes} end,
 case when sex='male' then ${d.hisRating}::smallint else ${d.herRating}::smallint end,'',null from eligible
 on conflict(session_id,user_id) do update set feeling=excluded.feeling,rating=excluded.rating,highlight='',updated_at=now() returning session_id
 ), updated as (
 update sessions s set his_orgasms=case when e.sex='male' then ${d.hisOrgasms} else s.his_orgasms end,
 her_orgasms=case when e.sex='female' then ${d.herOrgasms} else s.her_orgasms end,
 rating=(select round(avg(v),1) from (select f.rating::numeric as v from session_feelings f where f.session_id=s.id and f.user_id<>${who.userId}
 union all select case when e.sex='male' then ${d.hisRating}::numeric else ${d.herRating}::numeric end) ratings),updated_at=now()
 from eligible e where s.id=e.id and exists(select 1 from personal) returning s.*
 ), kept as (
 update session_edit_requests r set session_version=u.updated_at from updated u
 where r.session_id=u.id and not ${replaceShared}
 and exists(select 1 from eligible e where e.id=r.session_id
   and date_trunc('milliseconds',r.session_version)=date_trunc('milliseconds',e.updated_at))
 ), removed as (
 delete from session_edit_requests r using updated u where r.session_id=u.id
 and ${replaceShared} and ${proposal===null}
 ), proposed as (
 insert into session_edit_requests(couple_id,session_id,requested_by,recipient_id,session_version,proposed)
 select couple_id,id,${who.userId},${who.partnerId},updated_at,${JSON.stringify(proposal)}::jsonb from updated where ${proposal!==null} and ${replaceShared}
 on conflict(session_id) do update set proposed=excluded.proposed,session_version=excluded.session_version,
 requested_by=excluded.requested_by,recipient_id=excluded.recipient_id
 ) select id from updated`]);return rows[1].length>0;
}
