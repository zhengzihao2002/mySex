'use server';

import { randomInt, timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getAuth } from '@/lib/auth/server';
import { getCoupleContext, getViewer, hasCoupleHistory } from '@/lib/data';
import { sql } from '@/lib/db';
import { getRequestGeo } from '@/lib/geo';
import { currentDeviceId, recordLogin } from '@/lib/devices';
import { DESIRES } from '@/lib/content';
import type { ActionResult, AuthResult } from '@/lib/types';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newInviteCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

// Private beta: only people who know this code can create an account.
const SIGNUP_ACCESS_CODE = process.env.SIGNUP_ACCESS_CODE || 'zzh_zj_99';

function accessCodeMatches(input: string) {
  const a = Buffer.from(input.trim());
  const b = Buffer.from(SIGNUP_ACCESS_CODE);
  return a.length === b.length && timingSafeEqual(a, b);
}

const userIdOf = (data: unknown) => (data as { user?: { id?: string } } | null)?.user?.id ?? null;

const fail = (error: string): ActionResult => ({ ok: false, error });
const OK: ActionResult = { ok: true };

function done() {
  revalidatePath('/', 'layout');
  return OK;
}

async function couple() {
  const ctx = await getCoupleContext();
  if (!ctx) throw new Error('You need to be paired first.');
  return ctx;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ───────────────────────────── auth ─────────────────────────────

export async function signUpAction(_: unknown, form: FormData): Promise<AuthResult> {
  const parsed = z
    .object({
      accessCode: z.string().min(1, 'Enter the invite-only access code.'),
      name: z.string().trim().min(1, 'Tell us your name').max(40),
      email: z.string().trim().email('That email looks off'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      adult: z.literal('on', { message: 'You must confirm you are 18 or older.' }),
      consent: z.literal('on', { message: 'You must agree to explicit content to continue.' }),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name, email, password, accessCode } = parsed.data;
  if (!accessCodeMatches(accessCode)) return fail('Wrong access code. mySex is invite-only 🔒');

  const { data, error } = await getAuth().signUp.email({ name, email, password });
  if (error) return fail(error.message || 'Could not create your account.');

  const userId = (data as { user?: { id: string } } | null)?.user?.id;
  if (userId) {
    await sql`
      insert into profiles (user_id, name, invite_code, adult_consent_at)
      values (${userId}, ${name}, ${newInviteCode()}, now())
      on conflict (user_id) do update set adult_consent_at = coalesce(profiles.adult_consent_at, now())`;
  }
  // With email verification on, Neon creates the account but no session and emails a code.
  if (!(data as { token?: string | null } | null)?.token) return { ok: false, verify: email };
  await recordLogin(userId);
  redirect('/onboarding');
}

function isUnverified(error: { message?: string; status?: number; code?: string }) {
  return error.code === 'EMAIL_NOT_VERIFIED' || error.status === 403 || /verif/i.test(error.message ?? '');
}

export async function signInAction(_: unknown, form: FormData): Promise<AuthResult> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return fail('Email and password, please.');
  const { data, error } = await getAuth().signIn.email({ email, password });
  if (error) {
    if (isUnverified(error)) return { ok: false, verify: email, error: 'Verify your email first — enter the code we sent you.' };
    return fail(error.message || 'Wrong email or password.');
  }
  await recordLogin(userIdOf(data));
  redirect('/');
}

export async function verifyEmailCode(_: unknown, form: FormData): Promise<AuthResult> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const otp = String(form.get('code') ?? '').replace(/\D/g, '');
  if (!email) return fail('Missing email — start again.');
  if (otp.length < 4) return { ok: false, verify: email, error: 'Enter the code from your email.' };

  const auth = getAuth();
  const { data, error } = await auth.emailOtp.verifyEmail({ email, otp });
  if (error) {
    const msg = /otp|invalid|expired|attempt/i.test(error.message ?? '')
      ? 'That code is wrong or expired. Try again, or tap “Resend code”.'
      : error.message || 'Could not verify that code.';
    return { ok: false, verify: email, error: msg };
  }

  // Neon only signs you in here if auto sign-in is enabled; otherwise sign in with the password.
  let userId = userIdOf(data);
  if (!(data as { token?: string | null } | null)?.token) {
    const signIn = await auth.signIn.email({ email, password });
    if (signIn.error) return fail('Email verified! Now sign in with your password.');
    userId = userIdOf(signIn.data) ?? userId;
  }
  await recordLogin(userId);
  redirect('/');
}

export async function resendEmailCode(email: string): Promise<ActionResult> {
  if (!z.string().email().safeParse(email).success) return fail('Bad email');
  const { error } = await getAuth().emailOtp.sendVerificationOtp({ email, type: 'email-verification' });
  if (error) return fail(error.message || 'Could not send a new code. Try again in a minute.');
  return OK;
}

export async function signOutAction() {
  const deviceId = await currentDeviceId();
  if (deviceId) await sql`update devices set revoked_at = now() where device_id = ${deviceId}`;
  await getAuth().signOut();
  redirect('/auth/sign-in');
}

// ─────────────────────────── onboarding ───────────────────────────

export async function completeOnboarding(_: unknown, form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) redirect('/auth/sign-in');
  const parsed = z
    .object({
      name: z.string().trim().min(1, 'Tell us your name').max(40),
      sex: z.enum(['male', 'female'], { message: 'Pick your sex so we can match you.' }),
      avatar: z.string().max(16).optional(),
      consent: z.literal('on', { message: 'You must confirm you are 18+ and consent to explicit content.' }),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name, sex, avatar } = parsed.data;

  // Profiles are only created by signUpAction (after the access code check).
  if (!viewer.profile) return fail('This account wasn’t created with an access code.');
  if (viewer.profile.sex && viewer.profile.sex !== sex && (await hasCoupleHistory(viewer.user.id))) {
    // Couples are keyed by (him, her); switching would orphan your saved history.
    return fail('Your sex is locked because you have saved history together.');
  }
  await sql`
    update profiles set name = ${name}, sex = ${sex}, avatar = ${avatar || '💋'},
      adult_consent_at = coalesce(adult_consent_at, now())
    where user_id = ${viewer.user.id}`;
  redirect('/pair');
}

// ───────────────────────────── pairing ─────────────────────────────

export async function pairWithCode(_: unknown, form: FormData): Promise<ActionResult> {
  const viewer = await getViewer();
  const me = viewer?.profile;
  if (!me?.sex) return fail('Finish your profile first.');
  if (me.coupleId) redirect('/home');

  const code = String(form.get('code') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) return fail('Invite codes are 6 characters.');
  if (code === me.inviteCode) return fail('Nice try — that’s your own code 😏');

  const rows = await sql`select user_id, sex, couple_id, adult_consent_at from profiles where invite_code = ${code}`;
  const other = rows[0];
  if (!other) return fail('No one has that code. Double-check it?');
  if (other.couple_id) return fail('That person is already taken 💔');
  if (!other.sex) return fail('Your partner hasn’t finished setting up yet.');
  if (other.sex === me.sex) return fail(`mySex pairs a him and a her — you’re both ${me.sex}.`);
  if (!other.adult_consent_at) return fail('Your partner hasn’t confirmed they are 18+ yet.');

  const maleId = me.sex === 'male' ? me.userId : other.user_id;
  const femaleId = me.sex === 'female' ? me.userId : other.user_id;

  // Re-pairing the same two people restores their shared history.
  const updated = await sql`
    with c as (
      insert into couples (male_id, female_id) values (${maleId}, ${femaleId})
      on conflict (male_id, female_id) do update set unpaired_at = null
      returning id
    )
    update profiles set couple_id = (select id from c)
    where user_id in (${maleId}, ${femaleId}) and couple_id is null
    returning user_id`;
  if (updated.length !== 2) {
    await sql`update profiles set couple_id = null where user_id in (${maleId}, ${femaleId}) and user_id = any(${updated.map((r) => r.user_id)})`;
    return fail('Someone else just paired with them. Try again.');
  }
  revalidatePath('/', 'layout');
  redirect('/home');
}

export async function regenerateInviteCode(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer?.profile) return fail('Not signed in.');
  if (viewer.profile.coupleId) return fail('Already paired.');
  await sql`update profiles set invite_code = ${newInviteCode()} where user_id = ${viewer.user.id}`;
  return done();
}

