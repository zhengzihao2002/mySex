import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getAuth } from './auth/server';
import { sql } from './db';
import type { Couple, CoupleContext, DailyLog, LoveNote, Period, Profile, SexSession } from './types';

type Row = Record<string, any>;

const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));

function toProfile(r: Row): Profile {
  return {
    userId: r.user_id,
    name: r.name,
    sex: r.sex,
    inviteCode: r.invite_code,
    coupleId: r.couple_id,
    avatar: r.avatar,
    cycleLengthDefault: Number(r.cycle_length_default),
    periodLengthDefault: Number(r.period_length_default),
    adultConsentAt: iso(r.adult_consent_at),
  };
}

export function toSession(r: Row): SexSession {
  return {
    id: r.id,
    kind: r.kind === 'oral' ? 'oral' : 'intercourse',
    createdBy: r.created_by,
    status: r.status,
    startedAt: iso(r.started_at)!,
    endedAt: iso(r.ended_at),
    pausedAt: iso(r.paused_at),
    pausedSec: Number(r.paused_sec ?? 0),
    durationSec: r.duration_sec,
    ip: r.ip,
    city: r.city,
    region: r.region,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
    geoSource: r.geo_source,
    place: r.place,
    rating: r.rating,
    protection: r.protection,
    hisOrgasms: r.his_orgasms,
    herOrgasms: r.her_orgasms,
    tags: r.tags ?? [],
    notes: r.notes,
    updatedAt: iso(r.updated_at) ?? iso(r.created_at)!,
    breaks: Array.isArray(r.breaks) ? r.breaks : [],
  };
}

/** Signed-in user + their profile (if onboarding has started). Cached per request. */
export const getViewer = cache(async () => {
  const { data } = await getAuth().getSession();
  const user = data?.user;
  if (!user) return null;
  const rows = await sql`select * from profiles where user_id = ${user.id}`;
  return {
    user: { id: user.id, email: user.email, name: user.name },
    profile: rows[0] ? toProfile(rows[0]) : null,
  };
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect('/auth/sign-in');
  return viewer;
}

/** Loads me + partner + couple, or returns null if not paired. */
export const getCoupleContext = cache(async (): Promise<CoupleContext | null> => {
  const viewer = await getViewer();
  const me = viewer?.profile;
  if (!me?.coupleId) return null;
  const rows = await sql`
    select c.id, c.male_id, c.female_id, c.anniversary::text as anniversary, c.created_at,
           to_jsonb(p.*) as partner
    from couples c
    join profiles p on p.couple_id = c.id and p.user_id <> ${me.userId}
    where c.id = ${me.coupleId}`;
  const r = rows[0];
  if (!r) return null;
  const couple: Couple = {
    id: r.id,
    maleId: r.male_id,
    femaleId: r.female_id,
    anniversary: r.anniversary,
    createdAt: iso(r.created_at)!,
  };
  const partner = toProfile(r.partner);
  return {
    me,
    partner,
    couple,
    her: me.sex === 'female' ? me : partner,
    him: me.sex === 'male' ? me : partner,
  };
});

/** For pages inside the app: guarantees a signed-in, onboarded, paired user. */
export async function requireCouple(): Promise<CoupleContext> {
  const viewer = await requireViewer();
  if (!viewer.profile?.sex || !viewer.profile.adultConsentAt) redirect('/onboarding');
  const ctx = await getCoupleContext();
  if (!ctx) redirect('/pair');
  return ctx;
}

export async function getSessions(coupleId: string): Promise<SexSession[]> {
  const rows = await sql`select * from sessions where couple_id = ${coupleId} order by started_at desc`;
  return rows.map(toSession);
}

export async function getActiveSession(coupleId: string): Promise<SexSession | null> {
  const rows = await sql`select * from sessions where couple_id = ${coupleId} and status = 'active' limit 1`;
  return rows[0] ? toSession(rows[0]) : null;
}

/** Her cycle history belongs to her, so predictions carry over across partners. */
export async function getPeriods(herUserId: string): Promise<Period[]> {
  const rows = await sql`
    select id, start_date::text as start, end_date::text as "end"
    from periods where user_id = ${herUserId} order by start_date`;
  return rows.map((r) => ({ id: r.id, start: r.start, end: r.end }));
}

/** All of my check-ins, but only the partner's check-ins made while paired with me. */
export async function getDailyLogs(ctx: CoupleContext, since?: string): Promise<DailyLog[]> {
  const rows = await sql`
    select user_id, log_date::text as date, mood, energy, libido, flow, symptoms, note
    from daily_logs
    where (user_id = ${ctx.me.userId} or (user_id = ${ctx.partner.userId} and couple_id = ${ctx.couple.id}))
      and (${since ?? null}::date is null or log_date >= ${since ?? null}::date)
    order by log_date`;
  return rows.map((r) => ({
    userId: r.user_id,
    date: r.date,
    mood: r.mood,
    energy: r.energy,
    libido: r.libido,
    flow: r.flow,
    symptoms: r.symptoms ?? [],
    note: r.note,
  }));
}

export async function getNotes(coupleId: string, limit = 100): Promise<LoveNote[]> {
  const rows = await sql`
    select id, from_user, body, kind, read_at, created_at, edited_at from love_notes
    where couple_id = ${coupleId} order by created_at desc limit ${limit}`;
  return rows.map((r) => ({
    id: r.id,
    fromUser: r.from_user,
    body: r.body,
    kind: r.kind,
    readAt: iso(r.read_at),
    createdAt: iso(r.created_at)!,
    editedAt: iso(r.edited_at),
  }));
}

export async function getUnreadCount(coupleId: string, userId: string): Promise<number> {
  const rows = await sql`
    select count(*)::int as n from love_notes
    where couple_id = ${coupleId} and from_user <> ${userId} and read_at is null`;
  return rows[0]?.n ?? 0;
}

export async function getDesires(userIds: string[]) {
  const rows = await sql`select user_id, item, answer from desires where user_id = any(${userIds})`;
  return rows as { user_id: string; item: string; answer: 'yes' | 'maybe' | 'no' }[];
}

export type PastPartner = {
  coupleId: string;
  name: string;
  avatar: string;
  sessions: number;
  periods: number;
  notes: number;
  lastSession: string | null;
  unpairedAt: string | null;
};

/** Couples this user was part of — their history stays saved for when they reconnect. */
export async function getPastPartners(userId: string): Promise<PastPartner[]> {
  const rows = await sql`
    select c.id, c.unpaired_at, p.name, p.avatar,
      (select count(*)::int from sessions s where s.couple_id = c.id and s.status = 'done') as sessions,
      (select count(*)::int from periods pe where pe.couple_id = c.id) as periods,
      (select count(*)::int from love_notes n where n.couple_id = c.id) as notes,
      (select max(started_at) from sessions s where s.couple_id = c.id) as last_session
    from couples c
    join profiles p on p.user_id = case when c.male_id = ${userId} then c.female_id else c.male_id end
    where (c.male_id = ${userId} or c.female_id = ${userId}) and c.unpaired_at is not null
    order by c.unpaired_at desc`;
  return rows.map((r) => ({
    coupleId: r.id,
    name: r.name,
    avatar: r.avatar,
    sessions: r.sessions,
    periods: r.periods,
    notes: r.notes,
    lastSession: iso(r.last_session),
    unpairedAt: iso(r.unpaired_at),
  }));
}

export async function hasCoupleHistory(userId: string) {
  const rows = await sql`select 1 from couples where male_id = ${userId} or female_id = ${userId} limit 1`;
  return rows.length > 0;
}
