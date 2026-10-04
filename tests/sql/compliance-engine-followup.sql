-- Follow up migration suite (20261003010000): service role activation insert, soft prior stages, the all n/a
-- checklist guard, and the atomic PIN failure counter. One DO block, forced RAISE, throwaway venue only.
do $$
declare
  vT uuid := gen_random_uuid();
  r_boh uuid; s_boh uuid; s_other uuid;
  out text[] := '{}'; res jsonb; ok boolean; n int; chain uuid; att int; locked timestamptz;
  rules_stage1 jsonb; rules_stage3 jsonb; rules_check jsonb; pass int; fail int;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  execute $q$ create function pg_temp.rc(p_venue uuid, p_staff uuid, p_form text, p_rules jsonb, p_entry jsonb)
    returns jsonb language plpgsql as $f$
    begin
      return jsonb_build_object('ok', true, 'res', public.submit_compliance_record(p_venue, p_staff, p_form, array['BOH'], array['BOH'], p_rules, p_entry, 'test-device', null));
    exception when others then
      return jsonb_build_object('ok', false, 'err', sqlerrm);
    end $f$ $q$;
  execute $q$ create function pg_temp.en(p_values jsonb, p_note text default null, p_chain uuid default null)
    returns jsonb language sql as
    $f$ select jsonb_build_object('client_request_id', gen_random_uuid(), 'values', p_values, 'corrective_action', p_note, 'chain_id', p_chain) $f$ $q$;

  insert into venues(id,name,slug) values (vT,'EngF','engf-'||substr(vT::text,1,8));
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Kitchen Hand','BOH','frontline') returning id into r_boh;
  insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Kit Hand',r_boh) returning id into s_boh;
  insert into app_users(venue_id,role,name,staff_role_id,pin_hash) values (vT,'staff','Kit Pin',r_boh,'x') returning id into s_other;

  -- service role can insert an activation row (the stamp trigger no longer needs private schema access)
  execute 'set local role service_role';
  begin insert into venue_compliance_forms(venue_id, form_id, enabled) values (vT, 'B13', true); ok := true; exception when others then ok := false; out := out || ('note: ' || sqlerrm); end;
  execute 'reset role';
  out := out || pg_temp.chk('service role can insert an activation row', ok);
  execute 'set local role service_role';
  begin update venue_compliance_forms set enabled = false where venue_id = vT and form_id = 'B13'; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('service role can update an activation row', ok and exists(select 1 from venue_compliance_forms where venue_id = vT and form_id = 'B13' and not enabled));

  rules_stage1 := '{"version":1,"event":true,"stage":{"key":"start","chain":"new"},"fields":[{"key":"item","type":"text","required":true}],"fail":[]}'::jsonb;
  rules_stage3 := '{"version":1,"event":true,"stage":{"key":"six_hour","chain":"existing","requires":"start","soft_prior":["two_hour"],"soft_prior_label":"The 2 hour check was missed","elapsed_max_min":360},
    "fields":[{"key":"temp_c","type":"number","min":-30,"max":150,"required":true}],"fail":[{"field":"temp_c","op":"gt","value":5,"label":"Warmer than 5"}]}'::jsonb;
  rules_check := '{"version":1,"event":false,"allow_correction":true,"fields":[{"key":"items","type":"checklist","required":true,"items":[{"key":"a","label":"A"},{"key":"b","label":"B"}]}],"fail":[{"field":"items","op":"any_fail","label":"A check failed"}]}'::jsonb;

  res := pg_temp.rc(vT, s_boh, 'B6', rules_stage1, pg_temp.en('{"item":"Stock"}'));
  chain := (res->'res'->>'chain_id')::uuid;
  res := pg_temp.rc(vT, s_boh, 'B6', rules_stage3, pg_temp.en('{"temp_c":4}', null, chain));
  out := out || pg_temp.chk('a later step with a missing soft prior is flagged as a fail and needs a note', not (res->>'ok')::boolean and res->>'err' like '%corrective action%');
  res := pg_temp.rc(vT, s_boh, 'B6', rules_stage3, pg_temp.en('{"temp_c":4}', 'Forgot the 2 hour check, threw the batch out', chain));
  out := out || pg_temp.chk('with a note it is saved as a fail carrying the soft prior reason', (res->>'ok')::boolean and (res->'res'->>'out_of_range')::boolean
    and exists(select 1 from compliance_form_submissions where id=(res->'res'->>'id')::uuid and payload->'fail_reasons' ? 'The 2 hour check was missed'));

  out := out || pg_temp.chk('a checklist with every item not applicable is refused', not (pg_temp.rc(vT, s_boh, 'B10', rules_check, pg_temp.en('{"items":{"a":"na","b":"na"}}'))->>'ok')::boolean);
  out := out || pg_temp.chk('a checklist with one applicable item is accepted', (pg_temp.rc(vT, s_boh, 'B10', rules_check, pg_temp.en('{"items":{"a":"na","b":"pass"}}'))->>'ok')::boolean);

  -- atomic PIN failure counter: 5 bumps lock for 15 minutes, via service_role only
  out := out || pg_temp.chk('bump_staff_pin_failure: anon and authenticated cannot execute', not has_function_privilege('anon','public.bump_staff_pin_failure(uuid)','EXECUTE') and not has_function_privilege('authenticated','public.bump_staff_pin_failure(uuid)','EXECUTE'));
  out := out || pg_temp.chk('bump_staff_pin_failure: service_role can execute', has_function_privilege('service_role','public.bump_staff_pin_failure(uuid)','EXECUTE'));
  execute 'set local role service_role';
  for n in 1..4 loop perform public.bump_staff_pin_failure(s_other); end loop;
  execute 'reset role';
  select pin_failed_attempts, pin_locked_until into att, locked from app_users where id = s_other;
  out := out || pg_temp.chk('after 4 failures: counted 4, not locked', att = 4 and locked is null);
  execute 'set local role service_role';
  perform public.bump_staff_pin_failure(s_other);
  execute 'reset role';
  select pin_failed_attempts, pin_locked_until into att, locked from app_users where id = s_other;
  out := out || pg_temp.chk('the 5th failure locks for about 15 minutes', att = 5 and locked > now() + interval '14 minutes' and locked < now() + interval '16 minutes');
  execute 'set local role service_role';
  out := out || pg_temp.chk('an unknown id returns null and changes nothing', public.bump_staff_pin_failure(gen_random_uuid()) is null);
  execute 'reset role';
  execute 'set local role authenticated';
  begin perform public.bump_staff_pin_failure(s_other); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('a signed in client cannot call it', not ok);

  begin delete from venues where id = vT; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('cleanup cascade works', ok);
  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
