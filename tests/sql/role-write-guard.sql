-- Role write guard (20261005000000): who may write staff_roles and app_users role columns. Rolled back, throwaway venues.
-- Run BEFORE the migration to prove the hole (expect FAIL on the escalation cases) and AFTER (expect all PASS, 0 FAIL).
do $$
declare
  vT uuid := gen_random_uuid(); vO uuid := gen_random_uuid();
  a_own uuid := gen_random_uuid(); a_mgr uuid := gen_random_uuid(); a_auth uuid := gen_random_uuid(); a_fl uuid := gen_random_uuid();
  a_new uuid := gen_random_uuid(); a_oth uuid := gen_random_uuid();
  r_fl uuid; r_dm uuid; r_fl2 uuid; r_oth uuid;
  s_own uuid; s_mgr uuid; s_auth uuid; s_fl uuid; s_fl2 uuid; s_new uuid; s_oth uuid;
  out text[] := '{}'; ok boolean; n int; t text; v text; b boolean; pass int; fail int; new_role uuid;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  execute $q$ create function pg_temp.imp(a uuid) returns void language plpgsql as
    $f$ begin perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated'; end $f$ $q$;

  insert into venues(id,name,slug) values (vT,'RoleG test','rg-'||substr(vT::text,1,8)), (vO,'RoleG other','rg-'||substr(vO::text,1,8));
  insert into auth.users(id,aud,role,email) values
    (a_own,'authenticated','authenticated','o'||a_own||'@t.test'),(a_mgr,'authenticated','authenticated','m'||a_mgr||'@t.test'),
    (a_auth,'authenticated','authenticated','a'||a_auth||'@t.test'),(a_fl,'authenticated','authenticated','f'||a_fl||'@t.test'),
    (a_new,'authenticated','authenticated','n'||a_new||'@t.test'),(a_oth,'authenticated','authenticated','x'||a_oth||'@t.test');
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Waiter','FOH','frontline') returning id into r_fl;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Duty Manager','FOH','authorized') returning id into r_dm;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Runner','FOH','frontline') returning id into r_fl2;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vO,'Other Role','FOH','frontline') returning id into r_oth;
  insert into app_users(auth_id,venue_id,role,name) values (a_own,vT,'owner','Olive Owner') returning id into s_own;
  insert into app_users(auth_id,venue_id,role,name) values (a_mgr,vT,'manager','Mo Manager') returning id into s_mgr;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_auth,vT,'staff','Dave Duty',r_dm) returning id into s_auth;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_fl,vT,'staff','Flo Floor',r_fl) returning id into s_fl;
  insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Col League',r_fl) returning id into s_fl2;
  insert into app_users(auth_id,venue_id,role,name) values (a_new,vT,'staff','Nia Newhire') returning id into s_new;
  insert into app_users(auth_id,venue_id,role,name) values (a_oth,vO,'manager','Other Mgr') returning id into s_oth;

  -- ===== frontline: the escalation attempts
  perform pg_temp.imp(a_fl);
  begin update app_users set role = 'owner' where id = s_fl; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  select role into v from app_users where id = s_fl;
  out := out || pg_temp.chk('frontline cannot set their own role to owner', v = 'staff');

  perform pg_temp.imp(a_fl);
  begin update app_users set staff_role_id = r_dm where id = s_fl; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('frontline cannot give themselves the Duty Manager role', (select staff_role_id from app_users where id = s_fl) = r_fl);

  perform pg_temp.imp(a_fl);
  begin update app_users set venue_id = vO where id = s_fl; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('frontline cannot move themselves to another venue', (select venue_id from app_users where id = s_fl) = vT);

  perform pg_temp.imp(a_fl);
  begin update app_users set pin_hash = 'x', pin_failed_attempts = 0 where id = s_fl; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('frontline cannot write PIN fields', (select pin_hash from app_users where id = s_fl) is null);

  perform pg_temp.imp(a_fl);
  begin update app_users set name = 'Flo Renamed' where id = s_fl; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('frontline can still update their own name', ok and n = 1);

  perform pg_temp.imp(a_fl);
  begin update app_users set staff_role_id = r_dm where id = s_fl2; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('frontline cannot change a colleague''s role', (select staff_role_id from app_users where id = s_fl2) = r_fl);

  perform pg_temp.imp(a_fl);
  begin update staff_roles set fallback_tier = 'authorized' where id = r_fl; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('frontline cannot promote a role to authorized', (select fallback_tier from staff_roles where id = r_fl) = 'frontline');

  perform pg_temp.imp(a_fl);
  begin update staff_roles set department = 'BOH' where id = r_fl; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('frontline cannot change a role department', (select department from staff_roles where id = r_fl) = 'FOH');

  perform pg_temp.imp(a_fl);
  begin insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Sneaky','FOH','authorized'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('frontline cannot insert a role', not exists (select 1 from staff_roles where venue_id = vT and name = 'Sneaky'));

  perform pg_temp.imp(a_fl);
  begin delete from staff_roles where id = r_fl2; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('frontline cannot delete a role', exists (select 1 from staff_roles where id = r_fl2));

  select (au.role in ('owner','manager') or coalesce(sr.fallback_tier,'frontline') = 'authorized') into b from app_users au left join staff_roles sr on sr.id = au.staff_role_id where au.id = s_fl; -- same rule as private.auth_is_manager_tier()
  out := out || pg_temp.chk('after all the attempts frontline is still not manager tier', not b);

  -- ===== new hire (no role yet)
  perform pg_temp.imp(a_new);
  begin update app_users set staff_role_id = r_dm where id = s_new; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('new hire cannot pick a manager tier role', (select staff_role_id from app_users where id = s_new) is null);
  perform pg_temp.imp(a_new);
  begin update app_users set staff_role_id = r_oth where id = s_new; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('new hire cannot pick a role of another venue', (select staff_role_id from app_users where id = s_new) is null);
  perform pg_temp.imp(a_new);
  begin update app_users set staff_role_id = r_fl where id = s_new; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('new hire can pick a frontline role (welcome screen)', ok and n = 1 and (select staff_role_id from app_users where id = s_new) = r_fl);
  perform pg_temp.imp(a_new);
  begin update app_users set staff_role_id = r_fl2 where id = s_new; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('and cannot then change it themselves', (select staff_role_id from app_users where id = s_new) = r_fl);

  -- ===== manager (app role manager)
  perform pg_temp.imp(a_mgr);
  begin update staff_roles set department = 'BOH' where id = r_fl2; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager can change a role department', ok and n = 1 and (select department from staff_roles where id = r_fl2) = 'BOH');
  perform pg_temp.imp(a_mgr);
  begin insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'New Frontline','FOH','frontline'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager can add a frontline role', exists (select 1 from staff_roles where venue_id = vT and name = 'New Frontline'));
  perform pg_temp.imp(a_mgr);
  begin insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'New Boss','FOH','authorized'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager cannot add an authorized role (owner only)', not exists (select 1 from staff_roles where venue_id = vT and name = 'New Boss'));
  perform pg_temp.imp(a_mgr);
  begin update staff_roles set fallback_tier = 'authorized' where id = r_fl2; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager cannot change a role tier (owner only)', (select fallback_tier from staff_roles where id = r_fl2) = 'frontline');
  perform pg_temp.imp(a_mgr);
  begin update app_users set staff_role_id = r_dm where id = s_fl2; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager cannot give a colleague an Authorized role (owner only, 20261005060000)', (select staff_role_id from app_users where id = s_fl2) = r_fl);
  perform pg_temp.imp(a_mgr);
  begin update app_users set role = 'owner' where id = s_fl2; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager cannot make anyone an owner', (select role from app_users where id = s_fl2) = 'staff');
  perform pg_temp.imp(a_mgr);
  begin insert into app_users(venue_id,role,name) values (vT,'owner','Sneaky Owner'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager cannot insert an owner', not exists (select 1 from app_users where name = 'Sneaky Owner'));
  perform pg_temp.imp(a_mgr);
  begin insert into app_users(venue_id,role,name) values (vT,'staff','Invited Person'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager can invite a staff row', exists (select 1 from app_users where name = 'Invited Person'));
  perform pg_temp.imp(a_mgr);
  begin update app_users set staff_role_id = r_oth where name = 'Invited Person'; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager cannot assign a role of another venue', (select staff_role_id from app_users where name = 'Invited Person') is null);
  perform pg_temp.imp(a_mgr);
  begin update app_users set deactivated_at = now() where id = s_new; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager can deactivate staff', ok and n = 1);
  perform pg_temp.imp(a_mgr);
  begin update app_users set name = 'Hijacked Owner' where id = s_own; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager cannot edit the owner row', (select name from app_users where id = s_own) = 'Olive Owner');

  -- ===== authorized tier staff (role staff)
  perform pg_temp.imp(a_auth);
  begin insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Auth Added','BOH','frontline'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager tier staff can add a frontline role', exists (select 1 from staff_roles where venue_id = vT and name = 'Auth Added'));
  perform pg_temp.imp(a_auth);
  begin update staff_roles set fallback_tier = 'authorized' where name = 'Auth Added'; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager tier staff cannot change a role tier', (select fallback_tier from staff_roles where name = 'Auth Added') = 'frontline');

  -- ===== owner
  perform pg_temp.imp(a_own);
  begin update staff_roles set fallback_tier = 'authorized' where id = r_fl2; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('owner can change a role tier', ok and n = 1 and (select fallback_tier from staff_roles where id = r_fl2) = 'authorized');
  perform pg_temp.imp(a_own);
  begin insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Owner Made Boss','FOH','authorized'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('owner can add an authorized role', exists (select 1 from staff_roles where venue_id = vT and name = 'Owner Made Boss'));
  perform pg_temp.imp(a_own);
  begin update app_users set role = 'manager' where id = s_fl2; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('owner can change a colleague role', ok and n = 1 and (select role from app_users where id = s_fl2) = 'manager');
  perform pg_temp.imp(a_own);
  begin update app_users set role = 'staff' where id = s_own; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('owner cannot change their own role', (select role from app_users where id = s_own) = 'owner');
  perform pg_temp.imp(a_own);
  begin update app_users set name = 'Olive Owner 2', phone = '0400000000' where id = s_own; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('owner can update their own name and phone (client details)', ok and n = 1);

  -- ===== another venue
  perform pg_temp.imp(a_oth);
  begin update staff_roles set department = 'BOH' where id = r_fl; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager of another venue cannot update this venue roles', (select department from staff_roles where id = r_fl) = 'FOH');
  perform pg_temp.imp(a_oth);
  begin insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Foreign','FOH','frontline'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager of another venue cannot insert a role here', not exists (select 1 from staff_roles where name = 'Foreign'));
  perform pg_temp.imp(a_oth);
  begin update app_users set role = 'owner', deactivated_at = now() where venue_id = vT; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager of another venue cannot touch this venue staff', not exists (select 1 from app_users where venue_id = vT and deactivated_at is not null and name = 'Olive Owner 2'));
  perform pg_temp.imp(a_oth);
  select count(*) into n from staff_roles where venue_id = vT;
  execute 'reset role';
  out := out || pg_temp.chk('manager of another venue cannot read this venue roles', n = 0);
  perform pg_temp.imp(a_fl);
  select count(*) into n from staff_roles where venue_id = vT;
  execute 'reset role';
  out := out || pg_temp.chk('frontline can read their venue roles (role picker, PIN tiers)', n >= 4);

  -- ===== deletes
  perform pg_temp.imp(a_mgr);
  begin delete from app_users where id = s_own; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager cannot delete the owner row', exists (select 1 from app_users where id = s_own));
  perform pg_temp.imp(a_own);
  begin delete from app_users where id = s_own; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('owner cannot delete their own row', exists (select 1 from app_users where id = s_own));
  perform pg_temp.imp(a_fl);
  begin delete from app_users where id = s_fl2; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('frontline cannot delete a colleague', exists (select 1 from app_users where id = s_fl2));
  perform pg_temp.imp(a_mgr);
  begin delete from app_users where name = 'Invited Person'; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager can still delete an invite row (typo correction)', ok and n = 1);
  perform pg_temp.imp(a_oth);
  begin delete from app_users where id = s_fl; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('manager of another venue cannot delete this venue staff', exists (select 1 from app_users where id = s_fl));

  -- ===== service role and anon
  execute 'set local role service_role';
  begin update app_users set role = 'manager', pin_hash = 'x' where id = s_fl2; update staff_roles set fallback_tier = 'authorized' where id = r_fl; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('service role can still write roles, tiers and PIN fields (server paths)', ok);
  execute 'set local role anon';
  begin insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Anon','FOH','authorized'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('anon cannot insert a role', not exists (select 1 from staff_roles where name = 'Anon'));
  execute 'set local role anon';
  begin insert into app_users(venue_id,role,name) values (vT,'owner','Anon Owner'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('anon cannot insert staff', not exists (select 1 from app_users where name = 'Anon Owner'));
  out := out || pg_temp.chk('TRUNCATE, TRIGGER, REFERENCES revoked from anon and authenticated on both tables',
    not has_table_privilege('anon','staff_roles','TRUNCATE') and not has_table_privilege('authenticated','staff_roles','TRUNCATE')
    and not has_table_privilege('anon','app_users','TRUNCATE') and not has_table_privilege('authenticated','app_users','TRUNCATE')
    and not has_table_privilege('authenticated','app_users','TRIGGER') and not has_table_privilege('authenticated','staff_roles','REFERENCES'));

  begin delete from venues where id in (vT, vO); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('cleanup cascade works', ok);
  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
