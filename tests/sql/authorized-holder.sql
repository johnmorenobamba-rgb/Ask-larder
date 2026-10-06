-- Authorized role holders (20261005100000): only the owner deactivates, reactivates or deletes someone who holds an Authorized
-- role (or is a manager or owner); the manager tier handles Frontline people; the access change log. Rolled back, throwaway
-- venues and logins. Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); vO uuid := gen_random_uuid();
  a_own uuid := gen_random_uuid(); a_own2 uuid := gen_random_uuid(); a_mgr uuid := gen_random_uuid(); a_mgr2 uuid := gen_random_uuid();
  a_dm uuid := gen_random_uuid(); a_fl uuid := gen_random_uuid(); a_oth uuid := gen_random_uuid();
  r_fl uuid; r_dm uuid; r_hc uuid;
  s_own uuid; s_own2 uuid; s_mgr uuid; s_mgr2 uuid; s_dm uuid; s_fl uuid; s_col uuid; s_col2 uuid; s_auth uuid; s_auth2 uuid; s_oth uuid;
  out text[] := '{}'; ok boolean; n int; pass int; fail int; rid uuid;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  execute $q$ create function pg_temp.imp(a uuid) returns void language plpgsql as
    $f$ begin perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated'; end $f$ $q$;

  insert into venues(id,name,slug) values (vT,'AuthH','ah-'||substr(vT::text,1,8)),(vO,'AuthHO','ah-'||substr(vO::text,1,8));
  insert into auth.users(id,aud,role,email) values
    (a_own,'authenticated','authenticated','o'||a_own||'@t.test'),(a_own2,'authenticated','authenticated','p'||a_own2||'@t.test'),
    (a_mgr,'authenticated','authenticated','m'||a_mgr||'@t.test'),(a_mgr2,'authenticated','authenticated','q'||a_mgr2||'@t.test'),
    (a_dm,'authenticated','authenticated','d'||a_dm||'@t.test'),(a_fl,'authenticated','authenticated','f'||a_fl||'@t.test'),
    (a_oth,'authenticated','authenticated','x'||a_oth||'@t.test');
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Waiter','FOH','frontline') returning id into r_fl;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Duty Manager','FOH','authorized') returning id into r_dm;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Head Chef','BOH','authorized') returning id into r_hc;
  insert into app_users(auth_id,venue_id,role,name) values (a_own,vT,'owner','Olive') returning id into s_own;
  insert into app_users(auth_id,venue_id,role,name) values (a_own2,vT,'owner','Otto') returning id into s_own2;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_mgr,vT,'manager','Mo',r_fl) returning id into s_mgr;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_mgr2,vT,'manager','Mia',r_fl) returning id into s_mgr2;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_dm,vT,'staff','Dave',r_dm) returning id into s_dm;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_fl,vT,'staff','Flo',r_fl) returning id into s_fl;
  insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Col',r_fl) returning id into s_col;
  insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Col Two',r_fl) returning id into s_col2;
  insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Auth One',r_hc) returning id into s_auth;
  insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Auth Two',r_hc) returning id into s_auth2;
  insert into app_users(auth_id,venue_id,role,name) values (a_oth,vO,'owner','Other Owner') returning id into s_oth;

  -- manager: Frontline people yes
  perform pg_temp.imp(a_mgr);
  begin update app_users set deactivated_at = now() where id = s_col; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('manager deactivates a Frontline person', ok and n = 1 and (select deactivated_at from app_users where id = s_col) is not null);
  perform pg_temp.imp(a_mgr);
  begin update app_users set deactivated_at = null where id = s_col; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('manager reactivates a Frontline person', ok and n = 1 and (select deactivated_at from app_users where id = s_col) is null);
  perform pg_temp.imp(a_mgr);
  begin delete from app_users where id = s_col2; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('manager deletes a Frontline person', ok and n = 1 and not exists (select 1 from app_users where id = s_col2));

  -- manager: Authorized holders no
  perform pg_temp.imp(a_mgr);
  begin update app_users set deactivated_at = now() where id = s_auth; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('manager cannot deactivate an Authorized role holder', not ok and (select deactivated_at from app_users where id = s_auth) is null);
  perform pg_temp.imp(a_mgr);
  begin delete from app_users where id = s_auth; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('manager cannot delete an Authorized role holder', not ok and exists (select 1 from app_users where id = s_auth));
  perform pg_temp.imp(a_mgr);
  begin update app_users set deactivated_at = now() where id = s_mgr2; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('manager cannot deactivate another manager', not ok and (select deactivated_at from app_users where id = s_mgr2) is null);
  perform pg_temp.imp(a_mgr);
  begin delete from app_users where id = s_mgr2; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('manager cannot delete another manager', not ok and exists (select 1 from app_users where id = s_mgr2));
  perform pg_temp.imp(a_mgr);
  begin update app_users set deactivated_at = now() where id = s_own2; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('manager cannot deactivate an owner', not ok and (select deactivated_at from app_users where id = s_own2) is null);
  perform pg_temp.imp(a_mgr);
  begin delete from app_users where id = s_own2; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('manager cannot delete an owner', not ok and exists (select 1 from app_users where id = s_own2));
  perform pg_temp.imp(a_mgr);
  begin update app_users set staff_role_id = r_fl where id = s_auth; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('manager cannot demote an Authorized role holder', not ok and (select staff_role_id from app_users where id = s_auth) = r_hc);

  -- Authorized tier staff (staff app role): the table policies already stop them; stays denied
  perform pg_temp.imp(a_dm);
  begin update app_users set deactivated_at = now() where id = s_auth2; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('an Authorized tier staff member cannot deactivate an Authorized role holder', (select deactivated_at from app_users where id = s_auth2) is null);
  perform pg_temp.imp(a_dm);
  begin delete from app_users where id = s_auth2; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('an Authorized tier staff member cannot delete an Authorized role holder', exists (select 1 from app_users where id = s_auth2));

  -- frontline: nothing
  perform pg_temp.imp(a_fl);
  begin update app_users set deactivated_at = now() where id = s_col; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('a Frontline person cannot deactivate anyone', (select deactivated_at from app_users where id = s_col) is null);

  -- owner: everyone
  perform pg_temp.imp(a_own);
  begin update app_users set deactivated_at = now() where id = s_auth; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('owner deactivates an Authorized role holder', ok and n = 1 and (select deactivated_at from app_users where id = s_auth) is not null);
  perform pg_temp.imp(a_mgr);
  begin update app_users set deactivated_at = null where id = s_auth; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('manager cannot reactivate an Authorized role holder', not ok and (select deactivated_at from app_users where id = s_auth) is not null);
  perform pg_temp.imp(a_own);
  begin update app_users set deactivated_at = null where id = s_auth; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('owner reactivates an Authorized role holder', ok and n = 1 and (select deactivated_at from app_users where id = s_auth) is null);
  perform pg_temp.imp(a_own);
  begin update app_users set deactivated_at = now() where id = s_mgr2; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('owner deactivates a manager', ok and n = 1);
  perform pg_temp.imp(a_own);
  begin update app_users set deactivated_at = now() where id = s_own2; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('owner deactivates another owner while one remains', ok and n = 1);
  perform pg_temp.imp(a_own);
  begin update app_users set deactivated_at = null where id = s_own2; ok := true; exception when others then ok := false; end; execute 'reset role';
  perform pg_temp.imp(a_own);
  begin delete from app_users where id = s_auth2; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('owner deletes an Authorized role holder', ok and n = 1 and not exists (select 1 from app_users where id = s_auth2));
  perform pg_temp.imp(a_own);
  begin update app_users set staff_role_id = r_fl where id = s_auth; get diagnostics n = row_count; ok := true; exception when others then ok := false; n := 0; end; execute 'reset role';
  out := out || pg_temp.chk('owner demotes an Authorized role holder', ok and n = 1 and (select staff_role_id from app_users where id = s_auth) = r_fl);

  -- last owner still protected
  update app_users set deactivated_at = now() where id = s_own2; -- server path, leaves Olive as the only active owner
  perform pg_temp.imp(a_own);
  begin update app_users set deactivated_at = now() where id = s_own; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('the last active owner still cannot be deactivated', not ok and (select deactivated_at from app_users where id = s_own) is null);
  update app_users set deactivated_at = null where id = s_own2;

  -- other venue
  perform pg_temp.imp(a_oth);
  begin update app_users set deactivated_at = now() where id = s_dm; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('an owner of another venue cannot deactivate anyone here', (select deactivated_at from app_users where id = s_dm) is null);

  -- server path unchanged
  begin update app_users set deactivated_at = now() where id = s_dm; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('the server (no client role) can still deactivate an Authorized role holder', ok and (select deactivated_at from app_users where id = s_dm) is not null);
  update app_users set deactivated_at = null where id = s_dm;

  -- the log
  select count(*) into n from staff_access_changes where venue_id = vT;
  out := out || pg_temp.chk('every deactivation and reactivation was logged', n >= 9);
  out := out || pg_temp.chk('the log keeps the action, the role and the tier at the time',
    exists (select 1 from staff_access_changes where staff_user_id = s_auth and action = 'deactivated' and role_name = 'Head Chef' and tier = 'authorized' and changed_by = s_own)
    and exists (select 1 from staff_access_changes where staff_user_id = s_mgr2 and action = 'deactivated' and tier = 'authorized')
    and exists (select 1 from staff_access_changes where staff_user_id = s_col and action = 'reactivated' and tier = 'frontline' and changed_by = s_mgr));
  out := out || pg_temp.chk('a refused action writes no log row', not exists (select 1 from staff_access_changes where staff_user_id = s_own and action = 'deactivated'));
  perform pg_temp.imp(a_mgr);
  select count(*) into n from staff_access_changes where venue_id = vT; execute 'reset role';
  out := out || pg_temp.chk('the manager tier reads the log of its venue', n >= 9);
  perform pg_temp.imp(a_fl);
  select count(*) into n from staff_access_changes where venue_id = vT; execute 'reset role';
  out := out || pg_temp.chk('a Frontline person cannot read the log', n = 0);
  perform pg_temp.imp(a_oth);
  select count(*) into n from staff_access_changes where venue_id = vT; execute 'reset role';
  out := out || pg_temp.chk('another venue cannot read the log', n = 0);
  select id into rid from staff_access_changes where venue_id = vT limit 1;
  perform pg_temp.imp(a_own);
  begin insert into staff_access_changes(venue_id, staff_user_id, action) values (vT, s_col, 'deactivated'); ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('nobody can insert into the log through the API', not ok);
  perform pg_temp.imp(a_own);
  begin update staff_access_changes set role_name = 'x' where id = rid; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('nobody can update the log', not ok);
  perform pg_temp.imp(a_own);
  begin delete from staff_access_changes where id = rid; ok := true; exception when others then ok := false; end; execute 'reset role';
  out := out || pg_temp.chk('nobody can delete from the log', not ok);
  out := out || pg_temp.chk('anon has no privileges on the log', not has_table_privilege('anon','staff_access_changes','SELECT') and not has_table_privilege('authenticated','staff_access_changes','INSERT') and not has_table_privilege('authenticated','staff_access_changes','TRUNCATE'));

  begin delete from venues where id in (vT, vO); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('cleanup cascade works (log included)', ok);
  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
