-- Block Q2 — Onboarding Wizard flow & schema, 7 Sep 2026.
-- Implements the orchestrator's resolved decisions on Q1's flagged open
-- items (docs/block-q/q1-requirements-catalog.md, Part A + "Open items"):
--   1. venue_licence_profile.legal_name (Q1 catalog row 2 / open item 3 —
--      the bar pass's original recommendation never made it into the
--      migration; only address/abn did).
--   2. venues.roster_location (Q1 catalog row 46 / gap #9 — three separate
--      real-venue personas across bar/pub/cafe passes couldn't answer
--      "where do I check who's on shift").
--   3. venue_promotions (Q1 catalog row 51 — happy hour/promotional
--      pricing, licensed-only, gated behind the new LIC0 root gate so it
--      is never asked on the no-licence path, unlike the pub pass which
--      had no upstream licence gate to hang this off).
--   4. Security firm contact — no new table; venue_contacts.contact_type
--      = 'security_firm' already covers this (Q1 catalog row 32).
--   5. Individual crowd-controller licence numbers — no new table; captured
--      as freetext into venue_contacts.notes, with the wizard UI (Q4) showing
--      a visible "not yet a structured field" indicator (Q1 catalog row 33).
--   6. venue_licence_profile.licence_status enum, backing the new LIC0 root
--      licensing gate — a minimal row must exist for every venue, licensed
--      or not, so "no data yet" is never confused with "confirmed
--      unlicensed" (Q1 catalog row 23, cafe pass Finding 1).
--   7. Banned-patron register — ratified content-only for v1, no schema.
--   8. venue_key_roles — lets the RSA marshal / Food Safety Supervisor
--      "named key role" gap (Q1 catalog rows 36, 38) be captured as a real
--      row, with a nullable app_user_id because that named individual very
--      often doesn't have an app_users login yet (Q1 Part D.1.4).
--   9. staff_roles.fallback_tier already exists (migration 20260907093000)
--      — the wizard just configures it normally, no special-casing.
--  10. Gaming/EGM and non-Victoria states both route to a founder-escalation
--      UI dead-end, tracked via wizard_sessions.venue_type_flags — never a
--      schema table (Q1 Part C).
--
-- Companion design doc: docs/block-q/q2-wizard-flow-and-schema.md (full page
-- sequence, branch conditions, and the Part A field -> wizard page mapping).

-- ============================
-- 1. venue_licence_profile additions
-- ============================

-- Nullable, no default: existing rows (e.g. the Two Fires demo venue) predate
-- this column and should not be silently reinterpreted as "trading name ==
-- legal name." The wizard always prompts for this explicitly on the Venue
-- Basics page; a null value here just means "not yet asked," not "same as
-- trading name."
alter table venue_licence_profile add column if not exists legal_name text;

-- Deliberately no default value. A default of 'none' would make an
-- unpopulated row indistinguishable from a deliberately-confirmed "this
-- venue holds no licence" answer -- exactly the ambiguity-by-construction
-- problem the cafe pass flagged (Q1 catalog row 23). The wizard's LIC0 page
-- is the only place this column is ever written, and it always writes an
-- explicit value, never leaves it to a default.
alter table venue_licence_profile add column if not exists licence_status text
  check (licence_status in ('none', 'byo_unlicensed', 'limited', 'full'));

-- ============================
-- 2. venues.roster_location
-- ============================
alter table venues add column if not exists roster_location text;

