import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { NeonQueryFunction } from '@neondatabase/serverless';

const timestamp = z.iso.datetime({ offset: true });
const text = z.string().max(2000).nullable();
const date = z.iso.date();
const session = z.object({
  id: z.uuid(), createdBy: z.string(), kind: z.enum(['intercourse', 'oral']), status: z.enum(['active', 'done']),
  startedAt: timestamp, endedAt: timestamp.nullable(), pausedAt: timestamp.nullable(),
  pausedSec: z.number().int().nonnegative(), durationSec: z.number().int().nonnegative().nullable(),
  ip: text, city: text, region: text, country: text, latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(), geoSource: z.enum(['ip', 'gps']).nullable(), gpsNamedAt: timestamp.nullable().optional(),
  place: text, rating: z.number().int().min(1).max(5).nullable(), protection: text,
  hisOrgasms: z.number().int().min(0).max(20).nullable(), herOrgasms: z.number().int().min(0).max(20).nullable(),
  tags: z.array(z.string().max(30)).max(20), notes: text, updatedAt: timestamp,
  breaks: z.array(z.object({ start: timestamp, end: timestamp.nullable() })).max(10000),
});
const backupSchema = z.object({
  format: z.literal('mysex-backup-v2'), coupleId: z.uuid(), ownerId: z.string(), exportedAt: timestamp,
  sessions: z.array(session).max(20000),
  periods: z.array(z.object({ id: z.uuid(), start: date, end: date.nullable() }).refine(p => !p.end || p.end >= p.start)).max(20000),
  checkIns: z.array(z.object({ userId: z.string(), date, mood: text, energy: z.number().int().min(1).max(5).nullable(),
    libido: z.number().int().min(1).max(5).nullable(), flow: z.enum(['spotting', 'light', 'medium', 'heavy']).nullable(),
    symptoms: z.array(z.string().max(100)).max(100), note: text })).max(20000),
  notes: z.array(z.object({ id: z.uuid(), fromUser: z.string(), body: z.string().min(1).max(1000),
    kind: z.enum(['note', 'wish', 'tease']), readAt: timestamp.nullable(), createdAt: timestamp, editedAt: timestamp.nullable() })).max(20000),
});
export type Backup = z.infer<typeof backupSchema>;
export type RestoreCounts = { sessions: number; periods: number; checkIns: number; notes: number; skipped: number };
export type RestoreActor = { coupleId: string; userId: string; partnerId: string; isHer: boolean };
export const MAX_BACKUP_BYTES = 3 * 1024 * 1024;
export function signBackup(payload: Record<string, unknown>, secret: string) {
  return createHmac('sha256', secret).update('mysex-backup-v2\n' + JSON.stringify(payload)).digest('hex');
}
export function verifyBackup(input: unknown, secret: string, who: RestoreActor): Backup {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid backup file.');
  const { signature, ...payload } = input as Record<string, unknown>;
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) throw new Error('This export cannot be restored. Download a new backup from Settings.');
  if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(signBackup(payload, secret), 'hex'))) throw new Error('Backup verification failed. Use the original, unedited export.');
  const parsed = backupSchema.safeParse(payload);
  if (!parsed.success) throw new Error('Invalid backup file.');
  const b = parsed.data;
  if (b.coupleId !== who.coupleId || b.ownerId !== who.userId) throw new Error('Use a backup exported by you for your current partnership.');
  if (b.sessions.some(s => s.createdBy !== who.userId && s.createdBy !== who.partnerId)) throw new Error('Invalid backup file.');
  return b;
}

