import type {NeonQueryFunction} from '@neondatabase/serverless';
import {activityDetails} from './activity-details.ts';

/** Completion preserves the activity chosen at start, together with its captured location. */
export async function completeRecording(client:NeonQueryFunction<false,false>,who:{coupleId:string;isHer:boolean},id:string,d:{
  place?:string|null;protection?:string|null;hisOrgasms?:number|null;herOrgasms?:number|null;tags?:string[];
}) {
  const rows=await client`update sessions set
    status='done',ended_at=coalesce(paused_at,now()),
    duration_sec=greatest(0,extract(epoch from coalesce(paused_at,now())-started_at)::int-paused_sec),paused_at=null,
    breaks=coalesce((select jsonb_agg(b) from jsonb_array_elements(breaks) b where b->>'end' is not null),'[]'::jsonb),
    place=coalesce(${d.place||null},place),protection=case when kind='oral' then null else ${d.protection??null} end,
    his_orgasms=case when ${!who.isHer} then ${d.hisOrgasms??null} else his_orgasms end,
    her_orgasms=case when ${who.isHer} then ${d.herOrgasms??null} else her_orgasms end,
    tags=case when kind='oral' then ${activityDetails('oral',d).tags}::text[] else ${activityDetails('intercourse',d).tags}::text[] end,updated_at=now()
    where id=${id} and couple_id=${who.coupleId} and status='active' returning id`;
  return rows.length>0;
}
