-- Compliance Forms Stage 0b: write path for B2 (cold, frozen and hot storage
-- temperature log). Plan approved by John 1 Oct 2026; revised after the
-- Auditor's read-only review of the first draft.
--
-- 1. client_request_id: idempotency key. Ledger rows can never be deleted, so
--    a double tap or retry must not create a permanent duplicate.
-- 2. The BEFORE INSERT trigger now stamps submitted_at with clock_timestamp()
--    (real wall clock, so entries in one transaction keep their order) and
--    requires submitted_by to belong to the row's venue.
-- 3. public.submit_compliance_form(): the ONLY write path. SECURITY DEFINER,
--    EXECUTE for service_role only (called by the Next route after the session
--    is verified; the staff id comes from the session, never the request body).
--    It derives submitted_by and the staff name, enforces venue membership and
--    the audience gate, loads each unit and computes out_of_range itself, and
--    rejects an out of range reading with no note. Clients never supply those
--    fields. Only the LATEST effective reading of a unit can be corrected, so
--    the view, the episode check and the timeline always agree.
-- 4. Direct client INSERT on the ledger is revoked and its policy dropped.
--    service_role also loses INSERT and UPDATE on the ledger (the function runs
--    as its owner), so "only write path" holds in the database, not by habit.
--    service_role keeps SELECT and DELETE (test cleanup, venue cascade).
-- 5. compliance_alert_log: one row per out of range EPISODE start, so the owner
--    email is sent once per episode and a retry after a crash can still send it.
-- 6. View compliance_b2_latest_readings: latest effective reading per unit (a
--    corrected reading is superseded). security_invoker, so RLS applies.
--
-- visible_to_roles is passed in by the route from the static TS catalog (the
-- database cannot read the catalog); the function validates it is a subset of
-- {BOH, FOH}. Only service_role can call the function, so a client can never
-- choose its own audience.
--
-- ROLLBACK (do not drop client_request_id once rows exist):
--   drop view public.compliance_b2_latest_readings;
--   drop table compliance_alert_log;
--   drop function public.submit_compliance_form(uuid, uuid, text, text[], jsonb, text);
--   drop index compliance_form_submissions_corrects_idx, compliance_form_submissions_b2_unit_idx;
--   grant insert (venue_id, form_id, submitted_by, payload, out_of_range, corrective_action,
--     device_stamp, corrects_submission_id) on compliance_form_submissions to authenticated;
--   re-create policy compliance_submissions_insert (see 20260930000000) and the 0a trigger body;
--   grant insert, update on compliance_form_submissions to service_role;

-- 1. idempotency key
alter table compliance_form_submissions add column if not exists client_request_id uuid;
create unique index if not exists compliance_form_submissions_client_request_idx
  on compliance_form_submissions (venue_id, client_request_id)
  where client_request_id is not null;

-- a reading can be corrected once (enforced by the database, not just the function)
create unique index if not exists compliance_form_submissions_corrects_idx
  on compliance_form_submissions (corrects_submission_id)
  where corrects_submission_id is not null;

-- per unit lookups (latest reading, episode check)
create index if not exists compliance_form_submissions_b2_unit_idx
  on compliance_form_submissions (venue_id, (payload ->> 'unit_id'), submitted_at desc)
  where form_id = 'B2';

-- 2. trigger
create or replace function private.compliance_submission_before_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  staff_venue uuid;
  link_venue uuid;
begin
  new.submitted_at := clock_timestamp();
  select name, venue_id into new.submitted_by_name, staff_venue from app_users where id = new.submitted_by;
  if new.submitted_by_name is null then
    raise exception 'submitted_by must reference an existing staff account';
  end if;
  if staff_venue is distinct from new.venue_id then
    raise exception 'submitted_by must belong to the same venue as the record';
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

