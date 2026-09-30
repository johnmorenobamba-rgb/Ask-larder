-- Compliance Forms Stage 0a (decision: "Compliance Forms: Stage 0 architecture
-- and scope", 29 Sep 2026). Generic schema, no per-form tables: form
-- definitions live in a static TS catalog (Stage 0b), submissions live here.
--
-- Three tables, every one venue-scoped with RLS:
--   compliance_form_submissions  insert-only ledger (no UPDATE/DELETE for any
--                                client role, owner included)
--   venue_compliance_settings    one row per venue (Stage 0a wizard capture)
--   venue_refrigeration_units    cold/frozen/hot-hold units + safe range
--
-- Manager-tier writes use private.auth_is_manager_tier(), the same helper as
-- 20260929220000_manager_tier_rls_near_miss_chat_stations_modules.sql.

-- ---------------------------------------------------------------------------
-- Small SECURITY DEFINER helpers (same shape as private.auth_venue_id())
-- ---------------------------------------------------------------------------
create or replace function private.auth_app_user_id()
returns uuid
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select id from app_users where auth_id = auth.uid()
$$;

create or replace function private.auth_department()
returns text
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select sr.department
  from app_users au
  left join staff_roles sr on sr.id = au.staff_role_id
  where au.auth_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- compliance_form_submissions: insert-only
-- ---------------------------------------------------------------------------
create table compliance_form_submissions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  form_id text not null,
  -- NO ACTION (not cascade, not set null): a staff account with compliance
  -- records can't be hard-deleted out from under them (the app deactivates
  -- via app_users.deactivated_at). The venue cascade still works because
  -- NO ACTION is checked at end of statement, after the submissions rows
  -- cascaded away too. submitted_by_name is the durable snapshot.
  submitted_by uuid not null references app_users(id),
  submitted_by_name text not null,
  submitted_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  out_of_range boolean not null default false,
  corrective_action text,
  device_stamp text,
  -- A correction is a new linked record, never an edit.
  corrects_submission_id uuid references compliance_form_submissions(id),
  -- Snapshot of the catalog's audience for this form, derived server-side by
  -- the API route (never from the client, see column privileges below).
  -- Values are staff_roles.department ('BOH', 'FOH'); manager tier always
  -- sees everything. Empty array means manager tier only.
  visible_to_roles text[] not null default '{}',
  constraint compliance_out_of_range_needs_action
    check (not out_of_range or length(btrim(coalesce(corrective_action, ''))) > 0)
);

create index compliance_form_submissions_venue_form_time_idx
  on compliance_form_submissions (venue_id, form_id, submitted_at);

alter table compliance_form_submissions enable row level security;

create policy compliance_submissions_select on compliance_form_submissions
  for select using (
    venue_id = private.auth_venue_id()
    and (
      private.auth_is_manager_tier()
      or submitted_by = private.auth_app_user_id()
      or private.auth_department() = any (visible_to_roles)
    )
  );

create policy compliance_submissions_insert on compliance_form_submissions
  for insert with check (
    venue_id = private.auth_venue_id()
    and submitted_by = private.auth_app_user_id()
  );

-- No UPDATE or DELETE policy for anyone. RLS denies both outright.

-- Column privileges: clients can never set the snapshot audience or the
-- server-stamped fields directly. The API route (Stage 0b) sets
-- visible_to_roles server-side from the catalog via a service-role client
-- or SECURITY DEFINER function.
revoke insert on compliance_form_submissions from authenticated, anon;
grant insert (venue_id, form_id, submitted_by, payload, out_of_range,
              corrective_action, device_stamp, corrects_submission_id)
  on compliance_form_submissions to authenticated;
grant select on compliance_form_submissions to authenticated;

