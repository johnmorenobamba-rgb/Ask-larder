-- Rollback for 20261109020000_rls_initplan_and_policy_merge.sql: restores every
-- policy it touches to the exact definition read from pg_policies on larder-dev
-- on 9 Nov 2026, before any change.

begin;

alter policy app_users_update_self_or_owner_manager on public.app_users
  using (((auth_id = auth.uid()) or (private.auth_role() = any (array['owner'::text, 'manager'::text]))));

alter policy app_users_device_own_row on public.app_users
  using (((private.auth_role() <> 'device'::text) or (auth_id = auth.uid())));

alter policy topic_gap_reports_venue_isolation on public.topic_gap_reports
  using ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = auth.uid()))))
  with check ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = auth.uid()))));

alter policy content_suggestions_venue_isolation on public.content_suggestions
  using ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = auth.uid()))))
  with check ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = auth.uid()))));

alter policy station_faqs_venue_isolation on public.station_faqs
  using ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = auth.uid()))))
  with check ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = auth.uid()))));

alter policy station_troubleshooting_venue_isolation on public.station_troubleshooting_issues
  using ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = auth.uid()))))
  with check ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = auth.uid()))));

drop policy check_questions_insert_owner_manager on public.check_questions;
drop policy check_questions_update_owner_manager on public.check_questions;
drop policy check_questions_delete_owner_manager on public.check_questions;
create policy check_questions_write_owner_manager on public.check_questions for all to public
  using ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))))
  with check ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));

drop policy module_sections_insert_owner_manager on public.module_sections;
drop policy module_sections_update_owner_manager on public.module_sections;
drop policy module_sections_delete_owner_manager on public.module_sections;
create policy module_sections_write_owner_manager on public.module_sections for all to public
  using ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))))
  with check ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));

drop policy photo_library_owner_insert on public.photo_library;
drop policy photo_library_owner_update on public.photo_library;
drop policy photo_library_owner_delete on public.photo_library;
create policy photo_library_owner_write on public.photo_library for all to authenticated
  using (((venue_id = private.auth_venue_id()) and (exists (select 1 from public.app_users au where ((au.auth_id = auth.uid()) and (au.role = any (array['owner'::text, 'manager'::text])))))))
  with check (((venue_id = private.auth_venue_id()) and (exists (select 1 from public.app_users au where ((au.auth_id = auth.uid()) and (au.role = any (array['owner'::text, 'manager'::text])))))));

commit;
