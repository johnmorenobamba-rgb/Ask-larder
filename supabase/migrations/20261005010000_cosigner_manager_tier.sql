-- Cosigner rule inside the database (predeploy task 2). Until now the route checked that the second signer was a manager tier
-- person but the function itself only checked "a different, active person of this venue". Now the function refuses a second
-- signer who is not owner, manager or an authorized role (staff_roles.fallback_tier = authorized), so a bug or a second caller
-- cannot sign with a frontline colleague. The only change to the function is the cosigner lookup in step 8.
-- ROLLBACK: re-run the create or replace function submit_compliance_record statement (through its grant line) from
-- 20261004020000_bar_department.sql.

create or replace function public.submit_compliance_record(
  p_venue_id uuid,
  p_staff_id uuid,
  p_form_id text,
  p_gate_roles text[],
  p_visible_roles text[],
  p_rules jsonb,
  p_entry jsonb,
  p_device_stamp text,
  p_cosigner_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_staff record;
  v_is_mgr boolean;
  v_gate text[];
  v_visible text[];
  v_crid uuid;
  v_corrects uuid;
  v_chain uuid;
  v_values jsonb := '{}'::jsonb;
  v_labels jsonb := '{}'::jsonb;
  v_in jsonb;
  f jsonb;
  r jsonb;
  it jsonb;
  v_key text;
  v_type text;
  v_val jsonb;
  v_req boolean;
  v_num numeric;
  v_min numeric;
  v_max numeric;
  v_fail boolean := false;
  v_reasons text[] := '{}';
  v_hit boolean;
  v_note text;
  v_subject text := 'form';
  v_subject_field text;
  v_stage jsonb := p_rules -> 'stage';
  v_stage_key text;
  v_existing record;
  v_latest uuid;
  v_target_id uuid;
  v_target_oor boolean;
  v_target_epi boolean;
  v_start record;
  v_elapsed numeric;
  v_prev_fail boolean;
  v_epi boolean;
  v_event boolean;
  v_id uuid := gen_random_uuid();
  v_cosign_name text;
  v_payload jsonb;
  v_ok boolean;
  v_item_keys text[];
  v_obj_key text;
begin
  -- 0. the call itself
  if p_form_id is null or p_form_id !~ '^[A-Za-z0-9_]{1,40}$' then
    raise exception 'Invalid form id';
  end if;
  if p_form_id = 'B2' then
    raise exception 'Form B2 uses submit_compliance_form';
  end if;
  if p_rules is null or jsonb_typeof(p_rules) <> 'object' or coalesce(p_rules ->> 'version', '') <> '1'
     or jsonb_typeof(p_rules -> 'fields') is distinct from 'array' or jsonb_array_length(p_rules -> 'fields') > 40 then
    raise exception 'Invalid rules';
  end if;
  if p_entry is null or jsonb_typeof(p_entry) <> 'object' or pg_column_size(p_entry) > 32768 then
    raise exception 'Invalid entry';
  end if;
  if p_gate_roles is null or cardinality(p_gate_roles) = 0 or not (p_gate_roles <@ array['BOH', 'FOH', 'BAR']) then
    raise exception 'Invalid audience';
  end if;
  if p_visible_roles is null or cardinality(p_visible_roles) = 0 or not (p_visible_roles <@ array['BOH', 'FOH', 'BAR']) then
    raise exception 'Invalid audience';
  end if;
  if exists (select 1 from venue_compliance_forms vf where vf.venue_id = p_venue_id and vf.form_id = p_form_id and not vf.enabled) then
    raise exception 'This form is switched off for this venue';
  end if;
  for r in select e from jsonb_array_elements(coalesce(p_rules -> 'fail', '[]'::jsonb)) e loop
    if not exists (select 1 from jsonb_array_elements(p_rules -> 'fields') fe where fe ->> 'key' = r ->> 'field') then
      raise exception 'Invalid rules';
    end if;
  end loop;
  select array_agg(distinct x order by x) into v_gate from unnest(p_gate_roles) x;
  select array_agg(distinct x order by x) into v_visible from unnest(p_visible_roles) x;
  v_event := coalesce((p_rules ->> 'event')::boolean, false);

  -- 1. who: derived from the staff id, never trusted from the entry
  select au.id, au.name, au.venue_id, au.role, au.deactivated_at, sr.department, sr.fallback_tier
    into v_staff
  from app_users au
  left join staff_roles sr on sr.id = au.staff_role_id
  where au.id = p_staff_id;
  if not found or v_staff.venue_id is distinct from p_venue_id or v_staff.deactivated_at is not null then
    raise exception 'Staff member does not belong to this venue';
  end if;
  v_is_mgr := v_staff.role in ('owner', 'manager') or coalesce(v_staff.fallback_tier, 'frontline') = 'authorized';
  if not v_is_mgr and (v_staff.department is null or not (v_staff.department = any (v_gate))) then
    raise exception 'This staff member may not submit this form';
  end if;

  -- 2. ids
  begin
    v_crid := (p_entry ->> 'client_request_id')::uuid;
  exception when others then
    raise exception 'The entry needs a valid client_request_id';
  end;
  if v_crid is null then
    raise exception 'The entry needs a client_request_id';
  end if;
  begin
    v_corrects := nullif(p_entry ->> 'corrects_submission_id', '')::uuid;
  exception when others then
    raise exception 'corrects_submission_id is not valid';
  end;
  begin
    v_chain := nullif(p_entry ->> 'chain_id', '')::uuid;
  exception when others then
    raise exception 'chain_id is not valid';
  end;
  if jsonb_typeof(p_entry -> 'values') is distinct from 'object' then
    raise exception 'The entry needs values';
  end if;
  v_in := p_entry -> 'values';

  -- 3. every value against the rules (the function, not the browser, decides what is valid)
  for f in select e from jsonb_array_elements(p_rules -> 'fields') e loop
    v_key := f ->> 'key';
    v_type := f ->> 'type';
    if v_key is null or v_key !~ '^[a-z][a-z0-9_]{0,40}$' then
      raise exception 'Invalid rules';
    end if;
    v_req := coalesce((f ->> 'required')::boolean, true);
    v_val := v_in -> v_key;
    if v_val is null or jsonb_typeof(v_val) = 'null' then
      if v_req then
        raise exception 'Field % is required', v_key;
      end if;
      continue;
    end if;

    if v_type in ('number', 'money') then
      if jsonb_typeof(v_val) <> 'number' then
        raise exception 'Field % must be a number', v_key;
      end if;
      v_num := (v_in ->> v_key)::numeric;
      v_min := coalesce((f ->> 'min')::numeric, case when v_type = 'money' then 0 else -1000000 end);
      v_max := coalesce((f ->> 'max')::numeric, 10000000);
      if v_num < v_min or v_num > v_max then
        raise exception 'Field % must be between % and %', v_key, v_min, v_max;
      end if;
      if v_type = 'money' and v_num <> round(v_num, 2) then
        raise exception 'Field % must have at most 2 decimal places', v_key;
      end if;
      v_values := v_values || jsonb_build_object(v_key, v_num);
    elsif v_type = 'time' then
      if jsonb_typeof(v_val) <> 'string' or (v_in ->> v_key) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
        raise exception 'Field % must be a time as HH:MM', v_key;
      end if;
      v_values := v_values || jsonb_build_object(v_key, v_in ->> v_key);
    elsif v_type = 'passfail' then
      if jsonb_typeof(v_val) <> 'string' or (v_in ->> v_key) not in ('pass', 'fail') then
        raise exception 'Field % must be pass or fail', v_key;
      end if;
      v_values := v_values || jsonb_build_object(v_key, v_in ->> v_key);
    elsif v_type = 'choice' then
      if jsonb_typeof(v_val) <> 'string'
         or not exists (select 1 from jsonb_array_elements_text(coalesce(f -> 'options', '[]'::jsonb)) o where o = (v_in ->> v_key)) then
        raise exception 'Field % is not one of the allowed choices', v_key;
      end if;
      v_values := v_values || jsonb_build_object(v_key, v_in ->> v_key);
    elsif v_type = 'text' then
      if jsonb_typeof(v_val) <> 'string' then
        raise exception 'Field % must be text', v_key;
      end if;
      if length(btrim(v_in ->> v_key)) = 0 then
        if v_req then
          raise exception 'Field % is required', v_key;
        end if;
        continue;
      end if;
      if length(v_in ->> v_key) > coalesce((f ->> 'maxLength')::int, 500) then
        raise exception 'Field % is too long', v_key;
      end if;
      v_values := v_values || jsonb_build_object(v_key, btrim(v_in ->> v_key));
    elsif v_type = 'checklist' then
      if jsonb_typeof(v_val) <> 'object' or jsonb_typeof(f -> 'items') is distinct from 'array'
         or jsonb_array_length(f -> 'items') = 0 or jsonb_array_length(f -> 'items') > 80 then
        raise exception 'Field % must be a checklist', v_key;
      end if;
      v_item_keys := '{}';
      for it in select e from jsonb_array_elements(f -> 'items') e loop
        v_item_keys := v_item_keys || (it ->> 'key');
        if jsonb_typeof(v_val -> (it ->> 'key')) is distinct from 'string'
           or (v_val ->> (it ->> 'key')) not in ('pass', 'fail', 'na') then
          raise exception 'Every checklist item needs pass, fail or n/a';
        end if;
        v_labels := v_labels || jsonb_build_object(v_key || '.' || (it ->> 'key'), left(coalesce(it ->> 'label', ''), 120));
      end loop;
      for v_obj_key in select k from jsonb_object_keys(v_val) k loop
        if not (v_obj_key = any (v_item_keys)) then
          raise exception 'Unknown checklist item';
        end if;
      end loop;
      if not exists (select 1 from jsonb_each_text(v_val) kv where kv.value <> 'na') then
        raise exception 'At least one check must apply';
      end if;
      v_values := v_values || jsonb_build_object(v_key, v_val);
    else
      raise exception 'Invalid rules';
    end if;
  end loop;
  -- unknown keys in the entry values are refused, never stored
  for v_obj_key in select k from jsonb_object_keys(v_in) k loop
    if not exists (select 1 from jsonb_array_elements(p_rules -> 'fields') e where e ->> 'key' = v_obj_key) then
      raise exception 'Unknown field %', v_obj_key;
    end if;
  end loop;

  -- 4. subject (what a correction chain and a register row are about)
  v_subject_field := p_rules #>> '{subject,field}';
  if v_subject_field is not null then
    if v_values ->> v_subject_field is null then
      raise exception 'The subject field is required';
    end if;
    v_subject := left(lower(regexp_replace(btrim(v_values ->> v_subject_field), '\s+', ' ', 'g')), 80);
  end if;

  -- one writer per form and subject at a time (the lock comes before the replay check)
  perform pg_advisory_xact_lock(hashtextextended(p_venue_id::text || '|' || p_form_id || '|' || v_subject, 0));

  -- 5. idempotent replay: the same id must mean the same record
  select s.id, s.out_of_range, s.payload, s.submitted_by, s.corrects_submission_id, s.form_id, s.corrective_action
    into v_existing
  from compliance_form_submissions s
  where s.venue_id = p_venue_id and s.client_request_id = v_crid;
  if found then
    if v_existing.form_id is distinct from p_form_id
       or v_existing.submitted_by is distinct from p_staff_id
       or v_existing.corrects_submission_id is distinct from v_corrects
       or v_existing.payload -> 'values' is distinct from v_values then
      raise exception 'This request id was already used for a different record';
    end if;
    return jsonb_build_object(
      'id', v_existing.id,
      'out_of_range', v_existing.out_of_range,
      'inserted', false,
      'episode_start', coalesce((v_existing.payload ->> 'episode_start')::boolean, false),
      'chain_id', v_existing.payload ->> 'chain_id',
      'fail_reasons', coalesce(v_existing.payload -> 'fail_reasons', '[]'::jsonb));
  end if;

  -- 6. stages (two stage cooling, allergen ticket): chain and elapsed time from the SERVER clock
  v_stage_key := v_stage ->> 'key';
  if v_stage is not null then
    if v_stage_key is null or v_stage_key !~ '^[a-z][a-z0-9_]{0,30}$' or v_stage ->> 'chain' not in ('new', 'existing')
       or (v_stage ->> 'chain' = 'existing' and coalesce(v_stage ->> 'requires', '') = '') then
      raise exception 'Invalid rules';
    end if;
    if coalesce(v_stage ->> 'chain', '') = 'new' then
      if v_chain is not null then
        raise exception 'A new chain cannot name an existing chain';
      end if;
      v_chain := v_id;
    else
      if v_chain is null then
        raise exception 'This step needs the chain it belongs to';
      end if;
      select s.id, s.submitted_at, s.payload into v_start
      from compliance_form_submissions s
      where s.id = v_chain and s.venue_id = p_venue_id and s.form_id = p_form_id
        and s.payload ->> 'stage' = coalesce(v_stage ->> 'requires', '')
        and s.payload ->> 'chain_id' = v_chain::text;
      if not found then
        raise exception 'The chain for this step was not found';
      end if;
      if exists (select 1 from compliance_form_submissions s
                 where s.venue_id = p_venue_id and s.form_id = p_form_id
                   and s.payload ->> 'chain_id' = v_chain::text and s.payload ->> 'stage' = v_stage_key) then
        raise exception 'That step has already been logged for this chain';
      end if;
      if jsonb_typeof(v_stage -> 'requires_prior') = 'array' then
        for v_obj_key in select jsonb_array_elements_text(v_stage -> 'requires_prior') loop
          if not exists (select 1 from compliance_form_submissions s
                         where s.venue_id = p_venue_id and s.form_id = p_form_id
                           and s.payload ->> 'chain_id' = v_chain::text and s.payload ->> 'stage' = v_obj_key) then
            raise exception 'An earlier step in this chain is missing';
          end if;
        end loop;
      end if;
      if jsonb_typeof(v_stage -> 'soft_prior') = 'array' then
        for v_obj_key in select jsonb_array_elements_text(v_stage -> 'soft_prior') loop
          if not exists (select 1 from compliance_form_submissions s
                         where s.venue_id = p_venue_id and s.form_id = p_form_id
                           and s.payload ->> 'chain_id' = v_chain::text and s.payload ->> 'stage' = v_obj_key) then
            v_fail := true;
            v_reasons := v_reasons || coalesce(v_stage ->> 'soft_prior_label', 'An earlier check was missed');
          end if;
        end loop;
      end if;
      v_elapsed := extract(epoch from (clock_timestamp() - v_start.submitted_at)) / 60.0;
      if (v_stage ->> 'elapsed_max_min') is not null and v_elapsed > (v_stage ->> 'elapsed_max_min')::numeric then
        v_fail := true;
        v_reasons := v_reasons || coalesce(v_stage ->> 'elapsed_label', 'Logged too late');
      end if;
    end if;
  elsif v_chain is not null then
    raise exception 'This form has no chain';
  end if;

  -- 7. pass or fail, decided here from the rules
  for r in select e from jsonb_array_elements(coalesce(p_rules -> 'fail', '[]'::jsonb)) e loop
    v_key := r ->> 'field';
    v_val := v_values -> v_key;
    if v_val is null then
      continue;
    end if;
    if r -> 'when' is not null and (v_values ->> (r #>> '{when,field}')) is distinct from (r #>> '{when,value}') then
      continue;
    end if;
    v_hit := false;
    case r ->> 'op'
      when 'gt' then v_hit := (v_values ->> v_key)::numeric > (r ->> 'value')::numeric;
      when 'gte' then v_hit := (v_values ->> v_key)::numeric >= (r ->> 'value')::numeric;
      when 'lt' then v_hit := (v_values ->> v_key)::numeric < (r ->> 'value')::numeric;
      when 'lte' then v_hit := (v_values ->> v_key)::numeric <= (r ->> 'value')::numeric;
      when 'outside' then v_hit := (v_values ->> v_key)::numeric < (r ->> 'min')::numeric
                                or (v_values ->> v_key)::numeric > (r ->> 'max')::numeric;
      when 'eq' then v_hit := (v_values ->> v_key) = (r ->> 'value');
      when 'neq' then v_hit := (v_values ->> v_key) <> (r ->> 'value');
      when 'in' then v_hit := exists (select 1 from jsonb_array_elements_text(r -> 'values') o where o = (v_values ->> v_key));
      when 'differs' then v_hit := (v_values ->> (r ->> 'other')) is not null
                                and abs((v_values ->> v_key)::numeric - (v_values ->> (r ->> 'other'))::numeric) > coalesce((r ->> 'value')::numeric, 0);
      when 'any_fail' then v_hit := exists (select 1 from jsonb_each_text(v_val) kv where kv.value = 'fail');
      else raise exception 'Invalid rules';
    end case;
    if v_hit then
      v_fail := true;
      v_reasons := v_reasons || coalesce(r ->> 'label', 'Did not pass');
    end if;
  end loop;

  v_note := nullif(btrim(coalesce(p_entry ->> 'corrective_action', '')), '');
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'The note is too long';
  end if;
  if v_fail and v_note is null then
    raise exception 'A corrective action is required for a fail';
  end if;

  -- 8. cosign (two person sign off): a different, active MANAGER TIER person of this venue (owner, manager, or an authorized role), PIN verified by the route
  if coalesce((p_rules ->> 'cosign')::boolean, false) then
    if p_cosigner_id is null or p_cosigner_id = p_staff_id then
      raise exception 'A second person must sign off';
    end if;
    select au.name into v_cosign_name from app_users au
    left join staff_roles sr on sr.id = au.staff_role_id
    where au.id = p_cosigner_id and au.venue_id = p_venue_id and au.deactivated_at is null
      and (au.role in ('owner', 'manager') or coalesce(sr.fallback_tier, 'frontline') = 'authorized');
    if v_cosign_name is null then
      raise exception 'The second person must be an active manager or supervisor of this venue';
    end if;
  elsif p_cosigner_id is not null then
    raise exception 'This form does not take a second signature';
  end if;

  -- 9. corrections: only the latest effective record of the same subject, once, and not for staged forms
  v_target_id := null;
  if v_corrects is not null then
    if v_stage is not null or not coalesce((p_rules ->> 'allow_correction')::boolean, false) then
      raise exception 'This form does not take corrections';
    end if;
    select s.id, s.out_of_range, coalesce((s.payload ->> 'episode_start')::boolean, false) into v_target_id, v_target_oor, v_target_epi
    from compliance_form_submissions s
    where s.id = v_corrects and s.venue_id = p_venue_id and s.form_id = p_form_id and s.payload ->> 'subject_key' = v_subject;
    if not found then
      raise exception 'A correction must link to a record of the same form and subject';
    end if;
    if exists (select 1 from compliance_form_submissions c where c.corrects_submission_id = v_corrects) then
      raise exception 'That record has already been corrected';
    end if;
    select s.id into v_latest from compliance_form_submissions s
    where s.venue_id = p_venue_id and s.form_id = p_form_id and s.payload ->> 'subject_key' = v_subject
      and not exists (select 1 from compliance_form_submissions c where c.corrects_submission_id = s.id)
    order by s.submitted_at desc, s.id desc limit 1;
    if v_latest is distinct from v_corrects then
      raise exception 'Only the latest record can be corrected';
    end if;
  end if;

  -- 10. episode: the first fail since the subject was last fine (an event form: every fail stands alone)
  select s.out_of_range into v_prev_fail from compliance_form_submissions s
  where s.venue_id = p_venue_id and s.form_id = p_form_id and s.payload ->> 'subject_key' = v_subject
    and not exists (select 1 from compliance_form_submissions c where c.corrects_submission_id = s.id)
    and (v_corrects is null or s.id <> v_corrects)
  order by s.submitted_at desc, s.id desc limit 1;
  v_epi := v_fail and (v_event or not coalesce(v_prev_fail, false) or (v_target_id is not null and coalesce(v_target_epi, false) and coalesce(v_target_oor, false)));

  v_payload := jsonb_build_object(
    'subject_key', v_subject,
    'values', v_values,
    'labels', v_labels,
    'fail_reasons', to_jsonb(v_reasons),
    'episode_start', v_epi,
    'form_version', left(coalesce(p_rules ->> 'form_version', '1'), 20));
  if not v_fail and v_note is not null then
    -- a note on a pass is a free comment, never stored as a corrective action
    v_payload := v_payload || jsonb_build_object('comment', v_note);
    v_note := null;
  end if;
  if v_stage is not null then
    v_payload := v_payload || jsonb_build_object('stage', v_stage_key, 'chain_id', v_chain);
    if v_elapsed is not null then
      v_payload := v_payload || jsonb_build_object('elapsed_min', round(v_elapsed, 1));
    end if;
  end if;
  if v_cosign_name is not null then
    v_payload := v_payload || jsonb_build_object('cosigned_by_id', p_cosigner_id, 'cosigned_by_name', v_cosign_name);
  end if;

  insert into compliance_form_submissions (
    id, venue_id, form_id, submitted_by, payload, out_of_range, corrective_action,
    device_stamp, corrects_submission_id, visible_to_roles, client_request_id
  ) values (
    v_id, p_venue_id, p_form_id, p_staff_id, v_payload, v_fail, v_note,
    left(p_device_stamp, 300), v_corrects, v_visible, v_crid
  );

  return jsonb_build_object(
    'id', v_id,
    'out_of_range', v_fail,
    'inserted', true,
    'episode_start', v_epi,
    'chain_id', v_chain,
    'fail_reasons', to_jsonb(v_reasons));
end;
$$;

revoke all on function public.submit_compliance_record(uuid, uuid, text, text[], text[], jsonb, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.submit_compliance_record(uuid, uuid, text, text[], text[], jsonb, jsonb, text, uuid) to service_role;
