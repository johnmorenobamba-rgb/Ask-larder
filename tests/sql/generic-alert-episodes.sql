-- Generic form failure alerts (20261005080000): one alert row per item per episode for B3, B6 and B12 only. Rolled back,
-- throwaway venue. No email is involved here (the alert row is what the sender uses). Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); a_own uuid := gen_random_uuid(); a_mgr uuid := gen_random_uuid();
  r_boh uuid; s_boh uuid; s_own uuid;
  out text[] := '{}'; res jsonb; ok boolean; n int; pass int; fail int; chain1 uuid; chain2 uuid; idA uuid; idB uuid; idC uuid;
  rules_b3 jsonb; rules_b12 jsonb; rules_b6a jsonb; rules_b6b jsonb; rules_b6c jsonb; rules_other jsonb;
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
  execute $q$ create function pg_temp.en(p_values jsonb, p_note text default null, p_corrects uuid default null, p_chain uuid default null)
    returns jsonb language sql as
    $f$ select jsonb_build_object('client_request_id', gen_random_uuid(), 'values', p_values, 'corrective_action', p_note, 'corrects_submission_id', p_corrects, 'chain_id', p_chain) $f$ $q$;
  execute $q$ create function pg_temp.alerts(p_venue uuid, p_form text) returns int language sql as
    $f$ select count(*)::int from compliance_alert_log al join compliance_form_submissions s on s.id = al.submission_id where al.venue_id = p_venue and s.form_id = p_form and al.kind = 'generic_fail_episode' $f$ $q$;

  insert into venues(id,name,slug) values (vT,'GenAlert','ge-'||substr(vT::text,1,8));
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Kitchen Hand','BOH','frontline') returning id into r_boh;
  insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Kit Hand',r_boh) returning id into s_boh;

  rules_b3 := '{"version":1,"form_version":"1","event":true,"allow_correction":true,"cosign":false,
    "fields":[{"key":"supplier","type":"text","required":true},{"key":"product","type":"text","required":true},{"key":"temp_c","type":"number","min":-60,"max":150,"required":true}],
    "fail":[{"field":"temp_c","op":"gt","value":5,"label":"Chilled delivery is warmer than 5"}]}'::jsonb;
  rules_b12 := '{"version":1,"form_version":"1","event":true,"allow_correction":true,"cosign":false,
    "fields":[{"key":"kind","type":"choice","options":["sighting","trap_check"],"required":true},{"key":"location","type":"text","required":true}],
    "fail":[{"field":"kind","op":"eq","value":"sighting","label":"Pest sighting"}]}'::jsonb;
  rules_b6a := '{"version":1,"form_version":"1","event":true,"allow_correction":false,"cosign":false,"stage":{"key":"start","chain":"new"},
    "fields":[{"key":"item","type":"text","required":true},{"key":"start_temp_c","type":"number","min":0,"max":150,"required":true}],"fail":[]}'::jsonb;
  rules_b6b := '{"version":1,"form_version":"1","event":true,"allow_correction":false,"cosign":false,"stage":{"key":"two_hour","chain":"existing","requires":"start"},
    "fields":[{"key":"temp_c","type":"number","min":-30,"max":150,"required":true}],"fail":[{"field":"temp_c","op":"gt","value":21,"label":"Warmer than 21"}]}'::jsonb;
  rules_b6c := '{"version":1,"form_version":"1","event":true,"allow_correction":false,"cosign":false,"stage":{"key":"six_hour","chain":"existing","requires":"start"},
    "fields":[{"key":"temp_c","type":"number","min":-30,"max":150,"required":true}],"fail":[{"field":"temp_c","op":"gt","value":5,"label":"Warmer than 5"}]}'::jsonb;
  rules_other := '{"version":1,"form_version":"1","event":true,"allow_correction":true,"cosign":false,
    "fields":[{"key":"item","type":"text","required":true},{"key":"temp_c","type":"number","min":-30,"max":150,"required":true}],"fail":[{"field":"temp_c","op":"lt","value":75,"label":"Below 75"}]}'::jsonb;

  -- B3, item = supplier and product
  res := pg_temp.rc(vT, s_boh, 'B3', rules_b3, pg_temp.en('{"supplier":"Acme Meats","product":"Chicken","temp_c":9}', 'Rejected the delivery'));
  idA := (res->'res'->>'id')::uuid;
  out := out || pg_temp.chk('B3: a failing delivery creates one alert row', (res->>'ok')::boolean and pg_temp.alerts(vT,'B3') = 1);
  res := pg_temp.rc(vT, s_boh, 'B3', rules_b3, pg_temp.en('{"supplier":"  acme meats ","product":"CHICKEN","temp_c":8}', 'Rejected again'));
  out := out || pg_temp.chk('B3: a second failure of the same item (case and spacing ignored) adds no alert', (res->>'ok')::boolean and pg_temp.alerts(vT,'B3') = 1);
  res := pg_temp.rc(vT, s_boh, 'B3', rules_b3, pg_temp.en('{"supplier":"Acme Meats","product":"Chicken","temp_c":3}'));
  out := out || pg_temp.chk('B3: a passing delivery adds no alert', pg_temp.alerts(vT,'B3') = 1);
  res := pg_temp.rc(vT, s_boh, 'B3', rules_b3, pg_temp.en('{"supplier":"Acme Meats","product":"Chicken","temp_c":10}', 'Rejected, third time'));
  idB := (res->'res'->>'id')::uuid;
  out := out || pg_temp.chk('B3: a failure after the item was fine again starts a NEW episode (second alert)', pg_temp.alerts(vT,'B3') = 2);
  res := pg_temp.rc(vT, s_boh, 'B3', rules_b3, pg_temp.en('{"supplier":"Acme Meats","product":"Fish","temp_c":12}', 'Rejected fish'));
  idB := (res->'res'->>'id')::uuid;
  out := out || pg_temp.chk('B3: another product failing has its own alert', pg_temp.alerts(vT,'B3') = 3);
  res := pg_temp.rc(vT, s_boh, 'B3', rules_b3, pg_temp.en('{"supplier":"Acme Meats","product":"Fish","temp_c":11}', 'Corrected the temperature reading', idB));
  out := out || pg_temp.chk('B3: a correction of an alerted record (still failing) is the same episode, no new alert', (res->>'ok')::boolean and pg_temp.alerts(vT,'B3') = 3);
  res := pg_temp.rc(vT, s_boh, 'B3', rules_b3, pg_temp.en('{"supplier":"Bee Dairy","product":"Milk","temp_c":2}'));
  idC := (res->'res'->>'id')::uuid;
  res := pg_temp.rc(vT, s_boh, 'B3', rules_b3, pg_temp.en('{"supplier":"Bee Dairy","product":"Milk","temp_c":9}', 'Probe was in the wrong place', idC));
  out := out || pg_temp.chk('B3: correcting a passing record into a failing one creates an alert', (res->>'ok')::boolean and pg_temp.alerts(vT,'B3') = 4);

  -- B12, item = location
  res := pg_temp.rc(vT, s_boh, 'B12', rules_b12, pg_temp.en('{"kind":"sighting","location":"Kitchen"}', 'Called the contractor'));
  out := out || pg_temp.chk('B12: a sighting creates an alert', pg_temp.alerts(vT,'B12') = 1);
  res := pg_temp.rc(vT, s_boh, 'B12', rules_b12, pg_temp.en('{"kind":"sighting","location":"kitchen "}', 'Set a trap'));
  out := out || pg_temp.chk('B12: another sighting at the same location adds no alert', pg_temp.alerts(vT,'B12') = 1);
  res := pg_temp.rc(vT, s_boh, 'B12', rules_b12, pg_temp.en('{"kind":"sighting","location":"Bar"}', 'Called the contractor'));
  out := out || pg_temp.chk('B12: a sighting at a different location has its own alert', pg_temp.alerts(vT,'B12') = 2);
  res := pg_temp.rc(vT, s_boh, 'B12', rules_b12, pg_temp.en('{"kind":"trap_check","location":"Kitchen"}'));
  out := out || pg_temp.chk('B12: a trap check with nothing found adds no alert', pg_temp.alerts(vT,'B12') = 2);
  res := pg_temp.rc(vT, s_boh, 'B12', rules_b12, pg_temp.en('{"kind":"sighting","location":"Kitchen"}', 'Back again'));
  out := out || pg_temp.chk('B12: a sighting after a clear trap check starts a new episode', pg_temp.alerts(vT,'B12') = 3);

  -- B6, item = the cooling batch
  res := pg_temp.rc(vT, s_boh, 'B6', rules_b6a, pg_temp.en('{"item":"Beef stew","start_temp_c":85}'));
  chain1 := (res->'res'->>'chain_id')::uuid;
  out := out || pg_temp.chk('B6: starting a batch (no failure) adds no alert', pg_temp.alerts(vT,'B6') = 0);
  res := pg_temp.rc(vT, s_boh, 'B6', rules_b6b, pg_temp.en('{"temp_c":30}', 'Moved to the blast chiller', null, chain1));
  out := out || pg_temp.chk('B6: the first failing stage of a batch creates an alert', (res->>'ok')::boolean and pg_temp.alerts(vT,'B6') = 1);
  res := pg_temp.rc(vT, s_boh, 'B6', rules_b6c, pg_temp.en('{"temp_c":12}', 'Discarded the batch', null, chain1));
  out := out || pg_temp.chk('B6: a later failing stage of the SAME batch adds no alert', (res->>'ok')::boolean and pg_temp.alerts(vT,'B6') = 1);
  res := pg_temp.rc(vT, s_boh, 'B6', rules_b6a, pg_temp.en('{"item":"Rice","start_temp_c":80}'));
  chain2 := (res->'res'->>'chain_id')::uuid;
  res := pg_temp.rc(vT, s_boh, 'B6', rules_b6b, pg_temp.en('{"temp_c":25}', 'Moved to the blast chiller', null, chain2));
  out := out || pg_temp.chk('B6: another batch failing has its own alert', pg_temp.alerts(vT,'B6') = 2);

  -- other forms and the alert row itself
  res := pg_temp.rc(vT, s_boh, 'B5', rules_other, pg_temp.en('{"item":"Mince","temp_c":60}', 'Cooked longer'));
  out := out || pg_temp.chk('other forms never create a generic alert', (res->>'ok')::boolean and (select count(*) from compliance_alert_log where venue_id = vT) = 4 + 3 + 2);
  out := out || pg_temp.chk('alert rows are unsent and carry the generic kind', (select count(*) from compliance_alert_log where venue_id = vT and kind = 'generic_fail_episode' and email_sent_at is null and email_attempts = 0) = 9);
  out := out || pg_temp.chk('nine alert rows in total for the whole run (4 B3, 3 B12, 2 B6)', (select count(*) from compliance_alert_log where venue_id = vT) = 9);

  begin delete from venues where id = vT; ok := true; exception when others then ok := false; end;
  select count(*) into n from compliance_alert_log where venue_id = vT;
  out := out || pg_temp.chk('cleanup cascade removes the alert rows', ok and n = 0);
  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
