import type { NeonQueryFunction } from '@neondatabase/serverless';
import type { SexSession } from './types';
type Details = Partial<Pick<SexSession,'kind'|'place'|'rating'|'protection'|'hisOrgasms'|'herOrgasms'|'tags'|'notes'>> & { startedAt:string; durationMin:number; breakMin?:number; version:string };
export async function editSharedSession(client: NeonQueryFunction<false,false>, who: {coupleId:string;userId:string;partnerId:string}, id:string, d:Details) {
  const dur = Math.round(d.durationMin * 60);
  const brk = Math.round((d.breakMin ?? 0) * 60);
  const rows = await client`
    with edited as (update sessions set
      kind = coalesce(${d.kind ?? null}, kind),
      started_at = ${d.startedAt}, duration_sec = ${dur},
      ended_at = ${d.startedAt}::timestamptz + make_interval(secs => ${dur + brk}),
      -- Keep the individual breaks only if the break total wasn't changed by hand.
      breaks = case when paused_sec = ${brk} then breaks else '[]'::jsonb end,
      paused_sec = ${brk},
      place = ${d.place || null}, rating = ${d.rating ?? null}, protection = ${d.protection ?? null},
      his_orgasms = ${d.hisOrgasms ?? null}, her_orgasms = ${d.herOrgasms ?? null},
      tags = ${d.tags ?? []}, notes = ${d.notes || null}, updated_at = now()
    where id = ${id} and couple_id = ${who.coupleId} and status = 'done'
      and date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', ${d.version}::timestamptz)
    returning id)
    insert into session_edit_notices(couple_id, session_id, edited_by, recipient_id)
    select ${who.coupleId}, id, ${who.userId}, ${who.partnerId} from edited returning id`;
  return rows.length > 0;
}
