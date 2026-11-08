-- Approved by John on 9 Nov 2026 and applied to larder-dev the same day, followed by
-- `npm run test:isolation`. Rollback: supabase/pending/20261109020000_rollback.sql.
--
-- Dashboard speed plan, Phase 4, part 2. Two kinds of change, neither meant
-- to change who can see or write what:
--
-- 1. auth_rls_initplan (advisor lint 0003, 7 policies): `auth.uid()` becomes
--    `(select auth.uid())`, so Postgres evaluates it once per statement
--    instead of once per row. Same value, same result.
--
-- 2. multiple_permissive_policies (advisor lint 0006, 3 tables): a FOR ALL
--    write policy also applies to SELECT, so each of these tables had two
--    permissive SELECT policies evaluated for every row. The write policy's
--    condition is always the select policy's condition PLUS a manager tier
--    check, so for SELECT the pair (an OR) equals the select policy alone.
--    Replacing the FOR ALL policy with the same condition for INSERT, UPDATE
--    and DELETE leaves exactly one SELECT policy and keeps every write rule:
--      check_questions:  select = module in my venue;  write = manager tier AND module in my venue
--      module_sections:  select = module in my venue;  write = manager tier AND module in my venue
--      photo_library:    select = venue is mine;       write = venue is mine AND I am owner/manager
--
-- NOTE for review: app_users_device_own_row is the RESTRICTIVE policy that
-- keeps the venue iPad (device) account to its own app_users row. Only the
-- auth.uid() wrapper changes; drop that one statement if you would rather
-- not touch a device restriction at all.

begin;

-- 1. auth.uid() evaluated once per statement --------------------------------

alter policy app_users_update_self_or_owner_manager on public.app_users
  using (((auth_id = (select auth.uid())) or (private.auth_role() = any (array['owner'::text, 'manager'::text]))));

alter policy app_users_device_own_row on public.app_users
  using (((private.auth_role() <> 'device'::text) or (auth_id = (select auth.uid()))));

alter policy topic_gap_reports_venue_isolation on public.topic_gap_reports
  using ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = (select auth.uid())))))
  with check ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = (select auth.uid())))));

alter policy content_suggestions_venue_isolation on public.content_suggestions
  using ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = (select auth.uid())))))
  with check ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = (select auth.uid())))));

alter policy station_faqs_venue_isolation on public.station_faqs
  using ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = (select auth.uid())))))
  with check ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = (select auth.uid())))));

alter policy station_troubleshooting_venue_isolation on public.station_troubleshooting_issues
  using ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = (select auth.uid())))))
  with check ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = (select auth.uid())))));

-- photo_library_owner_write is replaced in part 2 below (with the same fix).

-- 2. One permissive SELECT policy per table ---------------------------------

-- check_questions: check_questions_select_own_venue stays as the only SELECT policy.
drop policy check_questions_write_owner_manager on public.check_questions;
create policy check_questions_insert_owner_manager on public.check_questions for insert to public
  with check ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));
create policy check_questions_update_owner_manager on public.check_questions for update to public
  using ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))))
  with check ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));
create policy check_questions_delete_owner_manager on public.check_questions for delete to public
  using ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));

-- module_sections: module_sections_select_own_venue stays as the only SELECT policy.
drop policy module_sections_write_owner_manager on public.module_sections;
create policy module_sections_insert_owner_manager on public.module_sections for insert to public
  with check ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));
create policy module_sections_update_owner_manager on public.module_sections for update to public
  using ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))))
  with check ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));
create policy module_sections_delete_owner_manager on public.module_sections for delete to public
  using ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));

-- photo_library: photo_library_venue_select stays as the only SELECT policy; the
-- write rule also gets the (select auth.uid()) fix.
drop policy photo_library_owner_write on public.photo_library;
create policy photo_library_owner_insert on public.photo_library for insert to authenticated
  with check (((venue_id = private.auth_venue_id()) and (exists (select 1 from public.app_users au where ((au.auth_id = (select auth.uid())) and (au.role = any (array['owner'::text, 'manager'::text])))))));
create policy photo_library_owner_update on public.photo_library for update to authenticated
  using (((venue_id = private.auth_venue_id()) and (exists (select 1 from public.app_users au where ((au.auth_id = (select auth.uid())) and (au.role = any (array['owner'::text, 'manager'::text])))))))
  with check (((venue_id = private.auth_venue_id()) and (exists (select 1 from public.app_users au where ((au.auth_id = (select auth.uid())) and (au.role = any (array['owner'::text, 'manager'::text])))))));
create policy photo_library_owner_delete on public.photo_library for delete to authenticated
  using (((venue_id = private.auth_venue_id()) and (exists (select 1 from public.app_users au where ((au.auth_id = (select auth.uid())) and (au.role = any (array['owner'::text, 'manager'::text])))))));

commit;