-- 5. alert log (created before the function so the function can be reviewed top to bottom)
create table if not exists compliance_alert_log (
  submission_id uuid primary key references compliance_form_submissions(id) on delete cascade,
  venue_id uuid not null references venues(id) on delete cascade,
  kind text not null default 'b2_out_of_range_episode',
  created_at timestamptz not null default now(),
  email_sent_at timestamptz,
  email_attempts int not null default 0,
  email_error text
);
create index if not exists compliance_alert_log_venue_idx on compliance_alert_log (venue_id, created_at desc);
alter table compliance_alert_log enable row level security;
drop policy if exists compliance_alert_log_select on compliance_alert_log;
create policy compliance_alert_log_select on compliance_alert_log
  for select using (venue_id = private.auth_venue_id() and private.auth_is_manager_tier());
revoke all on compliance_alert_log from anon, public;
revoke insert, update, delete, truncate, references, trigger on compliance_alert_log from authenticated;
grant select on compliance_alert_log to authenticated;

-- 3. the write path
create or replace function public.submit_compliance_form(
  p_venue_id uuid,
  p_staff_id uuid,
  p_form_id text,
  p_visible_to_roles text[],
  p_entries jsonb,
  p_device_stamp text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_staff record;
  v_is_mgr boolean;
  v_audience text[];
  v_entry jsonb;
  v_unit record;
  v_existing record;
  v_unit_id uuid;
  v_reading numeric;
  v_oor boolean;
  v_note text;
  v_corrects uuid;
  v_target_oor boolean;
  v_target_epi boolean;
  v_epi boolean;
  v_unit_ids uuid[];
  v_latest uuid;
  v_crid uuid;
  v_prev_oor boolean;
  v_new_episode boolean;
  v_limit numeric;
  v_limit_kind text;
  v_id uuid;
  v_results jsonb := '[]'::jsonb;
begin
  if p_form_id is distinct from 'B2' then
    raise exception 'Form % is not supported', p_form_id;
  end if;
  if p_visible_to_roles is null or cardinality(p_visible_to_roles) = 0
     or not (p_visible_to_roles <@ array['BOH', 'FOH']) then
    raise exception 'Invalid audience';
  end if;
  select array_agg(distinct x order by x) into v_audience from unnest(p_visible_to_roles) x;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array'
     or jsonb_array_length(p_entries) = 0 or jsonb_array_length(p_entries) > 60 then
    raise exception 'Entries must be an array of 1 to 60 readings';
  end if;

  select au.id, au.name, au.venue_id, au.role, au.deactivated_at, sr.department, sr.fallback_tier
    into v_staff
  from app_users au
  left join staff_roles sr on sr.id = au.staff_role_id
  where au.id = p_staff_id;

  if not found or v_staff.venue_id is distinct from p_venue_id or v_staff.deactivated_at is not null then
    raise exception 'Staff member does not belong to this venue';
  end if;

  v_is_mgr := v_staff.role in ('owner', 'manager') or coalesce(v_staff.fallback_tier, 'frontline') = 'authorized';
  if not v_is_mgr and (v_staff.department is null or not (v_staff.department = any (v_audience))) then
    raise exception 'This staff member may not submit this form';
  end if;

  -- pre-pass: every entry is an object with a valid unit_id, each unit at most once per call
  -- (compared as uuids, so case or hyphen variants cannot slip past)
  v_unit_ids := '{}';
  for v_entry in select e from jsonb_array_elements(p_entries) e loop
    if jsonb_typeof(v_entry) <> 'object' then
      raise exception 'Each entry must be an object';
    end if;
    begin
      v_unit_id := (v_entry ->> 'unit_id')::uuid;
    exception when others then
      raise exception 'Each entry needs a valid unit_id';
    end;
    if v_unit_id is null then
      raise exception 'Each entry needs a unit_id';
    end if;
    v_unit_ids := v_unit_ids || v_unit_id;
  end loop;
  if (select count(*) <> count(distinct u) from unnest(v_unit_ids) u) then
    raise exception 'Each unit can appear only once per submission';
  end if;

  -- process in unit order so two concurrent calls take their locks in the same order (no deadlock)
  for v_entry in select e from jsonb_array_elements(p_entries) e order by ((e ->> 'unit_id')::uuid) loop
    begin
      v_crid := (v_entry ->> 'client_request_id')::uuid;
    exception when others then
      raise exception 'Each entry needs a valid client_request_id';
    end;
    if v_crid is null then
      raise exception 'Each entry needs a client_request_id';
    end if;
    begin
      v_unit_id := (v_entry ->> 'unit_id')::uuid;
    exception when others then
      raise exception 'Each entry needs a valid unit_id';
    end;
    if v_unit_id is null then
      raise exception 'Each entry needs a unit_id';
    end if;
    begin
      v_corrects := nullif(v_entry ->> 'corrects_submission_id', '')::uuid;
    exception when others then
      raise exception 'corrects_submission_id is not valid';
    end;

    -- one writer per unit at a time; the lock comes before the replay check so
    -- a concurrent double tap waits and then sees the first insert
    perform pg_advisory_xact_lock(hashtextextended(v_unit_id::text, 0));

    if jsonb_typeof(v_entry -> 'reading_c') is distinct from 'number' then
      raise exception 'reading_c must be a number';
    end if;

    -- idempotent replay: same id must mean the same reading
    select s.id, s.out_of_range, s.payload, s.submitted_by, s.corrects_submission_id into v_existing
    from compliance_form_submissions s
    where s.venue_id = p_venue_id and s.client_request_id = v_crid;
    if found then
      if v_existing.payload ->> 'unit_id' is distinct from v_unit_id::text
         or v_existing.submitted_by is distinct from p_staff_id
         or v_existing.corrects_submission_id is distinct from v_corrects
         or (v_existing.payload ->> 'reading_c')::numeric is distinct from (v_entry ->> 'reading_c')::numeric then
        raise exception 'This request id was already used for a different reading';
      end if;
      v_results := v_results || jsonb_build_object(
        'id', v_existing.id,
        'unit_id', v_existing.payload ->> 'unit_id',
        'unit_name', v_existing.payload ->> 'unit_name',
        'reading_c', (v_existing.payload ->> 'reading_c')::numeric,
        'out_of_range', v_existing.out_of_range,
        'inserted', false,
        'new_episode', coalesce((v_existing.payload ->> 'episode_start')::boolean, false));
      continue;
    end if;

    v_reading := (v_entry ->> 'reading_c')::numeric;
    if v_reading < -60 or v_reading > 150 then
      raise exception 'reading_c must be between -60 and 150';
    end if;

    select u.* into v_unit
    from venue_refrigeration_units u
    where u.id = v_unit_id and u.venue_id = p_venue_id and u.is_active;
    if not found then
      raise exception 'Unit not found for this venue';
    end if;

    v_oor := (v_unit.max_temp_c is not null and v_reading > v_unit.max_temp_c)
          or (v_unit.min_temp_c is not null and v_reading < v_unit.min_temp_c);
    v_note := nullif(btrim(coalesce(v_entry ->> 'corrective_action', '')), '');
    if v_oor and v_note is null then
      raise exception 'A corrective action is required for an out of range reading';
    end if;

    -- the latest effective reading of this unit (a corrected reading is superseded)
    select s.id into v_latest
    from compliance_form_submissions s
    where s.venue_id = p_venue_id and s.form_id = 'B2' and s.payload ->> 'unit_id' = v_unit.id::text
      and not exists (select 1 from compliance_form_submissions c where c.corrects_submission_id = s.id)
    order by s.submitted_at desc, s.id desc
    limit 1;

    v_target_oor := null;
    v_target_epi := null;
    if v_corrects is not null then
      select s.out_of_range, coalesce((s.payload ->> 'episode_start')::boolean, false) into v_target_oor, v_target_epi
      from compliance_form_submissions s
      where s.id = v_corrects and s.venue_id = p_venue_id and s.form_id = 'B2'
        and s.payload ->> 'unit_id' = v_unit.id::text;
      if not found then
        raise exception 'A correction must link to a B2 reading for the same unit';
      end if;
      if exists (select 1 from compliance_form_submissions c where c.corrects_submission_id = v_corrects) then
        raise exception 'That reading has already been corrected';
      end if;
      if v_latest is distinct from v_corrects then
        raise exception 'Only the latest reading for a unit can be corrected';
      end if;
    end if;

    -- episode check: first out of range reading since this unit was last in range?
    -- (the reading being corrected is excluded: the correction replaces it)
    select s.out_of_range into v_prev_oor
    from compliance_form_submissions s
    where s.venue_id = p_venue_id and s.form_id = 'B2' and s.payload ->> 'unit_id' = v_unit.id::text
      and not exists (select 1 from compliance_form_submissions c where c.corrects_submission_id = s.id)
      and (v_corrects is null or s.id <> v_corrects)
    order by s.submitted_at desc, s.id desc
    limit 1;
    -- correcting an out of range reading with another out of range reading continues the same episode
    v_new_episode := v_oor
      and (v_corrects is null or not v_target_oor)
      and not coalesce(v_prev_oor, false);

    -- the flag stored on the reading: starts an episode, or inherits the start when it replaces
    -- an out of range reading with another out of range reading (same episode)
    v_epi := v_new_episode or (v_corrects is not null and v_oor and coalesce(v_target_oor, false) and coalesce(v_target_epi, false));

    if v_unit.unit_type = 'hot_hold' then
      v_limit_kind := 'min'; v_limit := v_unit.min_temp_c;
    else
      v_limit_kind := 'max'; v_limit := v_unit.max_temp_c;
    end if;

    insert into compliance_form_submissions (
      venue_id, form_id, submitted_by, payload, out_of_range, corrective_action,
      device_stamp, corrects_submission_id, visible_to_roles, client_request_id
    ) values (
      p_venue_id, 'B2', p_staff_id,
      jsonb_build_object(
        'unit_id', v_unit.id,
        'unit_name', v_unit.name,
        'unit_type', v_unit.unit_type,
        'station_id', v_unit.station_id,
        'reading_c', v_reading,
        'limit_kind', v_limit_kind,
        'limit_c', v_limit,
        'episode_start', v_epi),
      v_oor, v_note, left(p_device_stamp, 300), v_corrects, v_audience, v_crid
    ) returning id into v_id;

    -- owner alert bookkeeping, same transaction as the reading
    if v_corrects is not null and v_oor and v_target_oor then
      -- same episode continues: an unsent alert moves from the corrected reading to this one
      update compliance_alert_log set submission_id = v_id
      where submission_id = v_corrects and email_sent_at is null;
    elsif v_corrects is not null and not v_oor and v_target_oor then
      -- the corrected reading is now in range: an unsent alert was a false alarm
      delete from compliance_alert_log where submission_id = v_corrects and email_sent_at is null;
    end if;
    if v_new_episode then
      insert into compliance_alert_log (submission_id, venue_id) values (v_id, p_venue_id)
      on conflict do nothing;
    end if;

    v_results := v_results || jsonb_build_object(
      'id', v_id,
      'unit_id', v_unit.id,
      'unit_name', v_unit.name,
      'reading_c', v_reading,
      'out_of_range', v_oor,
      'inserted', true,
      'new_episode', v_epi);
  end loop;

  return v_results;
end;
$$;

revoke all on function public.submit_compliance_form(uuid, uuid, text, text[], jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_compliance_form(uuid, uuid, text, text[], jsonb, text) to service_role;

-- 4. the function is the only write path
drop policy if exists compliance_submissions_insert on compliance_form_submissions;
revoke insert on compliance_form_submissions from authenticated;
revoke insert, update on compliance_form_submissions from service_role;

-- 6. latest effective reading per unit (RLS applies to the caller)
create or replace view public.compliance_b2_latest_readings
with (security_invoker = true) as
select distinct on (s.venue_id, s.payload ->> 'unit_id')
  s.id,
  s.venue_id,
  (s.payload ->> 'unit_id')::uuid as unit_id,
  s.payload,
  s.out_of_range,
  s.corrective_action,
  s.submitted_at,
  s.submitted_by_name
from compliance_form_submissions s
where s.form_id = 'B2'
  and not exists (select 1 from compliance_form_submissions c where c.corrects_submission_id = s.id)
order by s.venue_id, s.payload ->> 'unit_id', s.submitted_at desc, s.id desc;

revoke all on public.compliance_b2_latest_readings from anon, authenticated, public;
grant select on public.compliance_b2_latest_readings to authenticated, service_role;
