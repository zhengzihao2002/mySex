import type { NeonQueryFunction } from '@neondatabase/serverless';
import type { SexSession } from './types';

type Client = NeonQueryFunction<false, false>;
type Participants = { coupleId: string; userId: string; partnerId: string };
export type EditProposal = Partial<Pick<SexSession, 'kind' | 'place' | 'rating' | 'protection' | 'hisOrgasms' | 'herOrgasms' | 'tags' | 'notes'>> & {
  startedAt: string; durationMin: number; breakMin?: number;
};

/** Park an edit until the partner agrees. Returns false if the record changed or the partner's own edit is pending. */
export async function requestSessionEdit(client: Client, who: Participants, id: string, version: string, p: EditProposal): Promise<boolean> {
  const { coupleId, userId, partnerId } = who;
  const proposed = JSON.stringify({
    kind: p.kind ?? null, startedAt: p.startedAt, durationMin: p.durationMin, breakMin: p.breakMin ?? 0,
    place: p.place || null, rating: p.rating ?? null, protection: p.protection ?? null,
    hisOrgasms: p.hisOrgasms ?? null, herOrgasms: p.herOrgasms ?? null, tags: p.tags ?? [], notes: p.notes || null,
  });
  const results = await client.transaction((tx) => [
    tx`select id from sessions where id = ${id} and couple_id = ${coupleId} for update`,
    // An older pending edit that no longer matches the record is outdated: tell its author.
    tx`with removed as (
         delete from session_edit_requests r using sessions s
         where r.session_id = s.id and s.id = ${id} and r.couple_id = ${coupleId} and r.session_version <> s.updated_at
         returning r.*)
       insert into session_edit_outcomes(couple_id,session_id,requested_by,recipient_id,session_started_at,session_kind,status)
       select r.couple_id, r.session_id, r.requested_by, r.requested_by, s.started_at, s.kind, 'expired'
       from removed r join sessions s on s.id = r.session_id`,
    tx`insert into session_edit_requests(couple_id,session_id,requested_by,recipient_id,session_version,proposed)
       select s.couple_id, s.id, ${userId}, ${partnerId}, s.updated_at, ${proposed}::jsonb
       from sessions s
       where s.id = ${id} and s.couple_id = ${coupleId} and s.status = 'done'
         and date_trunc('milliseconds', s.updated_at) = date_trunc('milliseconds', ${version}::timestamptz)
         and exists (
           select 1 from couples c
           join profiles me on me.user_id = ${userId} and me.couple_id = c.id
           join profiles partner on partner.user_id = ${partnerId} and partner.couple_id = c.id
           where c.id = s.couple_id and c.unpaired_at is null
             and ((c.male_id = me.user_id and c.female_id = partner.user_id)
               or (c.female_id = me.user_id and c.male_id = partner.user_id)))
       on conflict (session_id) do update
         set proposed = excluded.proposed, session_version = excluded.session_version, created_at = now()
         where session_edit_requests.requested_by = excluded.requested_by`,
    tx`select id from session_edit_requests where session_id = ${id} and couple_id = ${coupleId}
       and requested_by = ${userId} and proposed = ${proposed}::jsonb`,
  ]);
  return results[results.length - 1].length > 0;
}

/** Approve applies the edit in the same statement that answers it; a changed record only closes the request. */
export async function respondToSessionEdit(client: Client, who: Participants, requestId: string, decision: 'approved' | 'declined'): Promise<string | null> {
  const { coupleId, userId, partnerId } = who;
  const results = await client.transaction((tx) => [
    tx`select s.id from sessions s join session_edit_requests r on r.session_id = s.id
       where r.id = ${requestId} and r.couple_id = ${coupleId} and r.recipient_id = ${userId} and r.requested_by = ${partnerId}
       for update of s`,
    tx`with eligible as (
         select r.id, s.updated_at from session_edit_requests r
         join sessions s on s.id = r.session_id and s.couple_id = r.couple_id
         join couples c on c.id = r.couple_id
         where r.id = ${requestId} and r.couple_id = ${coupleId} and r.recipient_id = ${userId}
           and r.requested_by = ${partnerId} and c.unpaired_at is null
         for update of r
       ), resolved as (
         delete from session_edit_requests r using eligible e where r.id = e.id
         returning r.*, case when ${decision} = 'declined' then 'declined'
                             when date_trunc('milliseconds', r.session_version) <> date_trunc('milliseconds', e.updated_at) then 'expired'
                             else 'approved' end as outcome
       ), updated as (
         update sessions s set
           kind = coalesce(r.proposed->>'kind', s.kind),
           started_at = (r.proposed->>'startedAt')::timestamptz,
           duration_sec = round((r.proposed->>'durationMin')::numeric * 60),
           paused_sec = round((r.proposed->>'breakMin')::numeric * 60),
           ended_at = (r.proposed->>'startedAt')::timestamptz
             + make_interval(secs => round((r.proposed->>'durationMin')::numeric * 60) + round((r.proposed->>'breakMin')::numeric * 60)),
           breaks = case when s.paused_sec = round((r.proposed->>'breakMin')::numeric * 60) then s.breaks else '[]'::jsonb end,
           place = nullif(r.proposed->>'place', ''),
           rating = (r.proposed->>'rating')::int, protection = r.proposed->>'protection',
           his_orgasms = (r.proposed->>'hisOrgasms')::int, her_orgasms = (r.proposed->>'herOrgasms')::int,
           tags = coalesce(array(select jsonb_array_elements_text(r.proposed->'tags')), '{}'),
           notes = nullif(r.proposed->>'notes', ''), updated_at = now()
         from resolved r where r.outcome = 'approved' and s.id = r.session_id and s.couple_id = ${coupleId}
         returning s.id
       ), notified as (
         insert into session_edit_outcomes(couple_id,session_id,requested_by,recipient_id,session_started_at,session_kind,status)
         select r.couple_id, r.session_id, r.requested_by, r.requested_by, s.started_at, s.kind, r.outcome
         from resolved r join sessions s on s.id = r.session_id
       )
       select outcome as status from resolved`,
  ]);
  return results[1][0]?.status ?? null;
}

export async function withdrawSessionEdit(client: Client, coupleId: string, userId: string, id: string): Promise<boolean> {
  const rows = await client`delete from session_edit_requests where id = ${id} and couple_id = ${coupleId} and requested_by = ${userId} returning id`;
  return rows.length > 0;
}

export async function dismissEditOutcome(client: Client, coupleId: string, userId: string, id: string) {
  await client`delete from session_edit_outcomes where id = ${id} and couple_id = ${coupleId} and recipient_id = ${userId}`;
}
