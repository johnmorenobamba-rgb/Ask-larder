-- Compliance Forms 0a RLS suite. Run against larder-dev via the Supabase SQL runner.
-- Everything runs inside ONE DO block that ends with a forced RAISE EXCEPTION,
-- so nothing can persist. The "error" it returns IS the result summary.
-- (Updated for 0b: direct client INSERT on the ledger is denied, service_role has no INSERT/UPDATE/TRUNCATE.)
-- Expected: 0 FAIL and identical baseline counts before and after (check counts with a plain SELECT afterwards).
-- It builds its OWN throwaway venues, staff and auth users inside the transaction (rolled back with
-- everything else) and never touches the demo venue or any real venue.
do $$
declare
  vA uuid := gen_random_uuid(); vO uuid := gen_random_uuid();
  a_owner uuid := gen_random_uuid(); a_mgr uuid := gen_random_uuid(); a_boh uuid := gen_random_uuid();
  a_foh uuid := gen_random_uuid(); a_mgro uuid := gen_random_uuid();
  r_mgr uuid; r_boh uuid; r_foh uuid; r_mgro uuid;
  s_owner uuid; s_mgr uuid; s_boh uuid; s_foh uuid; s_mgro uuid;
  priya uuid; gary uuid; actors jsonb;
  a jsonb; out text[] := '{}'; ok boolean; n int; sid1 uuid; exp boolean; spoof uuid;
  b_set int; b_units int; b_subs int; pass int := 0; fail int := 0;