export async function unpair(): Promise<ActionResult> {
  const ctx = await couple();
  // Nothing is deleted: re-pairing the same two people reuses this couple and restores everything.
  await sql`update profiles set couple_id = null where couple_id = ${ctx.couple.id}`;
  await sql`update couples set unpaired_at = now() where id = ${ctx.couple.id}`;
  await sql`delete from sessions where couple_id = ${ctx.couple.id} and status = 'active'`;
  revalidatePath('/', 'layout');
  redirect('/pair');
}

// ───────────────────────────── sessions ─────────────────────────────

const coords = z
  .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
  .nullable()
  .optional();

async function locationFields(useLocation: boolean, gps?: { latitude: number; longitude: number } | null) {
  if (!useLocation) return { ip: null, city: null, region: null, country: null, latitude: null, longitude: null, source: null };
  const geo = await getRequestGeo();
  return {
    ...geo,
    latitude: gps?.latitude ?? geo.latitude,
    longitude: gps?.longitude ?? geo.longitude,
    source: gps ? 'gps' : 'ip',
  };
}

const startSchema = z.object({
  place: z.string().trim().max(60).optional().nullable(),
  useLocation: z.boolean(),
  gps: coords,
});

export async function startSession(input: z.input<typeof startSchema>): Promise<ActionResult> {
  const ctx = await couple();
  const p = startSchema.safeParse(input);
  if (!p.success) return fail('Invalid input');
  const loc = await locationFields(p.data.useLocation, p.data.gps);
  try {
    await sql`
      insert into sessions (couple_id, created_by, status, started_at, ip, city, region, country, latitude, longitude, geo_source, place)
      values (${ctx.couple.id}, ${ctx.me.userId}, 'active', now(), ${loc.ip}, ${loc.city}, ${loc.region}, ${loc.country},
              ${loc.latitude}, ${loc.longitude}, ${loc.source}, ${p.data.place || null})`;
  } catch {
    // Unique index: the partner already started one. Joining it is fine.
  }
  return done();
}

