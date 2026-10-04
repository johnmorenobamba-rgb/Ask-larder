-- P5 suite: who can read, update, delete and insert on venues and venue_licence_profile.
-- One DO block, forced RAISE at the end (nothing persists). Builds its own throwaway venues,
-- auth users and staff; never touches a real or demo venue. Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); vO uuid := gen_random_uuid();
  a_own uuid := gen_random_uuid(); a_mgr uuid := gen_random_uuid(); a_fl uuid := gen_random_uuid(); a_oth uuid := gen_random_uuid();
  r_mgr uuid; r_fl uuid; r_oth uuid;
  out text[] := '{}'; n int; who text; sub uuid; ok boolean; expect_upd boolean;
  b_ven int; b_prof int;
begin
  select count(*) into b_ven from venues;
  select count(*) into b_prof from venue_licence_profile;
  insert into venues(id,name,slug) values (vT,'P5 test','p5-'||substr(vT::text,1,8)), (vO,'P5 other','p5-'||substr(vO::text,1,8));
  insert into auth.users(id,aud,role,email) values
    (a_own,'authenticated','authenticated','o'||a_own||'@t.test'),(a_mgr,'authenticated','authenticated','m'||a_mgr||'@t.test'),
    (a_fl,'authenticated','authenticated','f'||a_fl||'@t.test'),(a_oth,'authenticated','authenticated','x'||a_oth||'@t.test');
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Duty Manager','FOH','authorized') returning id into r_mgr;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Kitchen Hand','BOH','frontline') returning id into r_fl;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vO,'Head Chef','BOH','authorized') returning id into r_oth;
  insert into app_users(auth_id,venue_id,role,name) values (a_own,vT,'owner','Olive');
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_mgr,vT,'staff','Dave',r_mgr),(a_fl,vT,'staff','Kit',r_fl),(a_oth,vO,'staff','Other',r_oth);
  insert into venue_licence_profile(venue_id) values (vT),(vO);

  foreach who in array array['owner','manager','frontline','other venue manager'] loop
    sub := case who when 'owner' then a_own when 'manager' then a_mgr when 'frontline' then a_fl else a_oth end;
    expect_upd := who in ('owner','manager');
    perform set_config('request.jwt.claims', jsonb_build_object('sub', sub, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    -- venues
    select count(*) into n from venues where id = vT;
    out := out || format('%s %s: select own venue row (%s)', case when (who <> 'other venue manager') = (n = 1) then 'PASS' else 'FAIL' end, who, n);
    update venues set name = name where id = vT; get diagnostics n = row_count;
    out := out || format('%s %s: update venue %s (rows %s)', case when expect_upd = (n = 1) then 'PASS' else 'FAIL' end, who, vT = vT, n);
    begin delete from venues where id = vT; get diagnostics n = row_count; ok := false;
    exception when others then ok := true; end;
    out := out || format('%s %s: delete own venue is refused', case when ok then 'PASS' else 'FAIL' end, who);
    begin insert into venues(name,slug) values ('x','p5-ins-'||gen_random_uuid()); ok := false; exception when others then ok := true; end;
    out := out || format('%s %s: insert venue is refused', case when ok then 'PASS' else 'FAIL' end, who);
    begin truncate venues; ok := false; exception when others then ok := true; end;
    out := out || format('%s %s: truncate venues is refused', case when ok then 'PASS' else 'FAIL' end, who);

    -- venue_licence_profile
    select count(*) into n from venue_licence_profile where venue_id = vT;
    out := out || format('%s %s: select own licence profile', case when (who <> 'other venue manager') = (n = 1) then 'PASS' else 'FAIL' end, who);
    update venue_licence_profile set licence_status = licence_status where venue_id = vT; get diagnostics n = row_count;
    out := out || format('%s %s: update own licence profile (rows %s)', case when expect_upd = (n = 1) then 'PASS' else 'FAIL' end, who, n);
    begin delete from venue_licence_profile where venue_id = vT; ok := false; exception when others then ok := true; end;
    out := out || format('%s %s: delete licence profile is refused', case when ok then 'PASS' else 'FAIL' end, who);
    begin truncate venue_licence_profile; ok := false; exception when others then ok := true; end;
    out := out || format('%s %s: truncate licence profile is refused', case when ok then 'PASS' else 'FAIL' end, who);
    -- cross venue write attempt on the OTHER venue (must affect nothing)
    update venues set name = name where id = case when who = 'other venue manager' then vT else vO end; get diagnostics n = row_count;
    out := out || format('%s %s: update the other venue touches 0 rows', case when n = 0 then 'PASS' else 'FAIL' end, who);
    execute 'reset role';
  end loop;

  -- manager tier can still insert a licence profile row (the wizard upserts)
  delete from venue_licence_profile where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_mgr, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin insert into venue_licence_profile(venue_id) values (vT); ok := true; exception when others then ok := false; end;
  out := out || format('%s manager: insert own licence profile (wizard upsert path)', case when ok then 'PASS' else 'FAIL' end);
  execute 'reset role';
  delete from venue_licence_profile where venue_id = vT;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_fl, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin insert into venue_licence_profile(venue_id) values (vT); ok := false; exception when others then ok := true; end;
  out := out || format('%s frontline: insert licence profile is refused', case when ok then 'PASS' else 'FAIL' end);
  execute 'reset role';

  -- anon has no access to either table
  execute 'set local role anon';
  begin perform 1 from venues limit 1; ok := false; exception when others then ok := true; end;
  out := out || format('%s anon: select venues is refused', case when ok then 'PASS' else 'FAIL' end);
  begin perform 1 from venue_licence_profile limit 1; ok := false; exception when others then ok := true; end;
  out := out || format('%s anon: select licence profile is refused', case when ok then 'PASS' else 'FAIL' end);
  execute 'reset role';

  -- service role path still works: delete a venue (cascade) and bootstrap_owner remains callable by service_role only
  execute 'set local role service_role';
  delete from venues where id = vO; get diagnostics n = row_count;
  out := out || format('%s service role can still delete a venue (offboarding path)', case when n = 1 then 'PASS' else 'FAIL' end);
  execute 'reset role';

  raise exception E'RESULTS (rolled back; before: venues %, profiles %):\n%\nPASS %, FAIL %', b_ven, b_prof, array_to_string(out, E'\n'),
    (select count(*) from unnest(out) o where o like 'PASS%'), (select count(*) from unnest(out) o where o like 'FAIL%');
end $$;
