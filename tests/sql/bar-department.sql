-- P24 BAR department (20261004020000): the department constraint and the RPC audiences. Throwaway venue, rolled back.
-- Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); r_bar uuid; r_foh uuid; r_boh uuid; r_mgr uuid; s_bar uuid; s_foh uuid; s_boh uuid; s_mgr uuid;
  out text[] := '{}'; res jsonb; ok boolean; pass int; fail int;
  rules jsonb := '{"version":"1","fields":[{"key":"ok","type":"passfail","required":true}],"fail":[]}';
  stamp text := 'bar test';
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  insert into venues(id,name,slug) values (vT,'BarT','bart-'||substr(vT::text,1,8));
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Bartender','BAR','frontline') returning id into r_bar;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Waiter','FOH','frontline') returning id into r_foh;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Kitchen Hand','BOH','frontline') returning id into r_boh;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Supervisor','FOH','authorized') returning id into r_mgr;
  insert into app_users(venue_id,role,name,staff_role_id,pin_hash) values (vT,'staff','Bar One',r_bar,'x') returning id into s_bar;
  insert into app_users(venue_id,role,name,staff_role_id,pin_hash) values (vT,'staff','Foh One',r_foh,'x') returning id into s_foh;
  insert into app_users(venue_id,role,name,staff_role_id,pin_hash) values (vT,'staff','Boh One',r_boh,'x') returning id into s_boh;
  insert into app_users(venue_id,role,name,staff_role_id,pin_hash) values (vT,'staff','Sup One',r_mgr,'x') returning id into s_mgr;

  begin insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Odd','ZZZ','frontline'); ok := true; exception when check_violation then ok := false; end;
  out := out || pg_temp.chk('an unknown department is still refused by the check constraint', not ok);

  execute 'set local role service_role';
  res := public.submit_compliance_record(vT, s_bar, 'BAR1', array['BAR'], array['BAR'], rules, jsonb_build_object('client_request_id', gen_random_uuid(), 'values', '{"ok":"pass"}'::jsonb), stamp);
  out := out || pg_temp.chk('a BAR staff member can submit a BAR form', (res->>'inserted')::boolean);
  res := public.submit_compliance_record(vT, s_mgr, 'BAR1', array['BAR'], array['BAR'], rules, jsonb_build_object('client_request_id', gen_random_uuid(), 'values', '{"ok":"pass"}'::jsonb), stamp);
  out := out || pg_temp.chk('a supervisor (manager tier) can submit a BAR form', (res->>'inserted')::boolean);
  begin perform public.submit_compliance_record(vT, s_foh, 'BAR1', array['BAR'], array['BAR'], rules, jsonb_build_object('client_request_id', gen_random_uuid(), 'values', '{"ok":"pass"}'::jsonb), stamp); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('a FOH waiter cannot submit a BAR form', not ok);
  begin perform public.submit_compliance_record(vT, s_boh, 'BAR1', array['BAR'], array['BAR'], rules, jsonb_build_object('client_request_id', gen_random_uuid(), 'values', '{"ok":"pass"}'::jsonb), stamp); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('a BOH kitchen hand cannot submit a BAR form', not ok);
  begin perform public.submit_compliance_record(vT, s_bar, 'BAR1', array['KITCHEN'], array['BAR'], rules, jsonb_build_object('client_request_id', gen_random_uuid(), 'values', '{"ok":"pass"}'::jsonb), stamp); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('an unknown audience is still refused', not ok);
  begin perform public.submit_compliance_record(vT, s_bar, 'F2', array['FOH'], array['FOH'], rules, jsonb_build_object('client_request_id', gen_random_uuid(), 'values', '{"ok":"pass"}'::jsonb), stamp); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('a BAR staff member cannot submit a FOH only form', not ok);
  execute 'reset role';

  begin delete from venues where id = vT; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('cleanup cascade works', ok);
  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
