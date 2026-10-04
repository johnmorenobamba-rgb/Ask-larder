-- Venue type (20261005070000): the column, its check, who can set it, and that no existing venue was touched. Rolled back.
-- Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); vO uuid := gen_random_uuid(); a_own uuid := gen_random_uuid(); a_fl uuid := gen_random_uuid(); a_oth uuid := gen_random_uuid();
  r_fl uuid; out text[] := '{}'; n int; ok boolean; pass int; fail int; existing_typed int; existing_total int; t text;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  select count(*) filter (where venue_type is not null), count(*) into existing_typed, existing_total from venue_compliance_settings;
  out := out || pg_temp.chk('no existing venue has a venue type (' || existing_total || ' settings rows, all null)', existing_typed = 0);
  out := out || pg_temp.chk('the column is nullable text', exists (select 1 from information_schema.columns where table_name = 'venue_compliance_settings' and column_name = 'venue_type' and is_nullable = 'YES' and data_type = 'text'));

  insert into venues(id,name,slug) values (vT,'VType','vt-'||substr(vT::text,1,8)),(vO,'VTypeO','vt-'||substr(vO::text,1,8));
  insert into auth.users(id,aud,role,email) values (a_own,'authenticated','authenticated','o'||a_own||'@t.test'),(a_fl,'authenticated','authenticated','f'||a_fl||'@t.test'),(a_oth,'authenticated','authenticated','x'||a_oth||'@t.test');
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Waiter','FOH','frontline') returning id into r_fl;
  insert into app_users(auth_id,venue_id,role,name) values (a_own,vT,'owner','Olive');
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_fl,vT,'staff','Flo',r_fl);
  insert into app_users(auth_id,venue_id,role,name) values (a_oth,vO,'owner','Other');
  insert into venue_compliance_settings(venue_id) values (vT);

  foreach t in array array['cafe','restaurant','pub','bar','other'] loop
    begin update venue_compliance_settings set venue_type = t where venue_id = vT; ok := true; exception when others then ok := false; end;
    out := out || pg_temp.chk('the value ' || t || ' is accepted', ok);
  end loop;
  begin update venue_compliance_settings set venue_type = 'nightclub' where venue_id = vT; ok := true; exception when check_violation then ok := false; end;
  out := out || pg_temp.chk('a value outside the list is refused', not ok);
  begin update venue_compliance_settings set venue_type = null where venue_id = vT; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('the type can be cleared back to null', ok);

  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_own, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin update venue_compliance_settings set venue_type = 'cafe' where venue_id = vT; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('the owner can set the type', ok and n = 1 and (select venue_type from venue_compliance_settings where venue_id = vT) = 'cafe');
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_fl, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin update venue_compliance_settings set venue_type = 'pub' where venue_id = vT; get diagnostics n = row_count; exception when others then n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('a frontline person cannot set the type', (select venue_type from venue_compliance_settings where venue_id = vT) = 'cafe');
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_oth, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin update venue_compliance_settings set venue_type = 'bar' where venue_id = vT; exception when others then null; end;
  select count(*) into n from venue_compliance_settings where venue_id = vT;
  execute 'reset role';
  out := out || pg_temp.chk('another venue cannot read or set it', n = 0 and (select venue_type from venue_compliance_settings where venue_id = vT) = 'cafe');
  execute 'set local role anon';
  begin perform 1 from venue_compliance_settings limit 1; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('anon cannot read the settings', not ok);

  begin delete from venues where id in (vT, vO); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('cleanup cascade works', ok);
  select count(*) filter (where venue_type is not null) into n from venue_compliance_settings;
  out := out || pg_temp.chk('after the test no venue has a type (nothing persisted)', n = existing_typed);
  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
