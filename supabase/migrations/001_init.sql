-- =====================================================================
-- WORLDWIDE MUSIC STAR — initial schema
-- Run order:
--   1) Open Supabase SQL editor
--   2) Paste this file's contents and run.
--   3) Then run 002_seed.sql (optional — sample data for dev/preview).
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ---------- Enums ----------
do $$ begin
  create type genre_slug as enum (
    'hiphop-rap','electro','pop','rock','country',
    'latin','jazz','french','classical','world'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type entry_status as enum ('pending_payment','active','rejected','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type article_status as enum ('draft','scheduled','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_provider as enum ('paypal','stripe','manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending','completed','failed','refunded');
exception when duplicate_object then null; end $$;

-- ---------- Genres (lookup table) ----------
create table if not exists genres (
  slug genre_slug primary key,
  name text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into genres (slug, name, display_order) values
  ('hiphop-rap', 'HipHop / Rap', 1),
  ('electro',    'Electro',      2),
  ('pop',        'Pop',          3),
  ('rock',       'Rock',         4),
  ('country',    'Country',      5),
  ('latin',      'Latin',        6),
  ('jazz',       'Jazz',         7),
  ('french',     'French',       8),
  ('classical',  'Classical',    9),
  ('world',      'World',       10)
on conflict (slug) do nothing;

-- ---------- Tracks (an entry = artist + song) ----------
create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  artist_name text not null,
  song_title text not null,
  genre genre_slug not null,
  email text not null,                              -- contact only, no account
  -- Spotify
  spotify_track_id text,                            -- e.g. "3n3Ppam7vgaVa1iaRUc9Lp"
  spotify_url text,
  spotify_followers int default 0,
  spotify_followers_updated_at timestamptz,
  cover_url text,                                   -- album art from Spotify
  -- YouTube
  youtube_url text,
  youtube_channel_id text,
  youtube_video_id text,
  youtube_subscribers int default 0,
  youtube_subscribers_updated_at timestamptz,
  -- Counters
  votes_count int not null default 0,
  -- Score (computed in app, also stored here for sorting)
  score numeric(14,2) not null default 0,
  -- Lifecycle
  status entry_status not null default 'pending_payment',
  is_admin_added boolean not null default false,    -- true = no payment required
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists tracks_genre_idx        on tracks (genre);
create index if not exists tracks_status_idx       on tracks (status);
create index if not exists tracks_score_idx        on tracks (score desc);
create index if not exists tracks_genre_score_idx  on tracks (genre, score desc) where status = 'active';

-- ---------- Votes ----------
-- Anti-fraud: a hash of (ip + user-agent) per (track, day) is unique.
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks(id) on delete cascade,
  voter_hash text not null,                         -- sha256(ip || ua || day)
  ip_inet inet,
  user_agent text,
  ad_session_id text,                               -- IMA SDK session, used to confirm ad watched
  ad_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists votes_unique_per_day
  on votes (track_id, voter_hash);
create index if not exists votes_track_idx on votes (track_id);
create index if not exists votes_created_idx on votes (created_at desc);

-- ---------- Payments ----------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references tracks(id) on delete set null,
  provider payment_provider not null,
  provider_order_id text,                           -- PayPal order id / Stripe session id
  provider_capture_id text,                         -- post-capture id
  amount_usd numeric(10,2) not null,
  currency text not null default 'USD',
  status payment_status not null default 'pending',
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists payments_track_idx on payments (track_id);
create index if not exists payments_status_idx on payments (status);
create unique index if not exists payments_provider_order_idx
  on payments (provider, provider_order_id) where provider_order_id is not null;

-- ---------- Articles (blog) ----------
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content_md text not null,                         -- markdown body
  cover_url text,
  cover_prompt text,                                -- for regeneration
  related_track_id uuid references tracks(id) on delete set null,
  related_genre genre_slug,
  status article_status not null default 'draft',
  generated_by text default 'manual',               -- 'manual' | 'claude' | 'admin-edit'
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_idx on articles (status);
create index if not exists articles_published_idx on articles (published_at desc);
create index if not exists articles_genre_idx on articles (related_genre);

-- ---------- Newsletter / waitlist ----------
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text default 'home',                       -- 'home','footer','launch'
  confirmed boolean default false,
  created_at timestamptz not null default now()
);

-- ---------- Monthly archives (chart snapshots) ----------
create table if not exists chart_archives (
  id uuid primary key default gen_random_uuid(),
  period_year int not null,
  period_month int not null,                        -- 1..12
  genre genre_slug,                                 -- null = all-charts (overall)
  ranking jsonb not null,                           -- [{rank, track_id, artist, song, score, votes, spotify, youtube, cover_url}, ...]
  created_at timestamptz not null default now()
);

create unique index if not exists chart_archives_period_genre_idx
  on chart_archives (period_year, period_month, coalesce(genre::text,'all'));

-- ---------- Awards ----------
create table if not exists awards (
  id uuid primary key default gen_random_uuid(),
  period_year int not null,
  period_month int not null,
  track_id uuid not null references tracks(id) on delete cascade,
  votes_count int not null,
  score numeric(14,2) not null,
  trophy_image_url text,
  created_at timestamptz not null default now()
);

create unique index if not exists awards_period_idx
  on awards (period_year, period_month);

-- ---------- Admin users ----------
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- ---------- updated_at trigger ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tracks_set_updated_at on tracks;
create trigger tracks_set_updated_at before update on tracks
  for each row execute function set_updated_at();

drop trigger if exists articles_set_updated_at on articles;
create trigger articles_set_updated_at before update on articles
  for each row execute function set_updated_at();

-- ---------- Row Level Security ----------
-- We use the service-role key on the server for all writes; public reads are
-- restricted to active tracks and published articles.
alter table tracks      enable row level security;
alter table votes       enable row level security;
alter table payments    enable row level security;
alter table articles    enable row level security;
alter table subscribers enable row level security;
alter table chart_archives enable row level security;
alter table awards      enable row level security;
alter table admin_users enable row level security;

-- Public reads
drop policy if exists "public read active tracks" on tracks;
create policy "public read active tracks" on tracks
  for select to anon using (status = 'active');

drop policy if exists "public read published articles" on articles;
create policy "public read published articles" on articles
  for select to anon using (status = 'published');

drop policy if exists "public read archives" on chart_archives;
create policy "public read archives" on chart_archives
  for select to anon using (true);

drop policy if exists "public read awards" on awards;
create policy "public read awards" on awards
  for select to anon using (true);

drop policy if exists "public read genres" on genres;

alter table genres enable row level security;
create policy "public read genres" on genres
  for select to anon using (true);

-- All other writes go through service-role (bypasses RLS) from server code.
-- No anon/authenticated insert/update/delete policies are added on purpose.