-- Server-side stamping + same-venue link check on insert.
create or replace function private.compliance_submission_before_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  link_venue uuid;
begin
  new.submitted_at := now();
  select name into new.submitted_by_name from app_users where id = new.submitted_by;
  if new.submitted_by_name is null then
    raise exception 'submitted_by must reference an existing staff account';
  end if;
  if new.corrects_submission_id is not null then
    select venue_id into link_venue from compliance_form_submissions where id = new.corrects_submission_id;
    if link_venue is distinct from new.venue_id then
      raise exception 'A correction must link to a record in the same venue';
    end if;
  end if;
  return new;
end;
$$;

create trigger compliance_submission_before_insert
  before insert on compliance_form_submissions
  for each row execute function private.compliance_submission_before_insert();

-- Second wall behind RLS: immutability. Client roles can never UPDATE or
-- DELETE. Service role / postgres (migrations, the venue cascade) still can,
-- which is the only way test rows are ever removed.
create or replace function private.compliance_submission_immutable()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    raise exception 'compliance_form_submissions is insert-only';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger compliance_submission_immutable
  before update or delete on compliance_form_submissions
  for each row execute function private.compliance_submission_immutable();

-- ---------------------------------------------------------------------------
-- venue_compliance_settings: one row per venue
-- ---------------------------------------------------------------------------
create table venue_compliance_settings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null unique references venues(id) on delete cascade,
  high_risk_activities text[] not null default '{}',
  offers_accommodation boolean not null default false,
  trade_waste_agreement text not null default 'unsure',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_compliance_settings_trade_waste_check
    check (trade_waste_agreement in ('yes', 'no', 'unsure')),
  constraint venue_compliance_settings_activities_check
    check (high_risk_activities <@ array['sous_vide', 'raw_egg', 'rare_minced_meat', 'off_site_catering', 'modified_atmosphere'])
);

alter table venue_compliance_settings enable row level security;

create policy compliance_settings_select on venue_compliance_settings
  for select using (venue_id = private.auth_venue_id());
create policy compliance_settings_insert on venue_compliance_settings
  for insert with check (venue_id = private.auth_venue_id() and private.auth_is_manager_tier());
create policy compliance_settings_update on venue_compliance_settings
  for update using (venue_id = private.auth_venue_id() and private.auth_is_manager_tier())
  with check (venue_id = private.auth_venue_id() and private.auth_is_manager_tier());

-- ---------------------------------------------------------------------------
-- venue_refrigeration_units: retire with is_active, never delete
-- ---------------------------------------------------------------------------
create table venue_refrigeration_units (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  name text not null,
  unit_type text not null,
  -- Safe range in degrees C. Defaults from the Build Reference (cold <= 5,
  -- frozen <= -15, hot hold >= 60) are applied by the wizard, not here.
  min_temp_c numeric,
  max_temp_c numeric,
  station_id uuid references stations(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_refrigeration_units_type_check
    check (unit_type in ('cold', 'frozen', 'hot_hold')),
  constraint venue_refrigeration_units_range_check
    check (
      (unit_type in ('cold', 'frozen') and max_temp_c is not null)
      or (unit_type = 'hot_hold' and min_temp_c is not null)
    ),
  constraint venue_refrigeration_units_order_check
    check (min_temp_c is null or max_temp_c is null or min_temp_c <= max_temp_c)
);

create index venue_refrigeration_units_venue_idx on venue_refrigeration_units (venue_id, is_active);

alter table venue_refrigeration_units enable row level security;

create policy refrigeration_units_select on venue_refrigeration_units
  for select using (venue_id = private.auth_venue_id());
create policy refrigeration_units_insert on venue_refrigeration_units
  for insert with check (venue_id = private.auth_venue_id() and private.auth_is_manager_tier());
create policy refrigeration_units_update on venue_refrigeration_units
  for update using (venue_id = private.auth_venue_id() and private.auth_is_manager_tier())
  with check (venue_id = private.auth_venue_id() and private.auth_is_manager_tier());
-- No DELETE policy: units are retired via is_active = false so past readings
-- keep a stable unit to point at.
