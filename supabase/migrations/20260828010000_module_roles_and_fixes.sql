-- Block C foundation fixes, per Decision Log (27 Aug 2026, "modules.role_id must
-- become many-to-many before Block C role-selection logic") and this session's plan.
--
-- 1. modules.role_id (single FK) -> module_roles (many-to-many). Two of venue #1's
--    real modules (Venue Hire Protocol, Chef Cleaning Checklist) are genuinely
--    multi-role and can't be represented by a single FK. Convention: a module with
--    zero module_roles rows is unrestricted within the venue (visible to every role)
--    -- this preserves the exact semantics of the old nullable role_id column, which
--    is why it's safe to drop outright rather than keep as a deprecated shim. Live
--    check before writing this migration confirmed zero rows have role_id set, so
--    there is nothing to backfill.
-- 2. staff_module_progress.esignature_id had no FK constraint despite referencing
--    esignatures.id -- confirmed zero orphaned values live, safe to add directly.
-- 3. app_users.has_seen_ask_larder_intro -- gates the New-Hire Flow spec's one-time
--    unskippable Ask Larder Explainer sequence (Section 8).
-- 4. check_questions gains real multiple-choice support (options/correct_option_index)
--    -- replaces free-text-only grading, per this session's decision. Existing 21
--    rows get options = '[]' here; populated in the follow-up content pass, not this
--    migration.
-- 5. near-miss-photos storage bucket -- near_miss_reports.photo_ref has had no bucket
--    to point into since the differentiator migration added the column. Kept as its
--    own bucket rather than reusing certs: certification photos are a compliance
--    record with different retention needs than a near-miss report photo.

-- ============================
-- 1. module_roles (many-to-many)
-- ============================
create table if not exists module_roles (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  role_id uuid references staff_roles(id) on delete cascade,
  unique (module_id, role_id)
);

alter table modules drop column if exists role_id;

alter table module_roles enable row level security;
drop policy if exists venue_isolation_module_roles on module_roles;
create policy venue_isolation_module_roles on module_roles
  for all using (module_id in (select id from modules where venue_id = private.auth_venue_id()));

-- ============================
-- 2. staff_module_progress.esignature_id FK
-- ============================
alter table staff_module_progress
  add constraint staff_module_progress_esignature_id_fkey
  foreign key (esignature_id) references esignatures(id);

-- ============================
-- 3. Ask Larder Explainer gate
-- ============================
alter table app_users add column if not exists has_seen_ask_larder_intro boolean not null default false;

-- ============================
-- 4. Multiple-choice check questions
-- ============================
alter table check_questions add column if not exists options jsonb not null default '[]'::jsonb;
alter table check_questions add column if not exists correct_option_index int;

-- ============================
-- 5. Near-miss photo storage
-- ============================
insert into storage.buckets (id, name, public)
values ('near-miss-photos', 'near-miss-photos', false)
on conflict (id) do nothing;