/** Preview and import share the same selection rules. All writes are atomic and never overwrite. */
export async function restoreBackup(client: NeonQueryFunction<false, false>, b: Backup, who: RestoreActor, apply: boolean): Promise<RestoreCounts> {
  const sessions = b.sessions.filter(s => s.status === 'done').map(s => ({
    id: s.id, couple_id: who.coupleId, created_by: s.createdBy, status: 'done', kind: s.kind,
    started_at: s.startedAt, ended_at: s.endedAt, paused_sec: s.pausedSec, duration_sec: s.durationSec,
    ip: s.ip, city: s.city, region: s.region, country: s.country, latitude: s.latitude, longitude: s.longitude,
    geo_source: s.geoSource, gps_named_at: s.gpsNamedAt ?? null, place: s.place, rating: s.rating, protection: s.protection,
    his_orgasms: s.hisOrgasms, her_orgasms: s.herOrgasms, tags: s.tags, notes: s.notes, breaks: s.breaks,
  }));
  const periods = who.isHer ? b.periods : [];
  const logs = b.checkIns.filter(l => l.userId === who.userId);
  const notes = b.notes.filter(n => n.fromUser === who.userId);
  const results = await client.transaction(tx => [
    // Same record IDs on repeated imports cannot duplicate data. Lock membership for the transaction.
    tx`select user_id from profiles where user_id in (${who.userId}, ${who.partnerId}) order by user_id for share`,
    tx`with allowed as (
      select c.id from couples c join profiles a on a.user_id = ${who.userId} and a.couple_id = c.id
      join profiles p on p.user_id = ${who.partnerId} and p.couple_id = c.id
      where c.id = ${who.coupleId} and c.unpaired_at is null
    ), candidates as (
      select distinct on (s.id) s.* from jsonb_populate_recordset(null::sessions, ${JSON.stringify(sessions)}::jsonb) s
      where exists(select 1 from allowed) and not exists(select 1 from sessions x where x.id = s.id)
      and not exists(select 1 from deleted_session_markers m where m.key_hash = encode(sha256(convert_to(${who.coupleId} || ':' || s.id::text, 'UTF8')), 'hex'))
    ), added as (
      insert into sessions(id,couple_id,created_by,status,kind,started_at,ended_at,paused_sec,duration_sec,ip,city,region,country,latitude,longitude,geo_source,gps_named_at,place,rating,protection,his_orgasms,her_orgasms,tags,notes,breaks)
      select id,couple_id,created_by,status,kind,started_at,ended_at,paused_sec,duration_sec,ip,city,region,country,latitude,longitude,geo_source,gps_named_at,place,rating,protection,his_orgasms,her_orgasms,tags,notes,breaks
      from candidates where ${apply} on conflict do nothing returning id
    ) select case when ${apply} then (select count(*) from added) else (select count(*) from candidates) end as n`,
    tx`with candidates as (
      select distinct on (p.start) p.* from jsonb_to_recordset(${JSON.stringify(periods)}::jsonb) p(id uuid, start date, "end" date)
      where not exists(select 1 from periods x where x.id = p.id or (x.user_id = ${who.userId} and x.start_date = p.start))
      and exists(select 1 from profiles where user_id = ${who.userId} and couple_id = ${who.coupleId} and sex = 'female')
    ), added as (
      insert into periods(id,couple_id,user_id,start_date,end_date) select id,${who.coupleId},${who.userId},start,"end" from candidates where ${apply} on conflict do nothing returning id
    ) select case when ${apply} then (select count(*) from added) else (select count(*) from candidates) end as n`,
    tx`with candidates as (
      select distinct on (l.date) l.* from jsonb_to_recordset(${JSON.stringify(logs)}::jsonb) l(date date,mood text,energy smallint,libido smallint,flow text,symptoms text[],note text)
      where not exists(select 1 from daily_logs x where x.user_id = ${who.userId} and x.log_date = l.date)
      and exists(select 1 from profiles where user_id = ${who.userId} and couple_id = ${who.coupleId})
    ), added as (
      insert into daily_logs(user_id,couple_id,log_date,mood,energy,libido,flow,symptoms,note)
      select ${who.userId},${who.coupleId},date,mood,energy,libido,flow,symptoms,note from candidates where ${apply} on conflict do nothing returning log_date
    ) select case when ${apply} then (select count(*) from added) else (select count(*) from candidates) end as n`,
    tx`with candidates as (
      select distinct on (n.id) n.* from jsonb_to_recordset(${JSON.stringify(notes)}::jsonb) n(id uuid,body text,kind text,"readAt" timestamptz,"createdAt" timestamptz,"editedAt" timestamptz)
      where not exists(select 1 from love_notes x where x.id = n.id)
      and exists(select 1 from profiles where user_id = ${who.userId} and couple_id = ${who.coupleId})
    ), added as (
      insert into love_notes(id,couple_id,from_user,body,kind,read_at,created_at,edited_at)
      select id,${who.coupleId},${who.userId},body,kind,"readAt","createdAt","editedAt" from candidates where ${apply} on conflict do nothing returning id
    ) select case when ${apply} then (select count(*) from added) else (select count(*) from candidates) end as n`,
  ]);
  const [s,p,l,n] = results.slice(1).map(r => Number(r[0].n));
  return { sessions:s, periods:p, checkIns:l, notes:n, skipped:b.sessions.length+b.periods.length+b.checkIns.length+b.notes.length-s-p-l-n };
}
