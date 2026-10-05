-- Certificate file read scope (20261005030000). Rolled back, throwaway venues and logins. Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); vO uuid := gen_random_uuid();
  a_own uuid := gen_random_uuid(); a_mgr uuid := gen_random_uuid(); a_auth uuid := gen_random_uuid();
  a_up uuid := gen_random_uuid(); a_col uuid := gen_random_uuid(); a_oth uuid := gen_random_uuid();
  r_fl uuid; r_dm uuid; s_up uuid; s_col uuid;
  out text[] := '{}'; n int; ok boolean; pass int; fail int; p text;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  execute $q$ create function pg_temp.imp(a uuid) returns void language plpgsql as
    $f$ begin perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true); execute 'set local role authenticated'; end $f$ $q$;
  insert into venues(id,name,slug) values (vT,'CertS','cs-'||substr(vT::text,1,8)),(vO,'CertSO','cs-'||substr(vO::text,1,8));
  insert into auth.users(id,aud,role,email) values
    (a_own,'authenticated','authenticated','o'||a_own||'@t.test'),(a_mgr,'authenticated','authenticated','m'||a_mgr||'@t.test'),
    (a_auth,'authenticated','authenticated','a'||a_auth||'@t.test'),(a_up,'authenticated','authenticated','u'||a_up||'@t.test'),
    (a_col,'authenticated','authenticated','c'||a_col||'@t.test'),(a_oth,'authenticated','authenticated','x'||a_oth||'@t.test');
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Waiter','FOH','frontline') returning id into r_fl;
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Duty Manager','FOH','authorized') returning id into r_dm;
  insert into app_users(auth_id,venue_id,role,name) values (a_own,vT,'owner','Olive');
  insert into app_users(auth_id,venue_id,role,name) values (a_mgr,vT,'manager','Mo');
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_auth,vT,'staff','Dave',r_dm);
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_up,vT,'staff','Uploader',r_fl) returning id into s_up;
  insert into app_users(auth_id,venue_id,role,name,staff_role_id) values (a_col,vT,'staff','Colleague',r_fl) returning id into s_col;
  insert into app_users(auth_id,venue_id,role,name) values (a_oth,vO,'owner','Other Owner');
  p := vT || '/' || s_up || '/' || gen_random_uuid() || '/1-cert.png';
  insert into storage.objects(bucket_id,name,owner_id) values ('certs', p, a_up::text);

  perform pg_temp.imp(a_up);   select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('the uploader reads their own file', n = 1);
  perform pg_temp.imp(a_own);  select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('the owner reads it', n = 1);
  perform pg_temp.imp(a_mgr);  select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('a manager (app role) reads it', n = 1);
  perform pg_temp.imp(a_auth); select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('an authorized tier staff member reads it', n = 1);
  perform pg_temp.imp(a_col);  select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('a frontline colleague is denied', n = 0);
  perform pg_temp.imp(a_col);  select count(*) into n from storage.objects where bucket_id='certs' and name like vT::text||'/%'; execute 'reset role';
  out := out || pg_temp.chk('a frontline colleague sees no certificate file of the venue by scan', n = 0);
  perform pg_temp.imp(a_oth);  select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('the owner of another venue is denied', n = 0);
  execute 'set local role anon';
  select count(*) into n from storage.objects where bucket_id='certs' and name=p; execute 'reset role';
  out := out || pg_temp.chk('anon is denied', n = 0);

  perform pg_temp.imp(a_col);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', vT||'/'||s_col||'/'||gen_random_uuid()||'/2-cert.png', a_col::text); ok := true; exception when others then ok := false; end;
  select count(*) into n from storage.objects where bucket_id='certs' and name like vT::text||'/'||s_col::text||'/%'; execute 'reset role';
  out := out || pg_temp.chk('a colleague can still upload into their own folder and read it back', ok and n = 1);
  perform pg_temp.imp(a_col);
  begin insert into storage.objects(bucket_id,name,owner_id) values ('certs', vO||'/'||s_col||'/'||gen_random_uuid()||'/3-cert.png', a_col::text); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('uploading into another venue folder is still refused', not ok);
  perform pg_temp.imp(a_own); select count(*) into n from storage.objects where bucket_id='certs' and name like vT::text||'/%'; execute 'reset role';
  out := out || pg_temp.chk('the owner sees both files of the venue', n = 2);
  perform pg_temp.imp(a_up);
  begin delete from storage.objects where bucket_id='certs' and name=p; get diagnostics n = row_count; exception when others then n := 0; end;
  execute 'reset role';
  out := out || pg_temp.chk('the uploader still cannot delete the object (no client delete policy)', n = 0);
  out := out || pg_temp.chk('the old venue wide read policy for certs is gone', not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='certs_venue_isolation_select'));

  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
