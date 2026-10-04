-- Compliance Forms 0b, Stage 1 suite: B2 write path, RLS visibility, grants, cascade.
-- Runs against larder-dev via the Supabase SQL runner. Everything happens inside ONE
-- DO block that ends with a forced RAISE EXCEPTION, so nothing can persist; the
-- "error" it returns IS the result summary. It builds its OWN throwaway venues, staff
-- and units (including throwaway auth.users rows) inside the transaction and never
-- touches the demo venue. Expected: N PASS, 0 FAIL, and unchanged table counts after.
do $$
declare
  vT uuid := gen_random_uuid(); vO uuid := gen_random_uuid();
  a_owner uuid := gen_random_uuid(); a_mgr uuid := gen_random_uuid(); a_boh uuid := gen_random_uuid();
  a_foh uuid := gen_random_uuid(); a_nod uuid := gen_random_uuid(); a_mgro uuid := gen_random_uuid();
  r_mgr uuid; r_boh uuid; r_foh uuid; r_nod uuid; r_mgro uuid;
  s_owner uuid; s_mgr uuid; s_boh uuid; s_foh uuid; s_nod uuid; s_gone uuid; s_owner_o uuid; s_mgr_o uuid;
  u_cold uuid; u_frz uuid; u_hot uuid; u_old uuid; u_oth uuid; u_idem uuid; u_atom uuid;
  u_e1 uuid; u_e2 uuid; u_e3 uuid; u_e4 uuid;
  out text[] := '{}'; res jsonb; res2 jsonb; ok boolean; n int; n2 int; crid uuid;
  sA uuid; sB uuid; sC uuid; sD uuid; sE uuid; t1 timestamptz; t2 timestamptz;
  n_all int; n_foh_expected int; c_boh int; c_mgr int; c_owner int; c_foh int; c_nod int; c_oth int;
  b_subs int; b_alerts int; b_ven int; pass int; fail int;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  execute $q$ create function pg_temp.rt(p_venue uuid, p_staff uuid, p_entries jsonb, p_aud text[] default array['BOH'])
    returns jsonb language plpgsql as $f$
    begin
      return jsonb_build_object('ok', true, 'res', public.submit_compliance_form(p_venue, p_staff, 'B2', p_aud, p_entries, 'test-device'));
    exception when others then
      return jsonb_build_object('ok', false, 'err', sqlerrm);
    end $f$ $q$;
  execute $q$ create function pg_temp.e(p_unit uuid, p_reading numeric, p_note text default null, p_corrects uuid default null, p_crid uuid default gen_random_uuid())
    returns jsonb language sql as
    $f$ select jsonb_build_object('client_request_id', p_crid, 'unit_id', p_unit, 'reading_c', p_reading,
          'corrective_action', p_note, 'corrects_submission_id', p_corrects) $f$ $q$;

  select count(*) into b_subs from compliance_form_submissions;
  select count(*) into b_alerts from compliance_alert_log;
  select count(*) into b_ven from venues;

  -- fixtures
  insert into venues(id, name, slug) values (vT,'T0b test','t0b-'||substr(vT::text,1,8)), (vO,'T0b other','t0b-'||substr(vO::text,1,8));
  insert into auth.users(id, aud, role, email) values
    (a_owner,'authenticated','authenticated','o'||a_owner||'@t.test'), (a_mgr,'authenticated','authenticated','m'||a_mgr||'@t.test'),
    (a_boh,'authenticated','authenticated','b'||a_boh||'@t.test'), (a_foh,'authenticated','authenticated','f'||a_foh||'@t.test'),
    (a_nod,'authenticated','authenticated','n'||a_nod||'@t.test'), (a_mgro,'authenticated','authenticated','x'||a_mgro||'@t.test');
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Duty Manager','FOH','authorized') returning id into r_mgr;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Kitchen Hand','BOH','frontline') returning id into r_boh;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Floor Staff','FOH','frontline') returning id into r_foh;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Unassigned',null,'frontline') returning id into r_nod;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vO,'Head Chef','BOH','authorized') returning id into r_mgro;
  insert into app_users(auth_id,venue_id,role,name) values (a_owner,vT,'owner','Olive Owner') returning id into s_owner;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_mgr,vT,'staff','Dave Duty',r_mgr) returning id into s_mgr;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_boh,vT,'staff','Kit Hand',r_boh) returning id into s_boh;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_foh,vT,'staff','Flo Floor',r_foh) returning id into s_foh;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_nod,vT,'staff','Nora NoDept',r_nod) returning id into s_nod;
  insert into app_users(venue_id,role,name,staff_role_id,deactivated_at) values (vT,'staff','Gone Gary',r_boh,now()) returning id into s_gone;
  insert into app_users(venue_id,role,name) values (vO,'owner','Other Owner') returning id into s_owner_o;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_mgro,vO,'staff','Other Mgr',r_mgro) returning id into s_mgr_o;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vT,'Walk in','cold',5) returning id into u_cold;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vT,'Freezer','frozen',-15) returning id into u_frz;
  insert into venue_refrigeration_units(venue_id,name,unit_type,min_temp_c) values (vT,'Bain marie','hot_hold',60) returning id into u_hot;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c,is_active) values (vT,'Old fridge','cold',5,false) returning id into u_old;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vO,'Other walk in','cold',5) returning id into u_oth;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vT,'Idem','cold',5) returning id into u_idem;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vT,'Atom','cold',5) returning id into u_atom;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vT,'Ep1','cold',5) returning id into u_e1;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vT,'Ep2','cold',5) returning id into u_e2;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vT,'Ep3','cold',5) returning id into u_e3;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vT,'Ep4','cold',5) returning id into u_e4;

  -- ===== EXECUTE privileges
  out := out || pg_temp.chk('EXECUTE: anon cannot', not has_function_privilege('anon','public.submit_compliance_form(uuid,uuid,text,text[],jsonb,text)','EXECUTE'));
  out := out || pg_temp.chk('EXECUTE: authenticated cannot', not has_function_privilege('authenticated','public.submit_compliance_form(uuid,uuid,text,text[],jsonb,text)','EXECUTE'));
  out := out || pg_temp.chk('EXECUTE: service_role can', has_function_privilege('service_role','public.submit_compliance_form(uuid,uuid,text,text[],jsonb,text)','EXECUTE'));
  execute 'set local role authenticated';
  begin perform public.submit_compliance_form(vT, s_boh, 'B2', array['BOH'], jsonb_build_array(pg_temp.e(u_cold,4)), 'x'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('EXECUTE: a real call as authenticated is denied', not ok);
  execute 'set local role anon';
  begin perform public.submit_compliance_form(vT, s_boh, 'B2', array['BOH'], jsonb_build_array(pg_temp.e(u_cold,4)), 'x'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('EXECUTE: a real call as anon is denied', not ok);

  -- ===== audience and membership
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_cold, 4.0)));
  out := out || pg_temp.chk('BOH frontline can submit an in range reading', (res->>'ok')::boolean and (res->'res'->0->>'inserted')::boolean and not (res->'res'->0->>'out_of_range')::boolean);
  out := out || pg_temp.chk('submitted_by and the name are stamped server side', exists(select 1 from compliance_form_submissions where venue_id=vT and submitted_by_name='Kit Hand' and submitted_by=s_boh and device_stamp='test-device'));
  out := out || pg_temp.chk('FOH frontline denied', not (pg_temp.rt(vT, s_foh, jsonb_build_array(pg_temp.e(u_cold,4)))->>'ok')::boolean);
  out := out || pg_temp.chk('no department frontline denied', not (pg_temp.rt(vT, s_nod, jsonb_build_array(pg_temp.e(u_cold,4)))->>'ok')::boolean);
  out := out || pg_temp.chk('manager tier (FOH Duty Manager) can submit', (pg_temp.rt(vT, s_mgr, jsonb_build_array(pg_temp.e(u_frz,-18)))->>'ok')::boolean);
  out := out || pg_temp.chk('owner can submit', (pg_temp.rt(vT, s_owner, jsonb_build_array(pg_temp.e(u_hot,70)))->>'ok')::boolean);
  out := out || pg_temp.chk('manager tier staff id from another venue denied', not (pg_temp.rt(vT, s_mgr_o, jsonb_build_array(pg_temp.e(u_cold,4)))->>'ok')::boolean);
  out := out || pg_temp.chk('owner id from another venue denied', not (pg_temp.rt(vT, s_owner_o, jsonb_build_array(pg_temp.e(u_cold,4)))->>'ok')::boolean);
  out := out || pg_temp.chk('deactivated staff denied', not (pg_temp.rt(vT, s_gone, jsonb_build_array(pg_temp.e(u_cold,4)))->>'ok')::boolean);
  out := out || pg_temp.chk('unknown staff id denied', not (pg_temp.rt(vT, gen_random_uuid(), jsonb_build_array(pg_temp.e(u_cold,4)))->>'ok')::boolean);
  out := out || pg_temp.chk('invalid audience value denied', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_cold,4)), array['KITCHEN'])->>'ok')::boolean);
  out := out || pg_temp.chk('empty audience denied', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_cold,4)), array[]::text[])->>'ok')::boolean);
  out := out || pg_temp.chk('FOH in the audience lets FOH staff submit', (pg_temp.rt(vT, s_foh, jsonb_build_array(pg_temp.e(u_cold,3.5)), array['FOH','BOH','BOH'])->>'ok')::boolean);
  out := out || pg_temp.chk('audience stored de-duplicated and sorted', exists(select 1 from compliance_form_submissions where venue_id=vT and visible_to_roles = array['BOH','FOH']));
  begin perform public.submit_compliance_form(vT, s_boh, 'B3', array['BOH'], jsonb_build_array(pg_temp.e(u_cold,4)), 'x'); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('unsupported form id rejected', not ok);

  -- ===== limits per unit type, boundaries and the forced note
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_cold,5.0)));
  out := out || pg_temp.chk('cold 5.0 is in range (boundary)', (res->'res'->0->>'out_of_range')::boolean = false);
  out := out || pg_temp.chk('cold 5.1 without a note is rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_cold,5.1)))->>'ok')::boolean);
  out := out || pg_temp.chk('whitespace only note is rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_cold,5.1,'   ')))->>'ok')::boolean);
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_cold,5.1,'Moved stock to the other cool room')));
  out := out || pg_temp.chk('cold 5.1 with a note is saved and flagged', (res->>'ok')::boolean and (res->'res'->0->>'out_of_range')::boolean);
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_frz,-15.0)));
  out := out || pg_temp.chk('frozen -15.0 is in range (boundary)', (res->'res'->0->>'out_of_range')::boolean = false);
  out := out || pg_temp.chk('frozen -14.9 without a note is rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_frz,-14.9)))->>'ok')::boolean);
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_frz,-14.9,'Door left open, rechecking')));
  out := out || pg_temp.chk('frozen -14.9 with a note is flagged', (res->'res'->0->>'out_of_range')::boolean);
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_hot,60.0)));
  out := out || pg_temp.chk('hot hold 60.0 is in range (boundary)', (res->'res'->0->>'out_of_range')::boolean = false);
  out := out || pg_temp.chk('hot hold 59.9 without a note is rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_hot,59.9)))->>'ok')::boolean);
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_hot,59.9,'Element tripped, reheating')));
  out := out || pg_temp.chk('hot hold 59.9 with a note is flagged', (res->'res'->0->>'out_of_range')::boolean);
  out := out || pg_temp.chk('payload keeps a snapshot of the unit limit', exists(select 1 from compliance_form_submissions where venue_id=vT and payload->>'unit_type'='hot_hold' and payload->>'limit_kind'='min' and (payload->>'limit_c')::numeric=60));
  out := out || pg_temp.chk('reading above 150 rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_cold,151,'x')))->>'ok')::boolean);
  out := out || pg_temp.chk('reading below -60 rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_cold,-61,'x')))->>'ok')::boolean);
  out := out || pg_temp.chk('reading sent as a JSON string rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(jsonb_build_object('client_request_id', gen_random_uuid(), 'unit_id', u_cold, 'reading_c', '4')))->>'ok')::boolean);
  out := out || pg_temp.chk('missing client_request_id rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(jsonb_build_object('unit_id', u_cold, 'reading_c', 4)))->>'ok')::boolean);
  out := out || pg_temp.chk('retired unit rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_old,4)))->>'ok')::boolean);
  out := out || pg_temp.chk('another venue''s unit rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_oth,4)))->>'ok')::boolean);
  out := out || pg_temp.chk('same unit twice in one call rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_cold,4), pg_temp.e(u_cold,3)))->>'ok')::boolean);
  out := out || pg_temp.chk('empty entries rejected', not (pg_temp.rt(vT, s_boh, '[]'::jsonb)->>'ok')::boolean);
  out := out || pg_temp.chk('entries that are not an array rejected', not (pg_temp.rt(vT, s_boh, '{}'::jsonb)->>'ok')::boolean);
  out := out || pg_temp.chk('forged submitted_by cannot be supplied (no such parameter; entry key ignored)', (pg_temp.rt(vT, s_boh, jsonb_build_array(jsonb_build_object('client_request_id', gen_random_uuid(), 'unit_id', u_cold, 'reading_c', 4, 'submitted_by', s_owner, 'out_of_range', false)))->>'ok')::boolean
      and not exists (select 1 from compliance_form_submissions where venue_id=vT and submitted_by=s_owner and payload->>'unit_id'=u_cold::text));

  -- ===== idempotency and atomicity
  crid := gen_random_uuid();
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_idem, 4, null, null, crid)));
  res2 := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_idem, 4, null, null, crid)));
  select count(*) into n from compliance_form_submissions where venue_id=vT and client_request_id=crid;
  out := out || pg_temp.chk('first send inserts', (res->'res'->0->>'inserted')::boolean);
  out := out || pg_temp.chk('replay of the same request id inserts nothing and reports the original row', not (res2->'res'->0->>'inserted')::boolean and (res2->'res'->0->>'id') = (res->'res'->0->>'id') and n = 1);
  out := out || pg_temp.chk('same request id with a different reading is rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_idem, 3, null, null, crid)))->>'ok')::boolean);
  out := out || pg_temp.chk('same request id for a different unit is rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_cold, 4, null, null, crid)))->>'ok')::boolean);
  out := out || pg_temp.chk('same request id from a different staff member is rejected', not (pg_temp.rt(vT, s_mgr, jsonb_build_array(pg_temp.e(u_idem, 4, null, null, crid)))->>'ok')::boolean);
  select count(*) into n from compliance_form_submissions where venue_id=vT;
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_atom, 4), pg_temp.e(u_cold, 500, 'x')));
  select count(*) into n2 from compliance_form_submissions where venue_id=vT;
  out := out || pg_temp.chk('a batch with one bad reading persists nothing (atomic)', not (res->>'ok')::boolean and n = n2);
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_atom, 4), pg_temp.e(u_e1, 4), pg_temp.e(u_e2, 4)));
  out := out || pg_temp.chk('a valid batch of 3 units inserts 3 rows', (res->>'ok')::boolean and jsonb_array_length(res->'res') = 3);

  -- ===== submitted_at is server time and strictly ordered
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e3, 4)));
  res2 := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e3, 4.2)));
  select submitted_at into t1 from compliance_form_submissions where id = (res->'res'->0->>'id')::uuid;
  select submitted_at into t2 from compliance_form_submissions where id = (res2->'res'->0->>'id')::uuid;
  out := out || pg_temp.chk('server stamps submitted_at and later saves are later', t2 > t1 and abs(extract(epoch from (clock_timestamp() - t2))) < 60);

  -- ===== episodes (one alert per unit per out of range episode)
  -- u_e1 already has an in range reading from the batch above
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e1, 6, 'Rechecking in 30 minutes')));
  sA := (res->'res'->0->>'id')::uuid;
  select count(*) into n from compliance_alert_log where venue_id=vT and submission_id=sA;
  out := out || pg_temp.chk('first out of range reading starts an episode and writes one alert row', (res->'res'->0->>'new_episode')::boolean and n = 1);
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e1, 7, 'Still warm, called technician')));
  sB := (res->'res'->0->>'id')::uuid;
  select count(*) into n from compliance_alert_log where submission_id=sB;
  select count(*) into n2 from compliance_alert_log al join compliance_form_submissions s on s.id=al.submission_id where s.payload->>'unit_id'=u_e1::text;
  out := out || pg_temp.chk('a second out of range reading in the same episode adds no alert', not (res->'res'->0->>'new_episode')::boolean and n = 0 and n2 = 1);
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e1, 4)));
  out := out || pg_temp.chk('an in range reading ends the episode', not (res->'res'->0->>'new_episode')::boolean and not (res->'res'->0->>'out_of_range')::boolean);
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e1, 8, 'Failed again')));
  select count(*) into n2 from compliance_alert_log al join compliance_form_submissions s on s.id=al.submission_id where s.payload->>'unit_id'=u_e1::text;
  out := out || pg_temp.chk('going out of range again after a recheck starts a NEW episode (second alert)', (res->'res'->0->>'new_episode')::boolean and n2 = 2);

  -- ===== corrections
  -- u_e2: in(4) from the batch, then out, then correct the latest out with an in range value
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e2, 9, 'Door ajar')));
  sA := (res->'res'->0->>'id')::uuid;
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e2, 4.5, null, sA)));
  sB := (res->'res'->0->>'id')::uuid;
  select count(*) into n from compliance_alert_log where submission_id = sA;
  out := out || pg_temp.chk('correcting the latest out of range reading with an in range one succeeds', (res->>'ok')::boolean and not (res->'res'->0->>'out_of_range')::boolean);
  out := out || pg_temp.chk('the now false unsent alert is removed', n = 0);
  out := out || pg_temp.chk('the latest effective reading for the unit is the correction', exists(select 1 from compliance_b2_latest_readings where venue_id=vT and unit_id=u_e2 and id=sB and not out_of_range));
  out := out || pg_temp.chk('the corrected reading is no longer effective (not in the view)', not exists(select 1 from compliance_b2_latest_readings where id=sA));
  out := out || pg_temp.chk('correcting the same reading twice is rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e2, 3, null, sA)))->>'ok')::boolean);
  select count(*) into n from compliance_form_submissions where venue_id=vT and payload->>'unit_id'=u_e2::text;
  out := out || pg_temp.chk('nothing was edited: the original row still exists unchanged', exists(select 1 from compliance_form_submissions where id=sA and out_of_range and (payload->>'reading_c')::numeric=9) and n = 3);
  -- an older reading cannot be corrected (it would hide a later reading)
  out := out || pg_temp.chk('correcting an older reading (not the latest) is rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e2, 3, null, (select id from compliance_form_submissions where venue_id=vT and payload->>'unit_id'=u_e2::text and not out_of_range and corrects_submission_id is null order by submitted_at limit 1))))->>'ok')::boolean);
  -- u_e3: latest is in range; correct it into an out of range value (new episode)
  select id into sC from compliance_form_submissions where venue_id=vT and payload->>'unit_id'=u_e3::text order by submitted_at desc limit 1;
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e3, 9, 'Probe was wrong, really warm', sC)));
  sD := (res->'res'->0->>'id')::uuid;
  select count(*) into n from compliance_alert_log where submission_id = sD;
  out := out || pg_temp.chk('correcting an in range reading into an out of range one starts an episode with an alert', (res->'res'->0->>'new_episode')::boolean and n = 1);
  -- continue the episode: correct that latest out of range reading with another out of range value
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e3, 10, 'Typo, it is 10', sD)));
  sE := (res->'res'->0->>'id')::uuid;
  select count(*) into n from compliance_alert_log al join compliance_form_submissions s on s.id=al.submission_id where s.payload->>'unit_id'=u_e3::text;
  out := out || pg_temp.chk('correcting out of range with out of range keeps ONE alert and moves it to the latest reading', n = 1 and exists(select 1 from compliance_alert_log where submission_id = sE) and not exists(select 1 from compliance_alert_log where submission_id = sD));
  -- u_e4: alert already sent, then correct out with out: the sent alert stays, no new alert
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e4, 9, 'Warm')));
  sA := (res->'res'->0->>'id')::uuid;
  update compliance_alert_log set email_sent_at = now() where submission_id = sA;
  res := pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e4, 10, 'Typo', sA)));
  select count(*) into n from compliance_alert_log al join compliance_form_submissions s on s.id=al.submission_id where s.payload->>'unit_id'=u_e4::text;
  out := out || pg_temp.chk('an already sent alert stays on the original reading and no second email is queued', n = 1 and exists(select 1 from compliance_alert_log where submission_id = sA and email_sent_at is not null));
  out := out || pg_temp.chk('a correction must target a reading of the same unit', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e2, 4, null, sE)))->>'ok')::boolean);
  out := out || pg_temp.chk('a correction of a non existent id is rejected', not (pg_temp.rt(vT, s_boh, jsonb_build_array(pg_temp.e(u_e2, 4, null, gen_random_uuid())))->>'ok')::boolean);

  -- ===== visibility under RLS (impersonated)
  select count(*) into n_all from compliance_form_submissions where venue_id = vT;
  select count(*) into n_foh_expected from compliance_form_submissions where venue_id = vT and ('FOH' = any(visible_to_roles) or submitted_by = s_foh);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_boh, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated'; select count(*) into c_boh from compliance_form_submissions where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_mgr, 'role', 'authenticated')::text, true);
  select count(*) into c_mgr from compliance_form_submissions where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_owner, 'role', 'authenticated')::text, true);
  select count(*) into c_owner from compliance_form_submissions where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_foh, 'role', 'authenticated')::text, true);
  select count(*) into c_foh from compliance_form_submissions where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_nod, 'role', 'authenticated')::text, true);
  select count(*) into c_nod from compliance_form_submissions where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_mgro, 'role', 'authenticated')::text, true);
  select count(*) into c_oth from compliance_form_submissions where venue_id = vT;
  execute 'reset role';
  out := out || pg_temp.chk('BOH frontline sees every B2 row of the venue (audience includes BOH)', c_boh = n_all);
  out := out || pg_temp.chk('manager tier sees all B2 rows', c_mgr = n_all);
  out := out || pg_temp.chk('owner sees all B2 rows', c_owner = n_all);
  out := out || pg_temp.chk('FOH frontline sees only rows whose audience includes FOH or that they wrote', c_foh = n_foh_expected and c_foh < n_all);
  out := out || pg_temp.chk('staff with no department sees no B2 rows', c_nod = 0);
  out := out || pg_temp.chk('manager tier of ANOTHER venue sees none of this venue''s rows', c_oth = 0);

  -- the view and the alert log under RLS
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_boh, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated'; select count(*) into c_boh from compliance_b2_latest_readings where venue_id = vT;
  select count(*) into n from compliance_alert_log where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_mgr, 'role', 'authenticated')::text, true);
  select count(*) into c_mgr from compliance_b2_latest_readings where venue_id = vT;
  select count(*) into n2 from compliance_alert_log where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_owner, 'role', 'authenticated')::text, true);
  select count(*) into c_owner from compliance_b2_latest_readings where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_nod, 'role', 'authenticated')::text, true);
  select count(*) into c_nod from compliance_b2_latest_readings where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_mgro, 'role', 'authenticated')::text, true);
  select count(*) into c_oth from compliance_b2_latest_readings where venue_id = vT;
  execute 'reset role';
  select count(distinct unit_id) into n_all from compliance_b2_latest_readings where venue_id = vT;
  out := out || pg_temp.chk('latest readings view: BOH, manager tier and owner all see one row per unit', c_boh = n_all and c_mgr = n_all and c_owner = n_all);
  out := out || pg_temp.chk('latest readings view: no department staff and other venue see nothing', c_nod = 0 and c_oth = 0);
  out := out || pg_temp.chk('alert log: frontline sees none, manager tier sees them', n = 0 and n2 > 0);

  -- ===== direct writes are denied to every client role
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_owner, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin insert into compliance_form_submissions(venue_id,form_id,submitted_by,payload) values (vT,'B2',s_owner,'{}'); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('owner cannot INSERT directly into the ledger', not ok);
  begin update compliance_form_submissions set payload='{"x":1}' where venue_id=vT; get diagnostics n = row_count; ok := n > 0; exception when others then ok := false; end;
  out := out || pg_temp.chk('owner cannot UPDATE the ledger', not ok);
  begin delete from compliance_form_submissions where venue_id=vT; get diagnostics n = row_count; ok := n > 0; exception when others then ok := false; end;
  out := out || pg_temp.chk('owner cannot DELETE from the ledger', not ok);
  begin truncate compliance_form_submissions; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('owner cannot TRUNCATE the ledger', not ok);
  begin insert into compliance_alert_log(submission_id, venue_id) select id, venue_id from compliance_form_submissions limit 1; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('owner cannot INSERT into the alert log', not ok);
  begin update compliance_alert_log set email_sent_at = now(); get diagnostics n = row_count; ok := n > 0; exception when others then ok := false; end;
  out := out || pg_temp.chk('owner cannot UPDATE the alert log', not ok);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_boh, 'role', 'authenticated')::text, true);
  begin insert into compliance_form_submissions(venue_id,form_id,submitted_by,payload,out_of_range) values (vT,'B2',s_boh,'{}',false); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('BOH frontline cannot INSERT directly into the ledger (cannot assert out_of_range=false)', not ok);
  execute 'reset role';
  execute 'set local role service_role';
  begin insert into compliance_form_submissions(venue_id,form_id,submitted_by,payload) values (vT,'B2',s_owner,'{}'); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('service_role cannot INSERT into the ledger directly (only the function can)', not ok);
  begin update compliance_form_submissions set payload='{"x":1}' where venue_id=vT; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('service_role cannot UPDATE the ledger', not ok);
  begin truncate compliance_form_submissions; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('service_role cannot TRUNCATE the ledger (revoked in 20261002010000)', not ok);
  execute 'reset role';
  out := out || pg_temp.chk('anon has no privileges on the ledger, view or alert log',
    not has_table_privilege('anon','compliance_form_submissions','SELECT') and not has_table_privilege('anon','compliance_b2_latest_readings','SELECT') and not has_table_privilege('anon','compliance_alert_log','SELECT'));

  -- ===== cascade: deleting the venue removes ledger, corrections and alerts together
  begin delete from venues where id = vT; ok := true; exception when others then ok := false; out := out || 'cascade error: ' || sqlerrm; end;
  select count(*) into n from compliance_form_submissions where venue_id = vT;
  select count(*) into n2 from compliance_alert_log where venue_id = vT;
  out := out || pg_temp.chk('venue delete cascades over the ledger (with correction chains) and the alert log', ok and n = 0 and n2 = 0);

  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\nbaseline: submissions=% alerts=% venues=%\n%', pass, fail, b_subs, b_alerts, b_ven,
    array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
