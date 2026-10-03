-- (cosign tests updated 5 Oct 2026 for the manager tier rule inside the function)
-- Compliance engine suite: submit_compliance_record, venue_compliance_forms, compliance_latest_by_subject.
-- ONE DO block ending in a forced RAISE, so nothing persists. Throwaway venues, staff and auth users only;
-- never a real or demo venue. Expected: all PASS, 0 FAIL, counts unchanged afterwards.
do $$
declare
  vT uuid := gen_random_uuid(); vO uuid := gen_random_uuid();
  a_boh uuid := gen_random_uuid(); a_foh uuid := gen_random_uuid(); a_mgr uuid := gen_random_uuid(); a_own uuid := gen_random_uuid(); a_oth uuid := gen_random_uuid();
  r_boh uuid; r_foh uuid; r_mgr uuid; r_oth uuid;
  s_boh uuid; s_boh2 uuid; s_foh uuid; s_mgr uuid; s_own uuid; s_gone uuid; s_oth uuid;
  out text[] := '{}'; res jsonb; res2 jsonb; ok boolean; n int; n2 int; crid uuid; sA uuid; sB uuid; chain uuid; msg text;
  rules_temp jsonb; rules_check jsonb; rules_stage1 jsonb; rules_stage2 jsonb; rules_stage3 jsonb; rules_cash jsonb; rules_reg jsonb; rules_when jsonb;
  b_subs int; b_alerts int; b_ven int; b_forms int; pass int; fail int;
  c_boh int; c_foh int; c_mgr int; c_oth int;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  -- call the function, return {ok, res|err}
  execute $q$ create function pg_temp.rc(p_venue uuid, p_staff uuid, p_form text, p_gate text[], p_vis text[], p_rules jsonb, p_entry jsonb, p_cosign uuid default null)
    returns jsonb language plpgsql as $f$
    begin
      return jsonb_build_object('ok', true, 'res', public.submit_compliance_record(p_venue, p_staff, p_form, p_gate, p_vis, p_rules, p_entry, 'test-device', p_cosign));
    exception when others then
      return jsonb_build_object('ok', false, 'err', sqlerrm);
    end $f$ $q$;
  execute $q$ create function pg_temp.en(p_values jsonb, p_note text default null, p_corrects uuid default null, p_chain uuid default null, p_crid uuid default gen_random_uuid())
    returns jsonb language sql as
    $f$ select jsonb_build_object('client_request_id', p_crid, 'values', p_values, 'corrective_action', p_note, 'corrects_submission_id', p_corrects, 'chain_id', p_chain) $f$ $q$;

  select count(*) into b_subs from compliance_form_submissions;
  select count(*) into b_alerts from compliance_alert_log;
  select count(*) into b_ven from venues;
  select count(*) into b_forms from venue_compliance_forms;

  insert into venues(id,name,slug) values (vT,'EngT','eng-'||substr(vT::text,1,8)),(vO,'EngO','eng-'||substr(vO::text,1,8));
  insert into auth.users(id,aud,role,email) values
    (a_boh,'authenticated','authenticated','b'||a_boh||'@t.test'),(a_foh,'authenticated','authenticated','f'||a_foh||'@t.test'),
    (a_mgr,'authenticated','authenticated','m'||a_mgr||'@t.test'),(a_own,'authenticated','authenticated','o'||a_own||'@t.test'),
    (a_oth,'authenticated','authenticated','x'||a_oth||'@t.test');
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Kitchen Hand','BOH','frontline') returning id into r_boh;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Floor Staff','FOH','frontline') returning id into r_foh;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Duty Manager','FOH','authorized') returning id into r_mgr;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vO,'Head Chef','BOH','authorized') returning id into r_oth;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_boh,vT,'staff','Kit Hand',r_boh) returning id into s_boh;
  insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Kit Two',r_boh) returning id into s_boh2;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_foh,vT,'staff','Flo Floor',r_foh) returning id into s_foh;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_mgr,vT,'staff','Dave Duty',r_mgr) returning id into s_mgr;
  insert into app_users(auth_id,venue_id,role,name) values (a_own,vT,'owner','Olive Owner') returning id into s_own;
  insert into app_users(venue_id,role,name,staff_role_id,deactivated_at) values (vT,'staff','Gone Gary',r_boh,now()) returning id into s_gone;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_oth,vO,'staff','Other Chef',r_oth) returning id into s_oth;

  rules_temp := '{"version":1,"form_version":"1","event":true,"allow_correction":true,"cosign":false,
    "fields":[{"key":"item","type":"text","required":true},{"key":"temp_c","type":"number","min":-30,"max":150,"required":true}],
    "fail":[{"field":"temp_c","op":"lt","value":75,"label":"Below 75"}]}'::jsonb;
  rules_check := '{"version":1,"form_version":"1","event":false,"allow_correction":true,"cosign":false,
    "fields":[{"key":"items","type":"checklist","required":true,"items":[{"key":"a","label":"Handwash"},{"key":"b","label":"Sanitiser"}]}],
    "fail":[{"field":"items","op":"any_fail","label":"A check failed"}]}'::jsonb;
  rules_stage1 := '{"version":1,"form_version":"1","event":true,"allow_correction":true,"cosign":false,
    "stage":{"key":"start","chain":"new"},
    "fields":[{"key":"item","type":"text","required":true},{"key":"temp_c","type":"number","min":0,"max":150,"required":true}],"fail":[]}'::jsonb;
  rules_stage2 := '{"version":1,"form_version":"1","event":true,"allow_correction":true,"cosign":false,
    "stage":{"key":"two_hour","chain":"existing","requires":"start","elapsed_max_min":120,"elapsed_label":"Checked after the 2 hour limit"},
    "fields":[{"key":"temp_c","type":"number","min":-30,"max":150,"required":true}],
    "fail":[{"field":"temp_c","op":"gt","value":21,"label":"Above 21"}]}'::jsonb;
  rules_stage3 := '{"version":1,"form_version":"1","event":true,"allow_correction":true,"cosign":false,
    "stage":{"key":"six_hour","chain":"existing","requires":"start","requires_prior":["two_hour"],"elapsed_max_min":360,"elapsed_label":"Checked after the 6 hour limit"},
    "fields":[{"key":"temp_c","type":"number","min":-30,"max":150,"required":true}],
    "fail":[{"field":"temp_c","op":"gt","value":5,"label":"Above 5"}]}'::jsonb;
  rules_cash := '{"version":1,"form_version":"1","event":false,"allow_correction":false,"cosign":true,
    "fields":[{"key":"expected","type":"money","required":true},{"key":"counted","type":"money","required":true}],
    "fail":[{"field":"counted","op":"differs","other":"expected","value":5,"label":"Cash is out by more than 5 dollars"}]}'::jsonb;
  rules_reg := '{"version":1,"form_version":"1","event":false,"allow_correction":false,"cosign":false,"subject":{"field":"name"},
    "fields":[{"key":"name","type":"text","required":true},{"key":"status","type":"choice","options":["active","retired"],"required":true}],"fail":[]}'::jsonb;
  rules_when := '{"version":1,"form_version":"1","event":false,"allow_correction":true,"cosign":false,
    "fields":[{"key":"mode","type":"choice","options":["cold","hot"],"required":true},{"key":"temp_c","type":"number","min":-30,"max":150,"required":true},{"key":"t","type":"time","required":false},{"key":"ok","type":"passfail","required":false}],
    "fail":[{"field":"temp_c","op":"gt","value":5,"when":{"field":"mode","value":"cold"},"label":"Cold above 5"},
            {"field":"temp_c","op":"lt","value":60,"when":{"field":"mode","value":"hot"},"label":"Hot below 60"},
            {"field":"ok","op":"eq","value":"fail","label":"Marked fail"}]}'::jsonb;

  -- ===== EXECUTE privileges
  out := out || pg_temp.chk('EXECUTE: anon cannot', not has_function_privilege('anon','public.submit_compliance_record(uuid,uuid,text,text[],text[],jsonb,jsonb,text,uuid)','EXECUTE'));
  out := out || pg_temp.chk('EXECUTE: authenticated cannot', not has_function_privilege('authenticated','public.submit_compliance_record(uuid,uuid,text,text[],text[],jsonb,jsonb,text,uuid)','EXECUTE'));
  out := out || pg_temp.chk('EXECUTE: service_role can', has_function_privilege('service_role','public.submit_compliance_record(uuid,uuid,text,text[],text[],jsonb,jsonb,text,uuid)','EXECUTE'));
  execute 'set local role authenticated';
  begin perform public.submit_compliance_record(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'), 'x'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('EXECUTE: a real call as authenticated is denied', not ok);

  -- ===== roles and venue
  res := pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Chicken","temp_c":80}'));
  out := out || pg_temp.chk('allowed role (BOH) saves a passing record', (res->>'ok')::boolean and (res->'res'->>'inserted')::boolean and not (res->'res'->>'out_of_range')::boolean);
  out := out || pg_temp.chk('submitted_by, staff name and device stamp are stamped by the database', exists(select 1 from compliance_form_submissions where venue_id=vT and form_id='B5' and submitted_by=s_boh and submitted_by_name='Kit Hand' and device_stamp='test-device'));
  out := out || pg_temp.chk('denied role (FOH on a BOH form)', not (pg_temp.rc(vT, s_foh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);
  out := out || pg_temp.chk('manager tier (FOH Duty Manager) allowed', (pg_temp.rc(vT, s_mgr, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);
  out := out || pg_temp.chk('owner allowed', (pg_temp.rc(vT, s_own, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);
  out := out || pg_temp.chk('staff id from another venue denied', not (pg_temp.rc(vT, s_oth, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);
  out := out || pg_temp.chk('deactivated staff denied', not (pg_temp.rc(vT, s_gone, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);
  out := out || pg_temp.chk('unknown staff id denied', not (pg_temp.rc(vT, gen_random_uuid(), 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);
  out := out || pg_temp.chk('another venue id with this venue staff denied', not (pg_temp.rc(vO, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);
  out := out || pg_temp.chk('invalid audience denied', not (pg_temp.rc(vT, s_boh, 'B5', array['KITCHEN'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);
  out := out || pg_temp.chk('form B2 refused here', not (pg_temp.rc(vT, s_boh, 'B2', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);
  out := out || pg_temp.chk('bad form id refused', not (pg_temp.rc(vT, s_boh, 'B5; drop', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);

  -- ===== pass, fail and the forced note
  res := pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Mince","temp_c":70}'));
  out := out || pg_temp.chk('a failing value without a note is refused', not (res->>'ok')::boolean and res->>'err' like '%corrective action%');
  res := pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Mince","temp_c":70}', '   '));
  out := out || pg_temp.chk('a blank note is refused', not (res->>'ok')::boolean);
  res := pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Mince","temp_c":70}', 'Cooked it longer'));
  out := out || pg_temp.chk('a failing value with a note is saved and flagged', (res->>'ok')::boolean and (res->'res'->>'out_of_range')::boolean and exists(select 1 from compliance_form_submissions where id=(res->'res'->>'id')::uuid and out_of_range and corrective_action='Cooked it longer'));
  res := pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Mince","temp_c":75}'));
  out := out || pg_temp.chk('boundary 75 passes (lt 75 is the fail)', not (res->'res'->>'out_of_range')::boolean);
  res := pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Mince","temp_c":80}', 'Looks fine'));
  out := out || pg_temp.chk('a note on a pass is kept as a comment, not as a corrective action', exists(select 1 from compliance_form_submissions where id=(res->'res'->>'id')::uuid and corrective_action is null and payload->>'comment'='Looks fine'));
  out := out || pg_temp.chk('the client cannot assert a pass: a forged out_of_range key is refused as an unknown field', not (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":10,"out_of_range":false}', 'x'))->>'ok')::boolean);
  out := out || pg_temp.chk('a value as a string is refused', not (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":"80"}'))->>'ok')::boolean);
  out := out || pg_temp.chk('a value out of the field range is refused', not (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":900}'))->>'ok')::boolean);
  out := out || pg_temp.chk('a missing required field is refused', not (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x"}'))->>'ok')::boolean);
  out := out || pg_temp.chk('a rule naming a field that does not exist is refused', not (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'],
    '{"version":1,"event":true,"fields":[{"key":"a","type":"text"}],"fail":[{"field":"zzz","op":"gt","value":1,"label":"x"}]}'::jsonb, pg_temp.en('{"a":"x"}'))->>'ok')::boolean);
  out := out || pg_temp.chk('an unknown rule version is refused', not (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], '{"version":2,"fields":[]}'::jsonb, pg_temp.en('{}'))->>'ok')::boolean);

  -- ===== idempotency
  crid := gen_random_uuid();
  res := pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Steak","temp_c":78}', null, null, null, crid));
  res2 := pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Steak","temp_c":78}', null, null, null, crid));
  select count(*) into n from compliance_form_submissions where venue_id=vT and client_request_id=crid;
  out := out || pg_temp.chk('replay of the same request id inserts once and returns the original row', (res->'res'->>'inserted')::boolean and not (res2->'res'->>'inserted')::boolean and res2->'res'->>'id' = res->'res'->>'id' and n = 1);
  out := out || pg_temp.chk('the same request id with different values is refused', not (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Steak","temp_c":79}', null, null, null, crid))->>'ok')::boolean);
  out := out || pg_temp.chk('the same request id from another staff member is refused', not (pg_temp.rc(vT, s_mgr, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Steak","temp_c":78}', null, null, null, crid))->>'ok')::boolean);
  out := out || pg_temp.chk('the same request id on another form is refused', not (pg_temp.rc(vT, s_boh, 'B7', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Steak","temp_c":78}', null, null, null, crid))->>'ok')::boolean);

  -- ===== corrections (latest effective record of the same subject, once)
  res := pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Pork","temp_c":71}', 'Re cooked'));
  sA := (res->'res'->>'id')::uuid;
  out := out || pg_temp.chk('correcting the latest record succeeds and links it', (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Pork","temp_c":76}', null, sA))->>'ok')::boolean);
  out := out || pg_temp.chk('correcting the same record twice is refused', not (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Pork","temp_c":77}', null, sA))->>'ok')::boolean);
  res := pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Lamb","temp_c":80}'));
  sB := (res->'res'->>'id')::uuid;
  perform pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Duck","temp_c":80}'));
  out := out || pg_temp.chk('correcting an older record (not the latest) is refused', not (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"Lamb","temp_c":81}', null, sB))->>'ok')::boolean);
  out := out || pg_temp.chk('a correction of a non existent id is refused', not (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}', null, gen_random_uuid()))->>'ok')::boolean);
  out := out || pg_temp.chk('the original row is untouched after a correction', exists(select 1 from compliance_form_submissions where id=sA and out_of_range and (payload->'values'->>'temp_c')::numeric=71));
  out := out || pg_temp.chk('a form that takes no corrections refuses one', not (pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_reg, pg_temp.en('{"name":"a","status":"active"}', null, sA))->>'ok')::boolean);

  -- ===== checklist
  out := out || pg_temp.chk('checklist all pass saves a pass', not (pg_temp.rc(vT, s_boh, 'B10', array['BOH'], array['BOH'], rules_check, pg_temp.en('{"items":{"a":"pass","b":"na"}}'))->'res'->>'out_of_range')::boolean);
  out := out || pg_temp.chk('checklist with a failed item and no note is refused', not (pg_temp.rc(vT, s_boh, 'B11', array['BOH'], array['BOH'], rules_check, pg_temp.en('{"items":{"a":"pass","b":"fail"}}'))->>'ok')::boolean);
  res := pg_temp.rc(vT, s_boh, 'B11', array['BOH'], array['BOH'], rules_check, pg_temp.en('{"items":{"a":"pass","b":"fail"}}', 'Made up fresh sanitiser'));
  out := out || pg_temp.chk('checklist with a failed item and a note is saved as a fail with reasons', (res->'res'->>'out_of_range')::boolean and exists(select 1 from compliance_form_submissions where id=(res->'res'->>'id')::uuid and payload->'fail_reasons' ? 'A check failed' and payload->'labels'->>'items.b'='Sanitiser'));
  out := out || pg_temp.chk('checklist missing an item is refused', not (pg_temp.rc(vT, s_boh, 'B10', array['BOH'], array['BOH'], rules_check, pg_temp.en('{"items":{"a":"pass"}}'))->>'ok')::boolean);
  out := out || pg_temp.chk('checklist with an unknown item is refused', not (pg_temp.rc(vT, s_boh, 'B10', array['BOH'], array['BOH'], rules_check, pg_temp.en('{"items":{"a":"pass","b":"pass","zz":"pass"}}'))->>'ok')::boolean);
  out := out || pg_temp.chk('checklist with a bad result word is refused', not (pg_temp.rc(vT, s_boh, 'B10', array['BOH'], array['BOH'], rules_check, pg_temp.en('{"items":{"a":"pass","b":"ok"}}'))->>'ok')::boolean);

  -- ===== when, differs, choice, time, passfail
  out := out || pg_temp.chk('conditional rule: cold 6 fails', (pg_temp.rc(vT, s_boh, 'CAB', array['BOH'], array['BOH'], rules_when, pg_temp.en('{"mode":"cold","temp_c":6}', 'Moved stock'))->'res'->>'out_of_range')::boolean);
  out := out || pg_temp.chk('conditional rule: cold 4 passes', not (pg_temp.rc(vT, s_boh, 'CAB', array['BOH'], array['BOH'], rules_when, pg_temp.en('{"mode":"cold","temp_c":4}'))->'res'->>'out_of_range')::boolean);
  out := out || pg_temp.chk('conditional rule: hot 55 fails, hot 62 passes', (pg_temp.rc(vT, s_boh, 'CAB', array['BOH'], array['BOH'], rules_when, pg_temp.en('{"mode":"hot","temp_c":55}', 'Reheated'))->'res'->>'out_of_range')::boolean
    and not (pg_temp.rc(vT, s_boh, 'CAB', array['BOH'], array['BOH'], rules_when, pg_temp.en('{"mode":"hot","temp_c":62}'))->'res'->>'out_of_range')::boolean);
  out := out || pg_temp.chk('conditional rule: cold 4 is not judged by the hot rule', not (pg_temp.rc(vT, s_boh, 'CAB', array['BOH'], array['BOH'], rules_when, pg_temp.en('{"mode":"cold","temp_c":4}'))->'res'->>'out_of_range')::boolean);
  out := out || pg_temp.chk('a choice outside the options is refused', not (pg_temp.rc(vT, s_boh, 'CAB', array['BOH'], array['BOH'], rules_when, pg_temp.en('{"mode":"warm","temp_c":4}'))->>'ok')::boolean);
  out := out || pg_temp.chk('a time that is not HH:MM is refused', not (pg_temp.rc(vT, s_boh, 'CAB', array['BOH'], array['BOH'], rules_when, pg_temp.en('{"mode":"cold","temp_c":4,"t":"25:99"}'))->>'ok')::boolean);
  out := out || pg_temp.chk('a valid time is stored', (pg_temp.rc(vT, s_boh, 'CAB', array['BOH'], array['BOH'], rules_when, pg_temp.en('{"mode":"cold","temp_c":4,"t":"07:45"}'))->>'ok')::boolean);
  out := out || pg_temp.chk('pass or fail value: fail needs a note', not (pg_temp.rc(vT, s_boh, 'CAB', array['BOH'], array['BOH'], rules_when, pg_temp.en('{"mode":"cold","temp_c":4,"ok":"fail"}'))->>'ok')::boolean);
  out := out || pg_temp.chk('a pass or fail value that is neither is refused', not (pg_temp.rc(vT, s_boh, 'CAB', array['BOH'], array['BOH'], rules_when, pg_temp.en('{"mode":"cold","temp_c":4,"ok":"maybe"}'))->>'ok')::boolean);

  -- ===== staged chain: new, existing, elapsed from the SERVER clock, duplicates, prior steps
  res := pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage1, pg_temp.en('{"item":"Stock","temp_c":85}'));
  chain := (res->'res'->>'chain_id')::uuid;
  out := out || pg_temp.chk('a new chain starts and its chain id is the start record id', (res->>'ok')::boolean and chain = (res->'res'->>'id')::uuid);
  out := out || pg_temp.chk('step two on time and in range passes', not (pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage2, pg_temp.en('{"temp_c":18}', null, null, chain))->'res'->>'out_of_range')::boolean);
  out := out || pg_temp.chk('the same step twice for one chain is refused', not (pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage2, pg_temp.en('{"temp_c":18}', null, null, chain))->>'ok')::boolean);
  out := out || pg_temp.chk('step three after step two: a high temperature fails with a note', (pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage3, pg_temp.en('{"temp_c":9}', 'Discarded the batch', null, chain))->'res'->>'out_of_range')::boolean);
  res := pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage1, pg_temp.en('{"item":"Soup","temp_c":80}'));
  sA := (res->'res'->>'chain_id')::uuid;
  out := out || pg_temp.chk('step three without step two is refused', not (pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage3, pg_temp.en('{"temp_c":4}', null, null, sA))->>'ok')::boolean);
  out := out || pg_temp.chk('a step without a chain id is refused', not (pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage2, pg_temp.en('{"temp_c":18}'))->>'ok')::boolean);
  out := out || pg_temp.chk('a chain id of another venue is refused', not (pg_temp.rc(vO, s_oth, 'B6', array['BOH'], array['BOH'], rules_stage2, pg_temp.en('{"temp_c":18}', null, null, sA))->>'ok')::boolean);
  out := out || pg_temp.chk('a made up chain id is refused', not (pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage2, pg_temp.en('{"temp_c":18}', null, null, gen_random_uuid()))->>'ok')::boolean);
  out := out || pg_temp.chk('a new chain that names an existing chain is refused', not (pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage1, pg_temp.en('{"item":"x","temp_c":80}', null, null, sA))->>'ok')::boolean);
  out := out || pg_temp.chk('a stage record cannot be corrected', not (pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage2, pg_temp.en('{"temp_c":18}', null, sA, sA))->>'ok')::boolean);
  -- elapsed: backdate the start record by 3 hours (triggers off for this statement only; rolled back with everything)
  execute 'set local session_replication_role = replica';
  update compliance_form_submissions set submitted_at = now() - interval '3 hours' where id = sA;
  execute 'set local session_replication_role = origin';
  res := pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage2, pg_temp.en('{"temp_c":15}'));
  out := out || pg_temp.chk('step two after the time limit with an in range temperature is refused without a note (the lateness is a fail)', not (pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage2, pg_temp.en('{"temp_c":15}', null, null, sA))->>'ok')::boolean);
  res := pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], rules_stage2, pg_temp.en('{"temp_c":15}', 'Checked late, discarded', null, sA));
  out := out || pg_temp.chk('step two after the time limit is saved as a fail with the lateness reason and elapsed minutes', (res->'res'->>'out_of_range')::boolean and exists(select 1 from compliance_form_submissions where id=(res->'res'->>'id')::uuid and payload->'fail_reasons' ? 'Checked after the 2 hour limit' and (payload->>'elapsed_min')::numeric >= 179));
  out := out || pg_temp.chk('the chain holds one record per stage', (select count(*) from compliance_form_submissions where venue_id=vT and form_id='B6' and payload->>'chain_id'=sA::text and payload->>'stage'='two_hour') = 1);
  out := out || pg_temp.chk('stage rules without a key are refused', not (pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], '{"version":1,"event":true,"stage":{"chain":"new"},"fields":[{"key":"a","type":"text"}],"fail":[]}'::jsonb, pg_temp.en('{"a":"x"}'))->>'ok')::boolean);
  out := out || pg_temp.chk('an existing stage with no requires is refused', not (pg_temp.rc(vT, s_boh, 'B6', array['BOH'], array['BOH'], '{"version":1,"event":true,"stage":{"key":"x","chain":"existing"},"fields":[{"key":"a","type":"text"}],"fail":[]}'::jsonb, pg_temp.en('{"a":"x"}', null, null, sA))->>'ok')::boolean);

  -- ===== cosign (two person sign off) and money
  out := out || pg_temp.chk('cosign form with no second person is refused', not (pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_cash, pg_temp.en('{"expected":500,"counted":500}'))->>'ok')::boolean);
  out := out || pg_temp.chk('cosign by the same person is refused', not (pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_cash, pg_temp.en('{"expected":500,"counted":500}'), s_boh)->>'ok')::boolean);
  out := out || pg_temp.chk('cosign by a person of another venue is refused', not (pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_cash, pg_temp.en('{"expected":500,"counted":500}'), s_oth)->>'ok')::boolean);
  out := out || pg_temp.chk('cosign by a deactivated person is refused', not (pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_cash, pg_temp.en('{"expected":500,"counted":500}'), s_gone)->>'ok')::boolean);
  out := out || pg_temp.chk('cosign by a frontline colleague is refused (manager tier only, enforced in the function)', not (pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_cash, pg_temp.en('{"expected":500,"counted":500}'), s_boh2)->>'ok')::boolean);
  out := out || pg_temp.chk('cosign by the owner is accepted', (pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_cash, pg_temp.en('{"expected":500,"counted":500}'), s_own)->>'ok')::boolean);
  res := pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_cash, pg_temp.en('{"expected":500,"counted":498.5}'), s_mgr);
  out := out || pg_temp.chk('cosign by a different active person is stored with the name; a small variance passes', (res->>'ok')::boolean and not (res->'res'->>'out_of_range')::boolean and exists(select 1 from compliance_form_submissions where id=(res->'res'->>'id')::uuid and payload->>'cosigned_by_name'='Dave Duty'));
  out := out || pg_temp.chk('a variance over the tolerance fails and needs a note', not (pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_cash, pg_temp.en('{"expected":500,"counted":470}'), s_mgr)->>'ok')::boolean
    and (pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_cash, pg_temp.en('{"expected":500,"counted":470}', 'Recounted twice, till short'), s_mgr)->'res'->>'out_of_range')::boolean);
  out := out || pg_temp.chk('money with 3 decimals is refused', not (pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_cash, pg_temp.en('{"expected":500.123,"counted":500}'), s_mgr)->>'ok')::boolean);
  out := out || pg_temp.chk('negative money is refused', not (pg_temp.rc(vT, s_boh, 'F3', array['BOH'], array['BOH'], rules_cash, pg_temp.en('{"expected":-5,"counted":500}'), s_mgr)->>'ok')::boolean);
  out := out || pg_temp.chk('a second signature on a form that takes none is refused', not (pg_temp.rc(vT, s_boh, 'B5', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'), s_mgr)->>'ok')::boolean);

  -- ===== register: latest effective row per subject
  perform pg_temp.rc(vT, s_boh, 'B1', array['BOH'], array['BOH'], rules_reg, pg_temp.en('{"name":"  Fresh   Fish Co ","status":"active"}'));
  perform pg_temp.rc(vT, s_boh, 'B1', array['BOH'], array['BOH'], rules_reg, pg_temp.en('{"name":"fresh fish co","status":"retired"}'));
  select status into msg from (select payload->'values'->>'status' as status from compliance_latest_by_subject where venue_id=vT and form_id='B1' and subject_key='fresh fish co') x;
  out := out || pg_temp.chk('register: names are matched case and spacing insensitively; the latest row wins', msg = 'retired');

  -- ===== switched off form
  insert into venue_compliance_forms(venue_id, form_id, enabled) values (vT, 'B12', false);
  out := out || pg_temp.chk('a form switched off for the venue is refused', not (pg_temp.rc(vT, s_boh, 'B12', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);
  update venue_compliance_forms set enabled = true where venue_id = vT and form_id = 'B12';
  out := out || pg_temp.chk('the same form switched on again is accepted', (pg_temp.rc(vT, s_boh, 'B12', array['BOH'], array['BOH'], rules_temp, pg_temp.en('{"item":"x","temp_c":80}'))->>'ok')::boolean);
  delete from venue_compliance_forms where venue_id = vT and form_id = 'B12';

  -- ===== visibility under RLS (impersonated)
  select count(*) into n from compliance_form_submissions where venue_id = vT and form_id in ('B5','B7','B6','B10','B11','CAB','B1','F3','B12'); -- B12: the switched on again record above is also a BOH audience row
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_boh, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated'; select count(*) into c_boh from compliance_form_submissions where form_id <> 'B2';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_foh, 'role', 'authenticated')::text, true);
  select count(*) into c_foh from compliance_form_submissions where form_id <> 'B2';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_mgr, 'role', 'authenticated')::text, true);
  select count(*) into c_mgr from compliance_form_submissions where form_id <> 'B2';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_oth, 'role', 'authenticated')::text, true);
  select count(*) into c_oth from compliance_form_submissions where venue_id = vT;
  execute 'reset role';
  out := out || pg_temp.chk('BOH sees every BOH audience row', c_boh = n);
  out := out || pg_temp.chk('FOH sees none of the BOH only rows', c_foh = 0);
  out := out || pg_temp.chk('manager tier sees all', c_mgr = n);
  out := out || pg_temp.chk('manager tier of another venue sees none', c_oth = 0);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_foh, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated'; select count(*) into n2 from compliance_latest_by_subject where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_boh, 'role', 'authenticated')::text, true);
  select count(*) into c_boh from compliance_latest_by_subject where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_oth, 'role', 'authenticated')::text, true);
  select count(*) into c_oth from compliance_latest_by_subject where venue_id = vT;
  execute 'reset role';
  out := out || pg_temp.chk('latest by subject view: FOH sees none of the BOH rows, BOH sees some, another venue sees none', n2 = 0 and c_boh > 0 and c_oth = 0);

  -- ===== the ledger stays insert only for clients
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_own, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin insert into compliance_form_submissions(venue_id,form_id,submitted_by,payload) values (vT,'B5',s_own,'{}'); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('owner cannot INSERT into the ledger directly', not ok);
  begin update compliance_form_submissions set payload='{}' where venue_id=vT; get diagnostics n = row_count; ok := n > 0; exception when others then ok := false; end;
  out := out || pg_temp.chk('owner cannot UPDATE the ledger', not ok);
  begin delete from compliance_form_submissions where venue_id=vT; get diagnostics n = row_count; ok := n > 0; exception when others then ok := false; end;
  out := out || pg_temp.chk('owner cannot DELETE from the ledger', not ok);
  execute 'reset role';

  -- ===== venue_compliance_forms: RLS, grants, stamping
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_boh, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin insert into venue_compliance_forms(venue_id, form_id, enabled) values (vT, 'B13', true); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('frontline cannot switch a form on', not ok);
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_mgr, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin insert into venue_compliance_forms(venue_id, form_id, enabled, updated_by) values (vT, 'B13', true, s_own); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('manager tier can switch a form on', ok);
  select count(*) into n from venue_compliance_forms where venue_id = vT and form_id = 'B13' and updated_by = s_mgr;
  out := out || pg_temp.chk('updated_by is stamped by the database (a forged updated_by is overwritten)', n = 1);
  begin update venue_compliance_forms set enabled = false where venue_id = vT and form_id = 'B13'; get diagnostics n = row_count; ok := n = 1; exception when others then ok := false; end;
  out := out || pg_temp.chk('manager tier can switch it off again', ok);
  begin update venue_compliance_forms set form_id = 'B14' where venue_id = vT and form_id = 'B13'; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('the key columns cannot be changed', not ok);
  begin insert into venue_compliance_forms(venue_id, form_id, enabled) values (vO, 'B13', true); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('manager tier cannot insert a row for another venue', not ok);
  begin delete from venue_compliance_forms where venue_id = vT; get diagnostics n = row_count; ok := n > 0; exception when others then ok := false; end;
  out := out || pg_temp.chk('nobody can delete activation rows', not ok);
  begin truncate venue_compliance_forms; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('nobody can truncate activation rows', not ok);
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_boh, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated'; select count(*) into n from venue_compliance_forms where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_oth, 'role', 'authenticated')::text, true);
  select count(*) into n2 from venue_compliance_forms where venue_id = vT;
  execute 'reset role';
  out := out || pg_temp.chk('staff of the venue can read activation rows; another venue cannot', n = 1 and n2 = 0);
  out := out || pg_temp.chk('anon has no privileges on activation rows or the view', not has_table_privilege('anon','venue_compliance_forms','SELECT') and not has_table_privilege('anon','compliance_latest_by_subject','SELECT'));

  -- ===== cascade: deleting the venue removes everything
  begin delete from venues where id = vT; ok := true; exception when others then ok := false; out := out || 'cascade error: ' || sqlerrm; end;
  select count(*) into n from compliance_form_submissions where venue_id = vT;
  select count(*) into n2 from venue_compliance_forms where venue_id = vT;
  out := out || pg_temp.chk('venue delete cascades over records (with chains) and activation rows', ok and n = 0 and n2 = 0);

  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\nbaseline: submissions=% alerts=% venues=% forms=%\n%', pass, fail, b_subs, b_alerts, b_ven, b_forms,
    array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
