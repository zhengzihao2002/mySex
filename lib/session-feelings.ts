import type {NeonQueryFunction} from '@neondatabase/serverless';
export type SessionFeeling={userId:string;name:string;feeling:string;rating:number|null;highlight:string;repeatChoice:'yes'|'maybe'|'no'|null};
export async function storeSessionFeeling(client:NeonQueryFunction<false,false>,who:{coupleId:string;userId:string},id:string,d:Omit<SessionFeeling,'userId'|'name'>){
 const rows=await client`with saved as (insert into session_feelings(session_id,user_id,feeling,rating,highlight,repeat_choice)
 select s.id,${who.userId},${d.feeling},${d.rating},${d.highlight},${d.repeatChoice} from sessions s
 join profiles p on p.user_id=${who.userId} and p.couple_id=s.couple_id
 where s.id=${id} and s.couple_id=${who.coupleId} and s.status='done'
 on conflict(session_id,user_id) do update set feeling=excluded.feeling,rating=excluded.rating,highlight=excluded.highlight,repeat_choice=excluded.repeat_choice,updated_at=now() returning session_id)
 update sessions set updated_at=now() where id in (select session_id from saved) returning id`;
 return rows.length>0;
}
