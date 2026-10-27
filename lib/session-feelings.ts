import type {NeonQueryFunction} from '@neondatabase/serverless';
export type SessionFeeling={userId:string;name:string;feeling:string;rating:number|null;highlight:string;repeatChoice:'yes'|'maybe'|'no'|null};
export async function storeSessionFeeling(client:NeonQueryFunction<false,false>,who:{coupleId:string;userId:string},id:string,d:Omit<SessionFeeling,'userId'|'name'> & {orgasms?:number|null}){
 const results=await client.transaction(tx=>[tx`select id from sessions where id=${id} and couple_id=${who.coupleId} for update`,tx`with saved as (insert into session_feelings(session_id,user_id,feeling,rating,highlight,repeat_choice)
 select s.id,${who.userId},${d.feeling},${d.rating},${d.highlight},${d.repeatChoice} from sessions s
 join profiles p on p.user_id=${who.userId} and p.couple_id=s.couple_id
 where s.id=${id} and s.couple_id=${who.coupleId} and s.status='done'
 on conflict(session_id,user_id) do update set feeling=excluded.feeling,rating=excluded.rating,highlight=excluded.highlight,repeat_choice=excluded.repeat_choice,updated_at=now() returning session_id)
 update sessions set rating=(select round(avg(v),1) from (
 select f.rating::numeric as v from session_feelings f where f.session_id=${id} and f.user_id<>${who.userId}
 union all select ${d.rating}::numeric) ratings),
 his_orgasms=case when (select sex from profiles where user_id=${who.userId})='male' and ${d.orgasms !== undefined} then ${d.orgasms ?? null} else his_orgasms end,
 her_orgasms=case when (select sex from profiles where user_id=${who.userId})='female' and ${d.orgasms !== undefined} then ${d.orgasms ?? null} else her_orgasms end,
 updated_at=now() where id in (select session_id from saved) returning id`]);
 return results[1].length>0;
}
