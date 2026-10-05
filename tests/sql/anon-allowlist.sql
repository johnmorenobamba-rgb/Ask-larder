-- Anon allowlist (permanent, hardening-3 B3). FAILS if the anon role (the public key) holds ANY privilege on a table, view,
-- materialised view, sequence or function in schema public beyond the explicit allowlists below, or if the default privileges of the
-- migration role would grant anon anything on a NEW table, sequence or function. venue_roster is a FUNCTION (staff login page), not
-- a table. Read only plus objects created and rolled back inside the block. Expected: all PASS, 0 FAIL (INFO lines are notes).
-- The block ends with a forced exception (that is how it rolls back): the result is the line 'RESULTS (rolled back): N PASS, 0 FAIL'.
-- Run it as the migration role (postgres) so the probe objects use the defaults that are being checked.
-- To allow something new for anon, add it to the arrays below in the same change and explain why in the commit.
do $$
declare
  allowed_relations text[] := '{}';
  allowed_functions text[] := '{venue_roster(text)}'; -- by full signature, so a new overload is not allowed silently
  r record; bad text[] := '{}'; out text[] := '{}'; pass int; fail int; n int; anon_oid oid := (select oid from pg_roles where rolname = 'anon');
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;

  -- 1 relations (tables, views, materialised views, partitioned and foreign tables), table and column level
  for r in select c.oid, c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind in ('r','v','m','p','f') loop
    if r.relname = any (allowed_relations) then continue; end if;
    if has_table_privilege('anon', r.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       or has_any_column_privilege('anon', r.oid, 'SELECT,INSERT,UPDATE,REFERENCES') then
      bad := bad || r.relname::text;
    end if;
  end loop;
  out := out || pg_temp.chk('anon holds no privilege on any table or view in public beyond the allowlist' || case when array_length(bad,1) > 0 then ' (' || array_to_string(bad, ', ') || ')' else '' end, coalesce(array_length(bad,1),0) = 0);

  -- 2 sequences
  bad := '{}';
  for r in select c.oid, c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind = 'S' loop
    if has_sequence_privilege('anon', r.oid, 'USAGE,SELECT,UPDATE') then bad := bad || r.relname::text; end if;
  end loop;
  out := out || pg_temp.chk('anon holds no privilege on any sequence in public' || case when array_length(bad,1) > 0 then ' (' || array_to_string(bad, ', ') || ')' else '' end, coalesce(array_length(bad,1),0) = 0);

  -- 3 functions
  bad := '{}';
  for r in select p.oid, p.oid::regprocedure::text as sig from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' loop
    if r.sig = any (allowed_functions) then continue; end if;
    if has_function_privilege('anon', r.oid, 'EXECUTE') then bad := bad || r.sig; end if;
  end loop;
  out := out || pg_temp.chk('anon can execute no function in public beyond the allowlist' || case when array_length(bad,1) > 0 then ' (' || array_to_string(bad, ', ') || ')' else '' end, coalesce(array_length(bad,1),0) = 0);
  out := out || pg_temp.chk('the allowed function venue_roster still exists and is callable by anon', has_function_privilege('anon', 'public.venue_roster(text)', 'EXECUTE'));

  -- 4 default privileges of the migration role (postgres) in public
  select count(*) into n from pg_default_acl d, lateral aclexplode(d.defaclacl) a
    where d.defaclnamespace = 'public'::regnamespace and d.defaclrole = (select oid from pg_roles where rolname = 'postgres') and a.grantee = anon_oid;
  out := out || pg_temp.chk('the default privileges of the migration role grant anon nothing on new tables, sequences or functions', n = 0);

  -- 5 prove it on real new objects (rolled back with the block); only meaningful when run as the migration role
  out := out || pg_temp.chk('this test runs as the migration role (postgres), the role whose defaults are checked', current_user = 'postgres');
  create table public.zz_anon_allowlist_probe (id int);
  create sequence public.zz_anon_allowlist_probe_seq;
  create function public.zz_anon_allowlist_probe_fn() returns int language sql as 'select 1';
  out := out || pg_temp.chk('a new table created by the migration role grants anon nothing', not has_table_privilege('anon', 'public.zz_anon_allowlist_probe', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'));
  out := out || pg_temp.chk('a new sequence created by the migration role grants anon nothing', not has_sequence_privilege('anon', 'public.zz_anon_allowlist_probe_seq', 'USAGE,SELECT,UPDATE'));
  -- Postgres grants EXECUTE on every new function to PUBLIC (and so to anon) and a schema level default privilege cannot remove that
  -- (only the global form can, which would also strip future helper functions in other schemas). So a new function is anon callable
  -- until its migration revokes it, and check 3 above is the guard that fails if a migration forgets.
  if has_function_privilege('anon', 'public.zz_anon_allowlist_probe_fn()', 'EXECUTE') then out := out || array['INFO a new function is executable by anon until its migration revokes it from public (known Postgres default); check 3 catches it']; end if;
  out := out || pg_temp.chk('a new table still grants the signed in role and the service role what the app needs', has_table_privilege('authenticated', 'public.zz_anon_allowlist_probe', 'SELECT') and has_table_privilege('service_role', 'public.zz_anon_allowlist_probe', 'SELECT,INSERT,UPDATE,DELETE'));

  -- 6 notes (not failures): defaults of roles this project cannot change
  select count(*) into n from pg_default_acl d, lateral aclexplode(d.defaclacl) a
    where d.defaclnamespace = 'public'::regnamespace and d.defaclrole = (select oid from pg_roles where rolname = 'supabase_admin') and a.grantee = anon_oid;
  if n > 0 then out := out || array['INFO supabase_admin defaults in public still grant anon on new objects it creates (tables made in the Supabase dashboard); cannot be changed from the migration role, this test catches any such table']; end if;

  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