begin
  -- throwaway fixtures (all rolled back); never the demo venue
  insert into venues(id, name, slug) values (vA,'T0a test','t0a-'||substr(vA::text,1,8)), (vO,'T0a other','t0a-'||substr(vO::text,1,8));
  insert into auth.users(id, aud, role, email) values
    (a_owner,'authenticated','authenticated','o'||a_owner||'@t.test'), (a_mgr,'authenticated','authenticated','m'||a_mgr||'@t.test'),
    (a_boh,'authenticated','authenticated','b'||a_boh||'@t.test'), (a_foh,'authenticated','authenticated','f'||a_foh||'@t.test'),
    (a_mgro,'authenticated','authenticated','x'||a_mgro||'@t.test');
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vA,'Duty Manager','FOH','authorized') returning id into r_mgr;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vA,'Kitchen Hand','BOH','frontline') returning id into r_boh;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vA,'Floor Staff','FOH','frontline') returning id into r_foh;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vO,'Head Chef','BOH','authorized') returning id into r_mgro;
  insert into app_users(auth_id,venue_id,role,name) values (a_owner,vA,'owner','Olive Owner') returning id into s_owner;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_mgr,vA,'staff','Dave Duty',r_mgr) returning id into s_mgr;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_boh,vA,'staff','Kit Hand',r_boh) returning id into s_boh;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_foh,vA,'staff','Flo Floor',r_foh) returning id into s_foh;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_mgro,vO,'staff','Other Mgr',r_mgro) returning id into s_mgro;
  priya := s_boh; gary := s_owner;
  actors := jsonb_build_array(
    jsonb_build_object('n','frontline_boh','auth',a_boh,'app',s_boh,'mgr',false,'sees_sid1',true),
    jsonb_build_object('n','frontline_foh','auth',a_foh,'app',s_foh,'mgr',false,'sees_sid1',false),
    jsonb_build_object('n','manager_tier','auth',a_mgr,'app',s_mgr,'mgr',true,'sees_sid1',true),
    jsonb_build_object('n','owner','auth',a_owner,'app',s_owner,'mgr',true,'sees_sid1',true),
    jsonb_build_object('n','other_venue_mgr','auth',a_mgro,'app',s_mgro,'mgr',false,'sees_sid1',false,'other',true));
  select count(*) into b_set from venue_compliance_settings;
  select count(*) into b_units from venue_refrigeration_units;
  select count(*) into b_subs from compliance_form_submissions;
  delete from venue_compliance_settings where venue_id=vA;
  delete from venue_refrigeration_units where venue_id=vA;

  for a in select * from jsonb_array_elements(actors) loop
    insert into compliance_form_submissions(venue_id,form_id,submitted_by,submitted_by_name,visible_to_roles)
      values (vA,'b2',priya,'seed',array['BOH']) returning id into sid1;
    perform set_config('request.jwt.claims', jsonb_build_object('sub',a->>'auth','role','authenticated')::text, true);
    exp := (a->>'mgr')::boolean;
    execute 'set local role authenticated';
    begin insert into venue_compliance_settings(venue_id) values (vA); ok:=true; exception when others then ok:=false; end;
    out := out || format('%s settings INSERT allowed=%s expected=%s %s', a->>'n', ok, exp, case when ok=exp then 'PASS' else 'FAIL' end);
    execute 'reset role'; delete from venue_compliance_settings where venue_id=vA; insert into venue_compliance_settings(venue_id) values (vA);
    execute 'set local role authenticated';
    begin update venue_compliance_settings set offers_accommodation=true where venue_id=vA; get diagnostics n = row_count; ok := n>0; exception when others then ok:=false; end;
    out := out || format('%s settings UPDATE allowed=%s expected=%s %s', a->>'n', ok, exp, case when ok=exp then 'PASS' else 'FAIL' end);
    begin delete from venue_compliance_settings where venue_id=vA; get diagnostics n = row_count; ok := n>0; exception when others then ok:=false; end;
    out := out || format('%s settings DELETE allowed=%s expected=false %s', a->>'n', ok, case when not ok then 'PASS' else 'FAIL' end);
    select count(*) into n from venue_compliance_settings where venue_id=vA;
    out := out || format('%s settings SELECT sees=%s expected=%s %s', a->>'n', n>0, not coalesce((a->>'other')::boolean,false), case when (n>0)=(not coalesce((a->>'other')::boolean,false)) then 'PASS' else 'FAIL' end);
    execute 'reset role'; delete from venue_compliance_settings where venue_id=vA;

    execute 'set local role authenticated';
    begin insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vA,'T','cold',5); ok:=true; exception when others then ok:=false; end;
    out := out || format('%s units INSERT allowed=%s expected=%s %s', a->>'n', ok, exp, case when ok=exp then 'PASS' else 'FAIL' end);
    execute 'reset role'; delete from venue_refrigeration_units where venue_id=vA; insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vA,'T','cold',5);
    execute 'set local role authenticated';
    begin update venue_refrigeration_units set is_active=false where venue_id=vA; get diagnostics n = row_count; ok := n>0; exception when others then ok:=false; end;
    out := out || format('%s units UPDATE(retire) allowed=%s expected=%s %s', a->>'n', ok, exp, case when ok=exp then 'PASS' else 'FAIL' end);
    begin delete from venue_refrigeration_units where venue_id=vA; get diagnostics n = row_count; ok := n>0; exception when others then ok:=false; end;
    out := out || format('%s units DELETE allowed=%s expected=false %s', a->>'n', ok, case when not ok then 'PASS' else 'FAIL' end);
    select count(*) into n from venue_refrigeration_units where venue_id=vA;
    out := out || format('%s units SELECT sees=%s expected=%s %s', a->>'n', n>0, not coalesce((a->>'other')::boolean,false), case when (n>0)=(not coalesce((a->>'other')::boolean,false)) then 'PASS' else 'FAIL' end);
    execute 'reset role'; delete from venue_refrigeration_units where venue_id=vA;

    execute 'set local role authenticated';
    exp := false; -- 0b: direct client INSERT is denied for everyone, in every venue
    begin insert into compliance_form_submissions(venue_id,form_id,submitted_by,payload) values (vA,'b2',(a->>'app')::uuid,'{"t":4}'); ok:=true; exception when others then ok:=false; end;
    out := out || format('%s submissions INSERT own allowed=%s expected=%s %s', a->>'n', ok, exp, case when ok=exp then 'PASS' else 'FAIL' end);
    spoof := case when (a->>'app')::uuid = gary then priya else gary end;
    begin insert into compliance_form_submissions(venue_id,form_id,submitted_by) values (vA,'b2',spoof); ok:=true; exception when others then ok:=false; end;
    out := out || format('%s submissions INSERT spoofed submitted_by allowed=%s expected=false %s', a->>'n', ok, case when not ok then 'PASS' else 'FAIL' end);
    begin insert into compliance_form_submissions(venue_id,form_id,submitted_by,visible_to_roles) values (vA,'b2',(a->>'app')::uuid,array['BOH']); ok:=true; exception when others then ok:=false; end;
    out := out || format('%s submissions INSERT client-set visible_to_roles allowed=%s expected=false %s', a->>'n', ok, case when not ok then 'PASS' else 'FAIL' end);
    begin insert into compliance_form_submissions(venue_id,form_id,submitted_by,out_of_range) values (vA,'b2',(a->>'app')::uuid,true); ok:=true; exception when others then ok:=false; end;
    out := out || format('%s submissions INSERT out_of_range without corrective_action allowed=%s expected=false %s', a->>'n', ok, case when not ok then 'PASS' else 'FAIL' end);
    select count(*) into n from compliance_form_submissions where id=sid1;
    exp := (a->>'sees_sid1')::boolean;
    out := out || format('%s submissions SELECT seeded BOH row sees=%s expected=%s %s', a->>'n', n>0, exp, case when (n>0)=exp then 'PASS' else 'FAIL' end);
    begin update compliance_form_submissions set payload='{"x":1}' where venue_id=vA; get diagnostics n = row_count; ok := n>0; exception when others then ok:=false; end;
    out := out || format('%s submissions UPDATE allowed=%s expected=false %s', a->>'n', ok, case when not ok then 'PASS' else 'FAIL' end);
    begin delete from compliance_form_submissions where venue_id=vA; get diagnostics n = row_count; ok := n>0; exception when others then ok:=false; end;
    out := out || format('%s submissions DELETE allowed=%s expected=false %s', a->>'n', ok, case when not ok then 'PASS' else 'FAIL' end);
    execute 'reset role';
    delete from compliance_form_submissions where venue_id=vA;
  end loop;

  -- privilege assertions (P1 hardening, migration 20261001000000)
  declare t text; p text; want boolean;
  begin
    foreach t in array array['compliance_form_submissions','venue_compliance_settings','venue_refrigeration_units'] loop
      foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        ok := has_table_privilege('anon', t, p);
        out := out || format('GRANT anon %s on %s has=%s expected=false %s', p, t, ok, case when not ok then 'PASS' else 'FAIL' end);
      end loop;
    end loop;
    foreach p in array array['UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      ok := has_table_privilege('authenticated','compliance_form_submissions',p);
      out := out || format('GRANT authenticated %s on compliance_form_submissions has=%s expected=false %s', p, ok, case when not ok then 'PASS' else 'FAIL' end);
    end loop;
    ok := has_table_privilege('authenticated','compliance_form_submissions','SELECT');
    out := out || format('GRANT authenticated SELECT on compliance_form_submissions has=%s expected=true %s', ok, case when ok then 'PASS' else 'FAIL' end);
    ok := has_any_column_privilege('authenticated','compliance_form_submissions','INSERT');
    out := out || format('GRANT authenticated column INSERT on compliance_form_submissions has=%s expected=false %s', ok, case when not ok then 'PASS' else 'FAIL' end);
    foreach p in array array['INSERT','UPDATE','TRUNCATE','REFERENCES','TRIGGER'] loop
      ok := has_table_privilege('service_role','compliance_form_submissions',p);
      out := out || format('GRANT service_role %s on compliance_form_submissions has=%s expected=false %s', p, ok, case when not ok then 'PASS' else 'FAIL' end);
    end loop;
    foreach t in array array['venue_compliance_settings','venue_refrigeration_units'] loop
      foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        want := p in ('SELECT','INSERT','UPDATE');
        ok := has_table_privilege('authenticated', t, p);
        out := out || format('GRANT authenticated %s on %s has=%s expected=%s %s', p, t, ok, want, case when ok=want then 'PASS' else 'FAIL' end);
      end loop;
    end loop;
  end;

  -- The privilege revoke now denies UPDATE/DELETE before RLS or the trigger is reached.
  -- To keep proving the trigger as a second wall, temporarily re-grant (rolled back with everything else).
  execute 'grant update, delete on compliance_form_submissions to authenticated';
  insert into compliance_form_submissions(venue_id,form_id,submitted_by,submitted_by_name) values (vA,'b2',gary,'seed') returning id into sid1;
  execute 'create policy tmp_up on compliance_form_submissions for update using (true)';
  execute 'create policy tmp_del on compliance_form_submissions for delete using (true)';
  perform set_config('request.jwt.claims', jsonb_build_object('sub',a_owner,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin update compliance_form_submissions set payload='{"x":1}' where id=sid1; ok:=true; exception when others then ok:=false; end;
  out := out || format('TRIGGER owner UPDATE despite permissive policy allowed=%s expected=false %s', ok, case when not ok then 'PASS' else 'FAIL' end);
  begin delete from compliance_form_submissions where id=sid1; ok:=true; exception when others then ok:=false; end;
  out := out || format('TRIGGER owner DELETE despite permissive policy allowed=%s expected=false %s', ok, case when not ok then 'PASS' else 'FAIL' end);
  execute 'reset role';
  begin delete from compliance_form_submissions where id=sid1; get diagnostics n=row_count; ok := n=1; exception when others then ok:=false; end;
  out := out || format('SERVICE ROLE delete works=%s expected=true %s', ok, case when ok then 'PASS' else 'FAIL' end);
  declare tv uuid; ta uuid; begin
    insert into venues(name,slug) values ('tmp cascade','tmp-cascade-0a') returning id into tv;
    insert into app_users(venue_id,role,name) values (tv,'owner','Tmp Owner') returning id into ta;
    insert into compliance_form_submissions(venue_id,form_id,submitted_by,submitted_by_name) values (tv,'b2',ta,'x');
    insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (tv,'u','cold',5);
    insert into venue_compliance_settings(venue_id) values (tv);
    begin delete from venues where id=tv; ok:=true; exception when others then ok:=false; out := out || 'cascade err: '||sqlerrm; end;
    out := out || format('VENUE CASCADE (submission + staff + unit + settings) works=%s expected=true %s', ok, case when ok then 'PASS' else 'FAIL' end);
  end;
  select count(*) filter (where l like '%PASS'), count(*) filter (where l like '%FAIL') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\nbaseline before: settings=% units=% submissions=%\n%', pass, fail, b_set, b_units, b_subs, array_to_string(array(select l from unnest(out) l where l like '%FAIL'), E'\n');
end $$;
