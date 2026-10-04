-- Anon table grants (20261005050000): read only plus rolled back checks. Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); a_own uuid := gen_random_uuid(); r record; p text; bad int := 0; n int; ok boolean;
  out text[] := '{}'; pass int; fail int; t text; v_slug text;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;

  for r in select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind in ('r','v','m','p') loop
    foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
      if has_table_privilege('anon', 'public.' || quote_ident(r.relname), p) then bad := bad + 1; out := out || ('FAIL anon still has ' || p || ' on ' || r.relname); end if;
    end loop;
  end loop;
  out := out || pg_temp.chk('anon holds no privilege of any kind on any public table or view', bad = 0);
  -- Only the postgres role's defaults (the role that runs migrations) can be changed from here; supabase_admin's defaults
  -- (tables created in the dashboard) still grant anon and are parked in the hardening-2 report.
  out := out || pg_temp.chk('tables created by migrations (postgres) no longer grant anon anything by default',
    not exists (select 1 from pg_default_acl d join pg_namespace s on s.oid = d.defaclnamespace, lateral aclexplode(d.defaclacl) a
                where s.nspname = 'public' and d.defaclrole = (select oid from pg_roles where rolname = 'postgres') and d.defaclobjtype in ('r','S') and a.grantee = (select oid from pg_roles where rolname = 'anon')));

  insert into venues(id,name,slug) values (vT,'AnonT','an-'||substr(vT::text,1,8)) returning slug into v_slug;
  insert into auth.users(id,aud,role,email) values (a_own,'authenticated','authenticated','o'||a_own||'@t.test');
  insert into app_users(auth_id,venue_id,role,name) values (a_own,vT,'owner','Olive');
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Waiter','FOH','frontline');

  -- the one unauthenticated database call the app makes
  execute 'set local role anon';
  begin perform public.venue_roster(v_slug); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('anon can still call venue_roster (staff login page)', ok);
  foreach t in array array['app_users','staff_roles','esignatures','stations','modules','staff_certificates','chat_messages','wizard_sessions'] loop
    begin execute format('select 1 from public.%I limit 1', t); ok := true; exception when insufficient_privilege then ok := false; end;
    out := out || pg_temp.chk('anon select on ' || t || ' is refused', not ok);
  end loop;
  begin insert into public.staff_roles(venue_id,name,department,fallback_tier) values (vT,'Anon made','FOH','authorized'); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('anon insert into staff_roles is refused', not ok);
  execute 'reset role';

  -- signed in users and the service role are unaffected
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_own, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from staff_roles where venue_id = vT;
  out := out || pg_temp.chk('a signed in owner still reads their own roles', n = 1);
  select count(*) into n from app_users where venue_id = vT;
  out := out || pg_temp.chk('a signed in owner still reads their own staff', n = 1);
  begin update venues set name = 'AnonT2' where id = vT; get diagnostics n = row_count; exception when others then n := 0; end;
  out := out || pg_temp.chk('a signed in owner still updates their venue', n = 1);
  execute 'reset role';
  execute 'set local role service_role';
  select count(*) into n from staff_roles where venue_id = vT;
  execute 'reset role';
  out := out || pg_temp.chk('the service role still reads everything', n = 1);

  begin delete from venues where id = vT; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('cleanup cascade works', ok);
  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