-- ============================
-- 3. wizard_sessions
-- ============================
-- Resume-position + branching-flag store only. NEVER a staging copy of real
-- data -- every guaranteed field writes straight to its destination table on
-- page submit (matching CreateStationForm's direct-write convention), so a
-- lost/abandoned session never loses already-submitted answers. current_step
-- and venue_type_flags exist purely so the wizard can re-open on the right
-- page and re-apply the right branches; every step page must still be
-- independently reachable and editable once the venue itself exists (page 1
-- complete), not gated behind current_step.
create table if not exists wizard_sessions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade unique,
  started_by uuid references app_users(id) on delete set null,
  current_step text,
  -- Branching flags + founder-escalation markers live here, e.g.
  -- {"licensed": true, "crowd_control_required": false,
  --  "food_service_level": "full_kitchen",
  --  "founder_escalation": ["gaming_egm"]}
  -- See the design doc's "State model" section for the full flag vocabulary.
  venue_type_flags jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table wizard_sessions enable row level security;
create policy venue_isolation_wizard_sessions on wizard_sessions
  for all using (venue_id = private.auth_venue_id());

-- ============================
-- 4. venue_key_roles
-- ============================
-- Named-individual capture for the RSA marshal / Food Safety Supervisor
-- "named key role" gap (Q1 catalog rows 36, 38; task brief decision #8).
-- app_user_id is deliberately nullable: the wizard UI (Q4) must visibly flag
-- when it's null, per Q1 Part D.1.4 -- this schema alone doesn't resolve
-- that, it just makes the unresolved link representable instead of losing
-- the fact entirely.
create table if not exists venue_key_roles (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  role_type text not null check (role_type in ('rsa_marshal', 'food_safety_supervisor')),
  name text not null,
  phone text,
  email text,
  app_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz default now()
);
alter table venue_key_roles enable row level security;
create policy venue_isolation_venue_key_roles on venue_key_roles
  for all using (venue_id = private.auth_venue_id());

-- ============================
-- 5. onboarding_content_checks
-- ============================
-- Logs every gap-detection-loop iteration on the SOP/content-intake hub
-- (wizard page 12). module_id is nullable because a check can legitimately
-- happen mid-authoring, before a module row is finalized; venue_id is kept
-- as its own column (rather than derived only via module_id) so a check can
-- still be logged even when module_id is null.
create table if not exists onboarding_content_checks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  module_id uuid references modules(id) on delete cascade,
  topic_key text,
  test_question text,
  answer text,
  could_answer boolean,
  self_consistency_checked boolean not null default false,
  created_at timestamptz default now()
);
alter table onboarding_content_checks enable row level security;
create policy venue_isolation_onboarding_content_checks on onboarding_content_checks
  for all using (venue_id = private.auth_venue_id());

-- ============================
-- 6. venue_promotions
-- ============================
-- Happy hour / discounted pricing. Licensed-only, and only if the venue
-- confirms it runs one -- gated behind the LIC0 root licensing gate, never
-- asked on the no-licence path (Q1 catalog row 51; the pub pass's
-- venue_licence_profile-then-happy-hour flow couldn't enforce this because
-- it had no upstream licence gate at all).
create table if not exists venue_promotions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  day_of_week text not null check (day_of_week in
    ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time time not null,
  end_time time not null,
  description text,
  created_at timestamptz default now()
);
alter table venue_promotions enable row level security;
create policy venue_isolation_venue_promotions on venue_promotions
  for all using (venue_id = private.auth_venue_id());

-- ============================
-- 7. onboarding-uploads storage bucket
-- ============================
-- Folder-per-venue, same insert+select-only pattern as certs/photo-library
-- (20260828130000). Holds raw SOP source files, menu upload/parse inputs,
-- and any other wizard-stage upload that isn't a staff certificate photo
-- (those keep using the existing certs bucket) or a tagged brand/module
-- asset (photo-library).
insert into storage.buckets (id, name, public)
values ('onboarding-uploads', 'onboarding-uploads', false)
on conflict (id) do nothing;

drop policy if exists onboarding_uploads_venue_isolation_insert on storage.objects;
create policy onboarding_uploads_venue_isolation_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'onboarding-uploads'
    and (storage.foldername(name))[1] = private.auth_venue_id()::text
  );

drop policy if exists onboarding_uploads_venue_isolation_select on storage.objects;
create policy onboarding_uploads_venue_isolation_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'onboarding-uploads'
    and (storage.foldername(name))[1] = private.auth_venue_id()::text
  );
