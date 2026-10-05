-- Older tables: remove ALL anon privileges on public tables and views (hardening-2 task 3).
-- Before: 40 older tables still gave the anon role select, insert, update and delete (the Supabase default), protected only by
-- row level security. RLS returned no rows to anon today, but a single policy mistake would have exposed a table to anyone
-- holding the public anon key.
-- Proof that no unauthenticated app path needs them (5 Oct 2026):
--   * every public page and API route that runs without a login was exercised against the app (landing, contact, privacy,
--     legal, venue page, staff login, owner login, reset password, onboarding start, station and protected URLs without a
--     session) and the Supabase API log shows exactly one database call from all of them: rpc/venue_roster (a SECURITY DEFINER
--     function that keeps its own anon EXECUTE grant, unchanged here);
--   * the staff PIN login, owner bootstrap, suggestion cron and both edge functions (cert-nudge, weekly-digest) use the
--     service role, which is untouched;
--   * signed in users use the authenticated role, untouched;
--   * the contact form sends mail only (no database access); sign in, reset password and sign up go to Supabase Auth.
-- ADDITIVE and reversible: no data, table or policy changes. Also changes the default for new public tables so they no longer
-- grant anon anything.
--
-- ROLLBACK (restores the previous state):
--   grant select, insert, update, delete on table
--     public.app_users, public.cert_nudge_log, public.certificate_type_roles, public.certificate_types, public.chat_messages,
--     public.check_questions, public.content_suggestions, public.esignatures, public.knowledge_chunks,
--     public.menu_item_modifier_groups, public.menu_item_modifiers, public.menu_items, public.module_roles,
--     public.module_sections, public.module_versions, public.modules, public.near_miss_reports,
--     public.onboarding_content_checks, public.onboarding_pin_attempts, public.onboarding_specialists, public.photo_library,
--     public.sop_documents, public.sop_edit_requests, public.sop_intake_answers, public.sop_source_documents,
--     public.sop_topic_decisions, public.staff_certificates, public.staff_module_acknowledgements,
--     public.staff_module_progress, public.staff_roles, public.station_faqs, public.station_troubleshooting_issues,
--     public.stations, public.suggestion_pass_runs, public.topic_gap_checklists, public.topic_gap_reports,
--     public.venue_contacts, public.venue_key_roles, public.venue_promotions, public.wizard_sessions
--     to anon;
--   alter default privileges in schema public grant select, insert, update, delete on tables to anon;
--   alter default privileges in schema public grant usage, select on sequences to anon;
-- Note: ALTER DEFAULT PRIVILEGES without FOR ROLE applies to the role running the migration (postgres), as in
-- 20261005020000. Objects created by supabase_admin (for example in the dashboard) may still grant anon by default.

do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
  loop
    execute format('revoke all on table public.%I from anon', r.relname);
  end loop;
end $$;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
