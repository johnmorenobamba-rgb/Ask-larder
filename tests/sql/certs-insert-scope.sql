-- Certificate folder writes (20261005120000): a member writes only into their own folder. Rolled back, throwaway venues and logins.
-- Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); vO uuid := gen_random_uuid();
  a_own uuid := gen_random_uuid(); a_mgr uuid := gen_random_uuid(); a_up uuid := gen_random_uuid();
  a_col uuid := gen_random_uuid(); a_oth uuid := gen_random_uuid();
  r_fl uuid; s_own uuid; s_mgr uuid; s_up uuid; s_col uuid; s_oth uuid;
  out text[] := '{}'; n int; ok boolean; pass int; fail int; p text;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  execute $q$ create function pg_temp.imp(a uuid) returns void language plpgsql as
    $f$ begin perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated'; end $f$ $q$;
  insert into venues(id,name,slug) values (vT,'CertI','ci-'||substr(vT::text,1,8)),(vO,'CertIO','ci-'||substr(vO::text,1,8));
  insert into auth.users(id,aud,role,email) values
    (a_own,'authenticated','authenticated','o'||a_own||'@t.test'),(a_mgr,'authenticated','authenticated','m'||a_mgr||'@t.test'),
    (a_up,'authenticated','authenticated','u'||a_up||'@t.test'),(a_col,'authenticated','authenticated','c'||a_col||'@t.test'),
    (a_oth,'authenticated','authenticated','x'||a_oth||'@t.test');
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Waiter','FOH','frontline') returning id into r_fl;
  insert into app_users(auth_id,venue_id,role,name) values (a_own,vT,'owner','Olive') returning id into s_own;
  insert into app_users(auth_id,venue_id,role,name) values (a_mgr,vT,'manager','Mo') returning id into s_mgr;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_up,vT,'staff','Uploader',r_fl) returning id into s_up;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_col,vT,'staff','Colleague',r_fl) returning id into s_col;
  insert into app_users(auth_id,venue_id,role,name) values (a_oth,vO,'owner','Other Owner') returning id into s_oth;

  -- own folder allowed (the exact path shape the app uses)
  p := vT || '/' || s_up || '/' || gen_random_uuid() || '/1700000000000-cert.png';
  perform pg_temp.imp(a_up);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', p, a_up::text); ok := true; exception when others then ok := false; end;
  select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('a frontline member can write into their own folder and read it back', ok and n = 1);

  -- colleague folder denied
  perform pg_temp.imp(a_up);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', vT||'/'||s_col||'/'||gen_random_uuid()||'/1-cert.png', a_up::text); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('a frontline member cannot write into a colleague folder', not ok);
  perform pg_temp.imp(a_own);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', vT||'/'||s_col||'/'||gen_random_uuid()||'/2-cert.png', a_own::text); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('the owner cannot write into a colleague folder either', not ok);
  perform pg_temp.imp(a_mgr);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', vT||'/'||s_up||'/'||gen_random_uuid()||'/3-cert.png', a_mgr::text); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('a manager cannot write into a colleague folder', not ok);

  -- owner and manager into their own folders
  perform pg_temp.imp(a_own);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', vT||'/'||s_own||'/'||gen_random_uuid()||'/4-cert.png', a_own::text); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('the owner can write into their own folder', ok);
  perform pg_temp.imp(a_mgr);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', vT||'/'||s_mgr||'/'||gen_random_uuid()||'/5-cert.png', a_mgr::text); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('a manager can write into their own folder', ok);

  -- other venue, bad shapes, anon
  perform pg_temp.imp(a_up);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', vO||'/'||s_up||'/'||gen_random_uuid()||'/6-cert.png', a_up::text); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('writing under another venue is refused', not ok);
  perform pg_temp.imp(a_up);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', vT||'/stray.png', a_up::text); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('a file directly under the venue folder (no person folder) is refused', not ok);
  perform pg_temp.imp(a_up);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', 'stray.png', a_up::text); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('a file at the bucket root is refused', not ok);
  perform pg_temp.imp(a_oth);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', vT||'/'||s_oth||'/'||gen_random_uuid()||'/7-cert.png', a_oth::text); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('an owner of another venue cannot write here', not ok);
  execute 'set local role anon';
  begin insert into storage.objects(bucket_id,name) values ('certs', vT||'/'||s_up||'/'||gen_random_uuid()||'/8-cert.png'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('anon cannot write', not ok);

  -- read paths unchanged
  perform pg_temp.imp(a_up);   select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('the uploader still reads their own file', n = 1);
  perform pg_temp.imp(a_own);  select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('the owner still reads it', n = 1);
  perform pg_temp.imp(a_mgr);  select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('a manager still reads it', n = 1);
  perform pg_temp.imp(a_col);  select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('a frontline colleague still cannot read it', n = 0);
  perform pg_temp.imp(a_oth);  select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('another venue still cannot read it', n = 0);
  perform pg_temp.imp(a_up);
  begin delete from storage.objects where bucket_id='certs' and name=p; get diagnostics n = row_count; exception when others then n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('still no client delete', n = 0);
  perform pg_temp.imp(a_up);
  begin update storage.objects set name = name || 'x' where bucket_id='certs' and name=p; get diagnostics n = row_count; exception when others then n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('still no client rename or update', n = 0);
  out := out || pg_temp.chk('the old venue wide insert policy is gone', not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='certs_venue_isolation_insert'));

  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
