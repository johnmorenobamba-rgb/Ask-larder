-- Tech Bible §15a: schema additions for the 5 v1 differentiator features locked
-- 27 Aug 2026 (QR station anchors, shift/role-context Ask Larder, SOP versioning +
-- re-acknowledgement, escalation logging, near-miss reports). Applied on top of the
-- verified Block A baseline (20260826142834_baseline_schema.sql).
--
-- Adapted from the Tech Bible §15a snippet: that snippet calls a bare auth_venue_id(),
-- which predates the baseline's move of the helper into private.auth_venue_id() (kept
-- out of PostgREST's exposed schema). This migration uses private.auth_venue_id() to
-- match the live schema instead of reintroducing the old public-schema function.

-- ============================
-- Feature #1: QR station anchors
-- ============================
create table if not exists stations (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  name text not null,
  qr_code_slug text unique not null,
  primary_module_id uuid references modules(id),
  created_at timestamptz default now()
);

-- ============================
-- Feature #2: shift/role context (lightweight v1 — no roster integration yet)
-- ============================
alter table venues add column if not exists shift_windows jsonb default '{}'::jsonb;

-- ============================
-- Feature #3: SOP versioning + change-triggered acknowledgement
-- ============================
create table if not exists module_versions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  version int not null,
  changelog text,
  published_at timestamptz default now()
);

create table if not exists staff_module_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  module_version_id uuid references module_versions(id) on delete cascade,
  acknowledged_at timestamptz
);

-- ============================
-- Feature #4: escalation logging — reuse chat_messages, add a flag rather than a new table
-- ============================
alter table chat_messages add column if not exists is_escalation boolean default false;
alter table chat_messages add column if not exists station_id uuid references stations(id);

-- ============================
-- Feature #5: near-miss / hazard reports
-- ============================
create table if not exists near_miss_reports (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  station_id uuid references stations(id),
  reported_by uuid references app_users(id),
  is_anonymous boolean default false,
  description text,
  photo_ref text,
  status text default 'open' check (status in ('open','resolved')),
  created_at timestamptz default now()
);

-- ============================
-- Row Level Security — each new table gets its own explicit policy,
-- an un-policied table with RLS on blocks all access by default.
-- ============================

alter table stations enable row level security;
drop policy if exists venue_isolation_stations on stations;
create policy venue_isolation_stations on stations
  for all using (venue_id = private.auth_venue_id());

alter table module_versions enable row level security;
drop policy if exists venue_isolation_module_versions on module_versions;
create policy venue_isolation_module_versions on module_versions
  for all using (module_id in (select id from modules where venue_id = private.auth_venue_id()));

alter table staff_module_acknowledgements enable row level security;
drop policy if exists venue_isolation_staff_module_ack on staff_module_acknowledgements;
create policy venue_isolation_staff_module_ack on staff_module_acknowledgements
  for all using (user_id in (select id from app_users where venue_id = private.auth_venue_id()));

alter table near_miss_reports enable row level security;
drop policy if exists venue_isolation_near_miss on near_miss_reports;
create policy venue_isolation_near_miss on near_miss_reports
  for all using (venue_id = private.auth_venue_id());
