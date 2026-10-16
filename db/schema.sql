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