export async function togglePause(id: string): Promise<ActionResult> {
  const ctx = await couple();
  await sql`
    update sessions set
      paused_sec = case when paused_at is null then paused_sec
                        else paused_sec + extract(epoch from now() - paused_at)::int end,
      paused_at  = case when paused_at is null then now() else null end
    where id = ${id} and couple_id = ${ctx.couple.id} and status = 'active'`;
  return done();
}

const detailsSchema = z.object({
  place: z.string().trim().max(60).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  protection: z.string().max(20).nullable().optional(),
  hisOrgasms: z.number().int().min(0).max(20).nullable().optional(),
  herOrgasms: z.number().int().min(0).max(20).nullable().optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function finishSession(id: string, input: z.input<typeof detailsSchema>): Promise<ActionResult> {
  const ctx = await couple();
  const p = detailsSchema.safeParse(input);
  if (!p.success) return fail('Invalid input');
  const d = p.data;
  const rows = await sql`
    update sessions set
      status = 'done',
      ended_at = coalesce(paused_at, now()),
      duration_sec = greatest(0, extract(epoch from coalesce(paused_at, now()) - started_at)::int - paused_sec),
      paused_at = null,
      place = coalesce(${d.place || null}, place),
      rating = ${d.rating ?? null}, protection = ${d.protection ?? null},
      his_orgasms = ${d.hisOrgasms ?? null}, her_orgasms = ${d.herOrgasms ?? null},
      tags = ${d.tags ?? []}, notes = ${d.notes || null}
    where id = ${id} and couple_id = ${ctx.couple.id} and status = 'active'
    returning id`;
  if (!rows.length) return fail('This session was already finished.');
  return done();
}

export async function discardActiveSession(id: string): Promise<ActionResult> {
  const ctx = await couple();
  await sql`delete from sessions where id = ${id} and couple_id = ${ctx.couple.id} and status = 'active'`;
  return done();
}

const pastSchema = detailsSchema.extend({
  startedAt: z.string().datetime({ offset: true }),
  durationMin: z.number().min(0).max(24 * 60),
  useLocation: z.boolean(),
  gps: coords,
});

export async function logPastSession(input: z.input<typeof pastSchema>): Promise<ActionResult> {
  const ctx = await couple();
  const p = pastSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? 'Invalid input');
  const d = p.data;
  if (new Date(d.startedAt).getTime() > Date.now() + 5 * 60_000) return fail('That’s in the future — use the live timer instead 😉');
  const loc = await locationFields(d.useLocation, d.gps);
  const dur = Math.round(d.durationMin * 60);
  await sql`
    insert into sessions (couple_id, created_by, status, started_at, ended_at, duration_sec,
      ip, city, region, country, latitude, longitude, geo_source, place, rating, protection, his_orgasms, her_orgasms, tags, notes)
    values (${ctx.couple.id}, ${ctx.me.userId}, 'done', ${d.startedAt}, ${d.startedAt}::timestamptz + make_interval(secs => ${dur}), ${dur},
      ${loc.ip}, ${loc.city}, ${loc.region}, ${loc.country}, ${loc.latitude}, ${loc.longitude}, ${loc.source},
      ${d.place || null}, ${d.rating ?? null}, ${d.protection ?? null}, ${d.hisOrgasms ?? null}, ${d.herOrgasms ?? null},
      ${d.tags ?? []}, ${d.notes || null})`;
  return done();
}

const editSchema = detailsSchema.extend({
  startedAt: z.string().datetime({ offset: true }),
  durationMin: z.number().min(0).max(24 * 60),
});

export async function updateSession(id: string, input: z.input<typeof editSchema>): Promise<ActionResult> {
  const ctx = await couple();
  const p = editSchema.safeParse(input);
  if (!p.success) return fail('Invalid input');
  const d = p.data;
  const dur = Math.round(d.durationMin * 60);
  await sql`
    update sessions set
      started_at = ${d.startedAt}, duration_sec = ${dur},
      ended_at = ${d.startedAt}::timestamptz + make_interval(secs => ${dur}),
      place = ${d.place || null}, rating = ${d.rating ?? null}, protection = ${d.protection ?? null},
      his_orgasms = ${d.hisOrgasms ?? null}, her_orgasms = ${d.herOrgasms ?? null},
      tags = ${d.tags ?? []}, notes = ${d.notes || null}
    where id = ${id} and couple_id = ${ctx.couple.id} and status = 'done'`;
  return done();
}

export async function deleteSession(id: string): Promise<ActionResult> {
  const ctx = await couple();
  await sql`delete from sessions where id = ${id} and couple_id = ${ctx.couple.id}`;
  return done();
}

// ───────────────────────────── periods ─────────────────────────────

async function herOnly() {
  const ctx = await couple();
  if (ctx.me.sex !== 'female') throw new Error('Only she can log her period.');
  return ctx;
}

export async function startPeriod(date: string): Promise<ActionResult> {
  const ctx = await herOnly();
  if (!isoDate.safeParse(date).success) return fail('Bad date');
  const inside = await sql`
    select id from periods where user_id = ${ctx.me.userId}
      and start_date <= ${date}::date and coalesce(end_date, start_date + 9) >= ${date}::date`;
  if (inside.length) return fail('That day is already part of a period.');
  await sql`
    insert into periods (couple_id, user_id, start_date) values (${ctx.couple.id}, ${ctx.me.userId}, ${date})
    on conflict (user_id, start_date) do nothing`;
  return done();
}

export async function endPeriod(date: string): Promise<ActionResult> {
  const ctx = await herOnly();
  if (!isoDate.safeParse(date).success) return fail('Bad date');
  const rows = await sql`
    update periods set end_date = ${date}
    where id = (
      select id from periods where user_id = ${ctx.me.userId} and start_date <= ${date}::date
      order by start_date desc limit 1
    ) and ${date}::date - start_date < 15
    returning id`;
  if (!rows.length) return fail('Log the start of this period first.');
  return done();
}

export async function updatePeriod(id: string, start: string, end: string | null): Promise<ActionResult> {
  const ctx = await herOnly();
  if (!isoDate.safeParse(start).success || (end && !isoDate.safeParse(end).success)) return fail('Bad date');
  if (end && end < start) return fail('End must be after start.');
  try {
    await sql`update periods set start_date = ${start}, end_date = ${end} where id = ${id} and user_id = ${ctx.me.userId}`;
  } catch {
    return fail('Another period already starts that day.');
  }
  return done();
}

export async function deletePeriod(id: string): Promise<ActionResult> {
  const ctx = await herOnly();
  await sql`delete from periods where id = ${id} and user_id = ${ctx.me.userId}`;
  return done();
}

// ───────────────────────────── daily check-in ─────────────────────────────

const logSchema = z.object({
  date: isoDate,
  mood: z.string().max(20).nullable(),
  energy: z.number().int().min(1).max(5).nullable(),
  libido: z.number().int().min(1).max(5).nullable(),
  flow: z.enum(['spotting', 'light', 'medium', 'heavy']).nullable(),
  symptoms: z.array(z.string().max(30)).max(20),
  note: z.string().trim().max(300).nullable(),
});

export async function saveDailyLog(input: z.input<typeof logSchema>): Promise<ActionResult> {
  const ctx = await couple();
  const p = logSchema.safeParse(input);
  if (!p.success) return fail('Invalid input');
  const d = p.data;
  const flow = ctx.me.sex === 'female' ? d.flow : null;
  await sql`
    insert into daily_logs (user_id, log_date, couple_id, mood, energy, libido, flow, symptoms, note, updated_at)
    values (${ctx.me.userId}, ${d.date}, ${ctx.couple.id}, ${d.mood}, ${d.energy}, ${d.libido}, ${flow}, ${d.symptoms}, ${d.note || null}, now())
    on conflict (user_id, log_date) do update set
      mood = excluded.mood, energy = excluded.energy, libido = excluded.libido, flow = excluded.flow,
      symptoms = excluded.symptoms, note = excluded.note, couple_id = excluded.couple_id, updated_at = now()`;
  return done();
}

// ───────────────────────────── notes ─────────────────────────────

export async function sendNote(body: string, kind: 'note' | 'wish' | 'tease' = 'note'): Promise<ActionResult> {
  const ctx = await couple();
  const text = body.trim().slice(0, 1000);
  if (!text) return fail('Say something sexy first.');
  if (!['note', 'wish', 'tease'].includes(kind)) return fail('Bad kind');
  await sql`insert into love_notes (couple_id, from_user, body, kind) values (${ctx.couple.id}, ${ctx.me.userId}, ${text}, ${kind})`;
  // Keep the free-tier database lean: only the latest 500 notes per couple are kept.
  await sql`
    delete from love_notes where couple_id = ${ctx.couple.id} and id not in (
      select id from love_notes where couple_id = ${ctx.couple.id} order by created_at desc limit 500)`;
  return done();
}

export async function markNotesRead(): Promise<ActionResult> {
  const ctx = await couple();
  const rows = await sql`
    update love_notes set read_at = now()
    where couple_id = ${ctx.couple.id} and from_user <> ${ctx.me.userId} and read_at is null
    returning id`;
  if (rows.length) revalidatePath('/', 'layout');
  return OK;
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const ctx = await couple();
  await sql`delete from love_notes where id = ${id} and couple_id = ${ctx.couple.id} and from_user = ${ctx.me.userId}`;
  return done();
}

// ───────────────────────────── desires ─────────────────────────────

const allDesires = new Set(DESIRES.flatMap((g) => g.items));

export async function answerDesire(item: string, answer: 'yes' | 'maybe' | 'no' | null): Promise<ActionResult> {
  const ctx = await couple();
  if (!allDesires.has(item)) return fail('Unknown item');
  if (answer === null) {
    await sql`delete from desires where user_id = ${ctx.me.userId} and item = ${item}`;
  } else if (['yes', 'maybe', 'no'].includes(answer)) {
    await sql`
      insert into desires (user_id, item, answer) values (${ctx.me.userId}, ${item}, ${answer})
      on conflict (user_id, item) do update set answer = excluded.answer, updated_at = now()`;
  }
  return done();
}

// ───────────────────────────── settings ─────────────────────────────

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(40),
  avatar: z.string().min(1).max(16),
  cycleLengthDefault: z.number().int().min(18).max(50),
  periodLengthDefault: z.number().int().min(1).max(12),
  anniversary: isoDate.nullable(),
});

