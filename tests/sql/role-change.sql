-- Role change rules (20261005060000): who may change an existing person's job role, the last owner rule and the change log.
-- Rolled back, throwaway venues and logins. Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); vO uuid := gen_random_uuid();
  a_own uuid := gen_random_uuid(); a_own2 uuid := gen_random_uuid(); a_mgr uuid := gen_random_uuid(); a_dm uuid := gen_random_uuid();
  a_fl uuid := gen_random_uuid(); a_new uuid := gen_random_uuid(); a_oth uuid := gen_random_uuid();
  r_fl uuid; r_fl2 uuid; r_dm uuid; r_hc uuid; r_oth uuid;
  s_own uuid; s_own2 uuid; s_mgr uuid; s_dm uuid; s_fl uuid; s_col uuid; s_auth2 uuid; s_new uuid; s_oth uuid;
  out text[] := '{}'; ok boolean; n int; pass int; fail int; rid uuid;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  execute $q$ create function pg_temp.imp(a uuid) returns void language plpgsql as
    $f$ begin perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated'; end $f$ $q$;

  insert into venues(id,name,slug) values (vT,'RoleC','rc-'||substr(vT::text,1,8)),(vO,'RoleCO','rc-'||substr(vO::text,1,8));
  insert into auth.users(id,aud,role,email) values
    (a_own,'authenticated','authenticated','o'||a_own||'@t.test'),(a_own2,'authenticated','authenticated','p'||a_own2||'@t.test'),
    (a_mgr,'authenticated','authenticated','m'||a_mgr||'@t.test'),(a_dm,'authenticated','authenticated','d'||a_dm||'@t.test'),
    (a_fl,'authenticated','authenticated','f'||a_fl||'@t.test'),(a_new,'authenticated','authenticated','n'||a_new||'@t.test'),
    (a_oth,'authenticated','authenticated','x'||a_oth||'@t.test');
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Waiter','FOH','frontline') returning id into r_fl;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Runner','FOH','frontline') returning id into r_fl2;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Duty Manager','FOH','authorized') returning id into r_dm;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Head Chef','BOH','authorized') returning id into r_hc;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vO,'Other Role','FOH','frontline') returning id into r_oth;
  insert into app_users(auth_id,venue_id,role,name) values (a_own,vT,'owner','Olive') returning id into s_own;
  insert into app_users(auth_id,venue_id,role,name) values (a_own2,vT,'owner','Otto') returning id into s_own2;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_mgr,vT,'manager','Mo',r_fl) returning id into s_mgr;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_dm,vT,'staff','Dave',r_dm) returning id into s_dm;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_fl,vT,'staff','Flo',r_fl) returning id into s_fl;
  insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Col',r_fl) returning id into s_col;
  insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Auth Two',r_hc) returning id into s_auth2;
  insert into app_users(auth_id,venue_id,role,name) values (a_new,vT,'staff','Nia') returning id into s_new;
  insert into app_users(auth_id,venue_id,role,name) values (a_oth,vO,'owner','Other Owner') returning id into s_oth;

  -- owner
  perform pg_temp.imp(a_own);
  begin update app_users set staff_role_id = r_fl2 where id = s_col; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('owner moves a person between frontline roles', ok and n = 1 and (select staff_role_id from app_users where id = s_col) = r_fl2);
  perform pg_temp.imp(a_own);
  begin update app_users set staff_role_id = r_dm where id = s_col; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('owner gives a person an Authorized role', ok and n = 1 and (select staff_role_id from app_users where id = s_col) = r_dm);
  perform pg_temp.imp(a_own);
  begin update app_users set staff_role_id = r_fl where id = s_col; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('owner removes an Authorized role (moves the person to frontline)', ok and n = 1 and (select staff_role_id from app_users where id = s_col) = r_fl);
  perform pg_temp.imp(a_own);
  begin update app_users set staff_role_id = r_oth where id = s_col; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('owner cannot use a role of another venue', not ok and (select staff_role_id from app_users where id = s_col) = r_fl);

  -- manager (app role) and Authorized tier staff
  perform pg_temp.imp(a_mgr);
  begin update app_users set staff_role_id = r_fl2 where id = s_col; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('manager moves a person between frontline roles', ok and n = 1 and (select staff_role_id from app_users where id = s_col) = r_fl2);
  perform pg_temp.imp(a_mgr);
  begin update app_users set staff_role_id = r_dm where id = s_col; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('manager cannot give anyone an Authorized role', not ok and (select staff_role_id from app_users where id = s_col) = r_fl2);
  perform pg_temp.imp(a_mgr);
  begin update app_users set staff_role_id = r_fl where id = s_auth2; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('manager cannot remove an Authorized role from someone', not ok and (select staff_role_id from app_users where id = s_auth2) = r_hc);
  perform pg_temp.imp(a_dm);
  begin update app_users set staff_role_id = r_hc where id = s_col; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('an Authorized tier staff member (staff app role) cannot give anyone an Authorized role', (select staff_role_id from app_users where id = s_col) = r_fl2);
  perform pg_temp.imp(a_dm);
  begin update app_users set staff_role_id = r_fl where id = s_col; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('an Authorized tier staff member cannot change anyone role at all (the owner and managers only)', (select staff_role_id from app_users where id = s_col) = r_fl2);
  perform pg_temp.imp(a_mgr);
  begin update app_users set staff_role_id = r_fl where id = s_own; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('manager cannot change an owner', not ok and (select staff_role_id from app_users where id = s_own) is null);

  -- creating a person with a role (invites)
  perform pg_temp.imp(a_mgr);
  begin insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Invited Auth',r_dm); ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('a manager cannot create a person with an Authorized role', not ok and not exists (select 1 from app_users where name = 'Invited Auth'));
  perform pg_temp.imp(a_dm);
  begin insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Invited Auth',r_dm); ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('an Authorized tier staff member cannot create a person with an Authorized role', not ok);
  perform pg_temp.imp(a_mgr);
  begin insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Invited Front',r_fl); ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('a manager can create a person with a frontline role', ok and exists (select 1 from app_users where name = 'Invited Front'));
  perform pg_temp.imp(a_own);
  begin insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Invited Auth Owner',r_dm); ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('the owner can create a person with an Authorized role', ok and exists (select 1 from app_users where name = 'Invited Auth Owner'));

  -- nobody changes their own role
  perform pg_temp.imp(a_fl);
  begin update app_users set staff_role_id = r_fl2 where id = s_fl; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('a frontline person cannot change their own role', not ok and (select staff_role_id from app_users where id = s_fl) = r_fl);
  perform pg_temp.imp(a_mgr);
  begin update app_users set staff_role_id = r_fl2 where id = s_mgr; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('a manager cannot change their own role', not ok and (select staff_role_id from app_users where id = s_mgr) = r_fl);
  perform pg_temp.imp(a_dm);
  begin update app_users set staff_role_id = r_hc where id = s_dm; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('an Authorized tier staff member cannot change their own role', not ok and (select staff_role_id from app_users where id = s_dm) = r_dm);
  perform pg_temp.imp(a_new);
  begin update app_users set staff_role_id = r_dm where id = s_new; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('a new hire cannot pick an Authorized role', not ok and (select staff_role_id from app_users where id = s_new) is null);
  perform pg_temp.imp(a_new);
  begin update app_users set staff_role_id = r_fl where id = s_new; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('a new hire can still pick a frontline role on the welcome screen', ok and n = 1 and (select staff_role_id from app_users where id = s_new) = r_fl);
  perform pg_temp.imp(a_new);
  begin update app_users set staff_role_id = r_fl2 where id = s_new; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('and then cannot change it', not ok and (select staff_role_id from app_users where id = s_new) = r_fl);

  -- last owner
  perform pg_temp.imp(a_own2);
  begin update app_users set deactivated_at = now() where id = s_own; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('an owner can deactivate another owner while one active owner remains', ok and n = 1);
  perform pg_temp.imp(a_own2);
  begin update app_users set deactivated_at = now() where id = s_own2; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('the last active owner cannot deactivate themselves', not ok and (select deactivated_at from app_users where id = s_own2) is null);
  perform pg_temp.imp(a_own2);
  begin update app_users set role = 'manager' where id = s_own2; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('the last active owner cannot be demoted', not ok and (select role from app_users where id = s_own2) = 'owner');
  perform pg_temp.imp(a_mgr);
  begin update app_users set deactivated_at = now() where id = s_own2; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('a manager cannot deactivate the last owner', not ok and (select deactivated_at from app_users where id = s_own2) is null);

  -- other venue and service role
  perform pg_temp.imp(a_oth);
  begin update app_users set staff_role_id = r_fl2 where id = s_col; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('the owner of another venue cannot change this venue roles', (select staff_role_id from app_users where id = s_col) = r_fl2);
  execute 'set local role service_role';
  begin update app_users set staff_role_id = r_hc where id = s_col; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('the service role can still set any role (server paths)', ok and (select staff_role_id from app_users where id = s_col) = r_hc);

  -- change log
  select count(*) into n from staff_role_changes where venue_id = vT and staff_user_id = s_col;
  out := out || pg_temp.chk('every role change of a person is logged (' || n || ' rows for one person)', n >= 5);
  out := out || pg_temp.chk('the log names who changed it and the old and new role and tier', exists (
    select 1 from staff_role_changes c where c.staff_user_id = s_col and c.changed_by = s_own and c.old_role_name = 'Runner' and c.new_role_name = 'Duty Manager' and c.old_tier = 'frontline' and c.new_tier = 'authorized'));
  out := out || pg_temp.chk('a self pick on the welcome screen is logged with the person as actor', exists (select 1 from staff_role_changes c where c.staff_user_id = s_new and c.changed_by = s_new and c.new_role_name = 'Waiter'));
  out := out || pg_temp.chk('refused changes are not logged', not exists (select 1 from staff_role_changes c where c.staff_user_id = s_fl));
  perform pg_temp.imp(a_own);
  select count(*) into n from staff_role_changes where venue_id = vT; execute 'reset role';
  out := out || pg_temp.chk('the owner reads the log of their venue', n > 0);
  perform pg_temp.imp(a_fl);
  select count(*) into n from staff_role_changes where venue_id = vT; execute 'reset role';
  out := out || pg_temp.chk('a frontline person cannot read the log', n = 0);
  perform pg_temp.imp(a_oth);
  select count(*) into n from staff_role_changes where venue_id = vT; execute 'reset role';
  out := out || pg_temp.chk('another venue cannot read the log', n = 0);
  select id into rid from staff_role_changes where venue_id = vT limit 1;
  perform pg_temp.imp(a_own);
  begin insert into staff_role_changes(venue_id, staff_user_id) values (vT, s_col); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('nobody can insert into the log through the API', not ok);
  perform pg_temp.imp(a_own);
  begin update staff_role_changes set new_role_name = 'x' where id = rid; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('nobody can update the log', not ok);
  perform pg_temp.imp(a_own);
  begin delete from staff_role_changes where id = rid; ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('nobody can delete from the log', not ok);
  out := out || pg_temp.chk('anon has no privileges on the log', not has_table_privilege('anon','staff_role_changes','SELECT') and not has_table_privilege('authenticated','staff_role_changes','INSERT') and not has_table_privilege('authenticated','staff_role_changes','TRUNCATE'));

  begin delete from venues where id in (vT, vO); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('cleanup cascade works (log included)', ok);
  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
