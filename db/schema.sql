-- mySex schema. Idempotent: safe to run on every deploy (see scripts/migrate.mjs).
-- Users themselves live in the `neon_auth` schema managed by Neon Auth; we key on their id.

create table if not exists profiles (
  user_id               text primary key,
  name                  text not null,
  sex                   text check (sex in ('male', 'female')),
  invite_code           text not null unique,
  couple_id             uuid,
  avatar                text not null default '💋',
  cycle_length_default  smallint not null default 28,
  period_length_default smallint not null default 5,
  adult_consent_at      timestamptz,
  created_at            timestamptz not null default now()
);

alter table profiles add column if not exists lang text check (lang in ('en', 'zh'));

create table if not exists couples (
  id          uuid primary key default gen_random_uuid(),
  male_id     text not null references profiles(user_id) on delete cascade,
  female_id   text not null references profiles(user_id) on delete cascade,
  anniversary date,
  created_at  timestamptz not null default now(),
  unique (male_id, female_id)
);
-- Set when either partner unpairs; cleared when they reconnect. History is never deleted.
alter table couples add column if not exists unpaired_at timestamptz;

do $$ begin
  alter table profiles
    add constraint profiles_couple_fk foreign key (couple_id) references couples(id) on delete set null;
exception when duplicate_object then null; end $$;

-- A sex session ("romp"). status = 'active' while the live timer is running.
create table if not exists sessions (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references couples(id) on delete cascade,
  created_by   text not null references profiles(user_id) on delete cascade,
  status       text not null default 'done' check (status in ('active', 'done')),
  started_at   timestamptz not null,
  ended_at     timestamptz,
  paused_at    timestamptz,
  paused_sec   integer not null default 0,
  duration_sec integer check (duration_sec is null or duration_sec >= 0),
  ip           text,
  city         text,
  region       text,
  country      text,
  latitude     double precision,
  longitude    double precision,
  geo_source   text check (geo_source in ('ip', 'gps')),
  place        text,
  rating       smallint check (rating between 1 and 5),
  protection   text,
  his_orgasms  smallint check (his_orgasms between 0 and 20),
  her_orgasms  smallint check (her_orgasms between 0 and 20),
  tags         text[] not null default '{}',
  notes        text,
  created_at   timestamptz not null default now()
);
-- Version stamp for optimistic concurrency when both partners edit the same session.
alter table sessions add column if not exists updated_at timestamptz not null default now();
-- Every pause during a live session: [{"start": ts, "end": ts|null}]. paused_sec is their total.
alter table sessions add column if not exists breaks jsonb not null default '[]';
-- 'intercourse' or 'oral': counted separately everywhere.
alter table sessions add column if not exists kind text not null default 'intercourse';
do $$ begin
  alter table sessions add constraint sessions_kind_check check (kind in ('intercourse', 'oral'));
exception when duplicate_object then null; end $$;
create unique index if not exists sessions_one_active_per_couple on sessions (couple_id) where status = 'active';
create index if not exists sessions_couple_started on sessions (couple_id, started_at desc);

create table if not exists periods (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade,
  user_id    text not null references profiles(user_id) on delete cascade,
  start_date date not null,
  end_date   date,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  unique (user_id, start_date)
);
create index if not exists periods_couple_start on periods (couple_id, start_date);

-- One check-in per person per day: mood, energy, horniness, symptoms, flow.
create table if not exists daily_logs (
  user_id    text not null references profiles(user_id) on delete cascade,
  log_date   date not null,
  couple_id  uuid references couples(id) on delete set null,
  mood       text,
  energy     smallint check (energy between 1 and 5),
  libido     smallint check (libido between 1 and 5),
  flow       text check (flow in ('spotting', 'light', 'medium', 'heavy')),
  symptoms   text[] not null default '{}',
  note       text,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

create table if not exists love_notes (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references couples(id) on delete cascade,
  from_user  text not null references profiles(user_id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  kind       text not null default 'note' check (kind in ('note', 'wish', 'tease')),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table love_notes add column if not exists edited_at timestamptz;
create index if not exists love_notes_couple_created on love_notes (couple_id, created_at desc);

-- "Yes / No / Maybe" list. Only mutual yes/maybe answers are ever revealed to the partner.
create table if not exists desires (
  user_id    text not null references profiles(user_id) on delete cascade,
  item       text not null,
  answer     text not null check (answer in ('yes', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  primary key (user_id, item)
);

-- Devices you're signed in on (identified by a long-lived httpOnly cookie), with where they were last seen.
create table if not exists devices (
  device_id    text primary key,
  user_id      text not null references profiles(user_id) on delete cascade,
  user_agent   text,
  ip           text,
  city         text,
  region       text,
  country      text,
  signed_in_at timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  revoked_at   timestamptz
);
create index if not exists devices_user_seen on devices (user_id, last_seen desc);

-- Sign-in history (latest 50 per user are kept).
create table if not exists login_events (
  id         bigserial primary key,
  user_id    text not null references profiles(user_id) on delete cascade,
  device_id  text,
  user_agent text,
  ip         text,
  city       text,
  region     text,
  country    text,
  at         timestamptz not null default now()
);
create index if not exists login_events_user_at on login_events (user_id, at desc);

-- A request is the first partner's consent; only the named recipient can give the second.
-- session_id deliberately has no FK: the small request receipt survives an approved deletion.
-- No session notes, location, or other intimate details are copied into these receipts.
create table if not exists session_deletion_requests (
  id                 uuid primary key default gen_random_uuid(),
  couple_id          uuid not null references couples(id) on delete cascade,
  session_id         uuid not null,
  requested_by       text not null references profiles(user_id) on delete cascade,
  recipient_id       text not null references profiles(user_id) on delete cascade,
  session_version    timestamptz not null,
  session_started_at timestamptz not null,
  session_kind       text not null check (session_kind in ('intercourse', 'oral')),
  status             text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled', 'expired')),
  created_at         timestamptz not null default now(),
  decided_at         timestamptz,
  requester_read_at  timestamptz,
  check (requested_by <> recipient_id)
);
create unique index if not exists session_deletion_one_pending on session_deletion_requests (session_id) where status = 'pending';
create index if not exists session_deletion_couple_created on session_deletion_requests (couple_id, created_at desc);

-- Anonymous revocation markers prevent signed-out sessions from recreating deleted device rows.
alter table devices add column if not exists auth_session_hash text;
create table if not exists device_revocations (
  key_hash text primary key,
  expires_at timestamptz not null
);
create index if not exists device_revocations_expiry on device_revocations (expires_at);
create index if not exists login_events_user_device on login_events (user_id, device_id);
create index if not exists session_deletion_created on session_deletion_requests (created_at);
create table if not exists app_maintenance (
  name text primary key,
  last_run timestamptz not null
);

-- Remove previously retained signed-out devices and their IP/login details on deployment.
with targets as materialized (
  select device_id, auth_session_hash from devices where revoked_at is not null for update
), marked as (
  insert into device_revocations (key_hash, expires_at)
  select encode(sha256(convert_to('device:' || device_id, 'UTF8')), 'hex'), now() + interval '400 days' from targets
  union
  select auth_session_hash, now() + interval '400 days' from targets where auth_session_hash is not null
  on conflict (key_hash) do nothing
), events_deleted as (
  delete from login_events e where not exists (
    select 1 from devices d where d.device_id = e.device_id and d.user_id = e.user_id and d.revoked_at is null)
)
delete from devices where device_id in (select device_id from targets);
delete from session_deletion_requests where created_at <= now() - interval '7 days';
