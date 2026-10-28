import type { NeonQueryFunction } from '@neondatabase/serverless';

type Client = NeonQueryFunction<false, false>;
type Participants = { coupleId: string; userId: string; partnerId: string };

/** Lock the session before touching requests, matching approval's lock order. */
export async function requestSessionDeletion(
  client: Client, who: Participants, sessionId: string, version: string,
): Promise<boolean> {
  const { coupleId, userId, partnerId } = who;
  const results = await client.transaction((tx) => [
    tx`select id from sessions where id = ${sessionId} and couple_id = ${coupleId} for update`,
    // Editing invalidates earlier consent. Keep only an unread outcome, not the handled request.
    tx`with removed as (
       delete from session_deletion_requests r using sessions s
       where r.session_id = s.id and s.id = ${sessionId} and s.couple_id = ${coupleId}
         and r.couple_id = ${coupleId} and r.status = 'pending' and r.session_version <> s.updated_at
       returning r.*)
       insert into session_deletion_outcomes(id,couple_id,session_id,requested_by,recipient_id,session_started_at,session_kind,status)
       select id,couple_id,session_id,requested_by,requested_by,session_started_at,session_kind,'expired' from removed`,
    tx`insert into session_deletion_requests
         (couple_id, session_id, requested_by, recipient_id, session_version, session_started_at, session_kind)
       select s.couple_id, s.id, ${userId}, ${partnerId}, s.updated_at, s.started_at, s.kind
       from sessions s
       where s.id = ${sessionId} and s.couple_id = ${coupleId}
         and s.status = 'done'
         and date_trunc('milliseconds', s.updated_at) = date_trunc('milliseconds', ${version}::timestamptz)
         and exists (
           select 1 from couples c
           join profiles me on me.user_id = ${userId} and me.couple_id = c.id
           join profiles partner on partner.user_id = ${partnerId} and partner.couple_id = c.id
           where c.id = s.couple_id and c.unpaired_at is null
             and ((c.male_id = me.user_id and c.female_id = partner.user_id)
               or (c.female_id = me.user_id and c.male_id = partner.user_id)))
       on conflict (session_id) where status = 'pending' do nothing`,
    // Repeated clicks (including one from the recipient) never count as an approval.
    tx`select r.id from session_deletion_requests r join sessions s on s.id = r.session_id
       where r.session_id = ${sessionId} and r.couple_id = ${coupleId} and r.status = 'pending'
         and (r.requested_by = ${userId} or r.recipient_id = ${userId})
         and date_trunc('milliseconds', s.updated_at) = date_trunc('milliseconds', ${version}::timestamptz)`,
  ]);
  return results[results.length - 1].length > 0;
}

/** Decision and deletion commit together. Concurrent edits serialize on the session row. */
export async function respondToSessionDeletion(
  client: Client, who: Participants, requestId: string, decision: 'approved' | 'declined',
): Promise<string | null> {
  const { coupleId, userId, partnerId } = who;
  const results = await client.transaction((tx) => [
    tx`select s.id from sessions s join session_deletion_requests r on r.session_id = s.id
       where r.id = ${requestId} and r.couple_id = ${coupleId} and s.couple_id = ${coupleId}
         and r.recipient_id = ${userId} and r.requested_by = ${partnerId}
       for update of s`,
    tx`with eligible as (
         select r.id, s.updated_at from session_deletion_requests r
         join sessions s on s.id = r.session_id and s.couple_id = r.couple_id
         join couples c on c.id = r.couple_id
         join profiles me on me.user_id = ${userId} and me.couple_id = c.id
         join profiles partner on partner.user_id = ${partnerId} and partner.couple_id = c.id
         where r.id = ${requestId} and r.couple_id = ${coupleId} and r.status = 'pending'
             and r.recipient_id = ${userId} and r.requested_by = ${partnerId}
           and r.requested_by <> ${userId} and c.unpaired_at is null
           and r.created_at > now() - interval '7 days'
           and ((c.male_id = me.user_id and c.female_id = partner.user_id)
             or (c.female_id = me.user_id and c.male_id = partner.user_id))
         for update of r
       ), resolved as (
         delete from session_deletion_requests r using eligible e where r.id = e.id
         returning r.*, case when ${decision} = 'declined' then 'declined'
                           when r.session_version <> e.updated_at then 'expired' else 'approved' end as outcome
       ), notified as (
         insert into session_deletion_outcomes(id,couple_id,session_id,requested_by,recipient_id,session_started_at,session_kind,status)
         select id,couple_id,session_id,requested_by,requested_by,session_started_at,session_kind,outcome from resolved
       ), deleted as (
         delete from sessions s using resolved r
         where r.outcome = 'approved' and s.id = r.session_id and s.couple_id = ${coupleId}
           and s.updated_at = r.session_version
         returning s.id
       ), marked as (
         insert into deleted_session_markers(key_hash)
         select encode(sha256(convert_to(${coupleId} || ':' || id::text, 'UTF8')), 'hex') from deleted
         on conflict do nothing
       )
       select r.outcome as status, (select count(*) from deleted) as deleted_count from resolved r`,
  ]);
  return results[1][0]?.status ?? null;
}

/** Active timers are drafts. A concurrent finish must never be deleted by this path. */
export async function discardDraft(client: Client, coupleId: string, sessionId: string): Promise<boolean> {
  const results = await client.transaction((tx) => [
    tx`delete from sessions where id = ${sessionId} and couple_id = ${coupleId} and status = 'active' returning id`,
    tx`delete from session_deletion_requests where session_id = ${sessionId} and couple_id = ${coupleId}
       and not exists (select 1 from sessions where id = ${sessionId})`,
  ]);
  return results[0].length > 0;
}

export async function withdrawDeletion(client: Client, coupleId: string, userId: string, id: string) {
  const rows = await client`with removed as (
    delete from session_deletion_requests where id = ${id} and couple_id = ${coupleId}
      and requested_by = ${userId} and status = 'pending' and created_at > now() - interval '7 days' returning *
  ) insert into session_deletion_outcomes(id,couple_id,session_id,requested_by,recipient_id,session_started_at,session_kind,status)
    select id,couple_id,session_id,requested_by,recipient_id,session_started_at,session_kind,'cancelled' from removed returning id`;
  return rows.length > 0;
}
export async function dismissOutcome(client: Client, coupleId: string, userId: string, id: string) {
  await client`delete from session_deletion_outcomes where id = ${id} and couple_id = ${coupleId} and recipient_id = ${userId}`;
}
export async function dismissEditNotice(client: Client, coupleId: string, userId: string, id: string) {
  await client`delete from session_edit_notices where id = ${id} and couple_id = ${coupleId} and recipient_id = ${userId}`;
}
