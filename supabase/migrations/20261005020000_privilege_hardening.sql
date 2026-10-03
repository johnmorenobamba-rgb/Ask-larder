-- Privilege hardening (predeploy task 6, clear gaps only). Findings from the 5 Oct 2026 privilege sweep:
--   1. anon and authenticated held TRUNCATE, TRIGGER and REFERENCES on about 40 older public tables (Supabase default
--      grants). TRUNCATE bypasses row level security. No app path uses any of the three (PostgREST has no TRUNCATE and the
--      app never creates triggers or foreign keys as a signed in user), so they are revoked from both roles on every
--      public table and view.
--   2. Four SECURITY DEFINER functions were executable by anon (the default PUBLIC execute): complete_onboarding_signature,
--      match_knowledge_chunks, match_knowledge_chunks_for_authoring, publish_module_version. Each already refuses a caller
--      with no signed in user (they read auth.uid()), and each is only ever called by a signed in session or the service
--      role, so anon execute is revoked. authenticated and service_role keep it. venue_roster stays callable by anon on
--      purpose (the staff login page lists names for a venue slug).
-- ROLLBACK:
--   do $$ declare r record; begin for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--     where n.nspname = 'public' and c.relkind in ('r','v','m','p') loop
--     execute format('grant truncate, trigger, references on public.%I to anon, authenticated', r.relname); end loop; end $$;
--   grant execute on function public.complete_onboarding_signature(text, text, text), public.match_knowledge_chunks(extensions.vector, integer),
--     public.match_knowledge_chunks_for_authoring(extensions.vector, uuid, integer), public.publish_module_version(uuid, text) to public;
--   alter default privileges in schema public grant truncate, trigger, references on tables to anon, authenticated;
-- Note: in the live database anon held EXECUTE on all four (checked 3 Oct with has_function_privilege). In the repo history only match_knowledge_chunks
-- was ever PUBLIC; the other three were created with revoke from public plus grant to authenticated. The rollback above restores the LIVE state.
-- (Tables that never had these grants, such as the compliance tables, would gain them back by the rollback; harmless but wider.)

do $$
declare
  r record;
begin
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
  loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', r.relname);
  end loop;
end $$;

revoke execute on function public.complete_onboarding_signature(text, text, text) from public, anon;
revoke execute on function public.match_knowledge_chunks(extensions.vector, integer) from public, anon;
revoke execute on function public.match_knowledge_chunks_for_authoring(extensions.vector, uuid, integer) from public, anon;
revoke execute on function public.publish_module_version(uuid, text) from public, anon;
grant execute on function public.complete_onboarding_signature(text, text, text) to authenticated, service_role;
grant execute on function public.match_knowledge_chunks(extensions.vector, integer) to authenticated, service_role;
grant execute on function public.match_knowledge_chunks_for_authoring(extensions.vector, uuid, integer) to authenticated, service_role;
grant execute on function public.publish_module_version(uuid, text) to authenticated, service_role;

-- New tables and views would regain the three privileges from the default ACL, so stop that for objects the migration role creates.
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;