export async function saveSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const ctx = await couple();
  const p = settingsSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0]?.message ?? 'Invalid input');
  const d = p.data;
  await sql`
    update profiles set name = ${d.name}, avatar = ${d.avatar},
      cycle_length_default = ${d.cycleLengthDefault}, period_length_default = ${d.periodLengthDefault}
    where user_id = ${ctx.me.userId}`;
  await sql`update couples set anniversary = ${d.anniversary} where id = ${ctx.couple.id}`;
  return done();
}

// ───────────────────────────── devices ─────────────────────────────

/** Signs another device out: its next request is bounced to the sign-in page. */
export async function signOutDevice(deviceId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail('Not signed in.');
  if (deviceId === (await currentDeviceId())) return fail('Use “Sign out” for this device.');
  await sql`update devices set revoked_at = now() where device_id = ${deviceId} and user_id = ${viewer.user.id}`;
  return done();
}

export async function signOutOtherDevices(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail('Not signed in.');
  const current = await currentDeviceId();
  await sql`
    update devices set revoked_at = now()
    where user_id = ${viewer.user.id} and revoked_at is null and device_id is distinct from ${current}`;
  try {
    // Also kill every other Neon Auth session, in case a device lost its cookie.
    await getAuth().revokeOtherSessions();
  } catch (e) {
    console.error('[devices] revokeOtherSessions failed', e);
  }
  return done();
}
