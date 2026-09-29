-- RLS write-policy gap flagged in the 21 Sep and 22 Sep handovers (top
-- follow-up item both times): near_miss_reports, chat_messages, stations,
-- and modules still gate their write policies on the bare literal
-- private.auth_role() in ('owner','manager'), predating the manager-tier
-- unification (20 Sep) that already fixed module_sections/check_questions
-- (20260921020000_module_sections_manager_tier_rls.sql) and
-- publish_module_version() (20260921000000). A Head Chef/Sous Chef/
-- Manager-titled/2IC staff account (app_users.role = 'staff',
-- staff_roles.fallback_tier = 'authorized') passes every relevant route's
-- own staff.isManagerTier check -- near-miss resolve, escalation resolve,
-- station CRUD, module approve/go-live/submit-for-approval -- and then hits
-- a silent RLS rejection on the write itself. Same bug class, same fix:
-- swap the bare role check for private.auth_is_manager_tier(), the shared
-- helper already live and already used by module_sections/check_questions.
--
-- Pure superset: auth_is_manager_tier() = auth_role() IN ('owner','manager')
-- OR fallback_tier = 'authorized'. Literal owner/manager keep identical
-- access; nobody loses anything. Frontline staff are unaffected -- they
-- never had UPDATE/DELETE on any of these four tables (INSERT-only, where
-- applicable), and that is unchanged here.
--
-- Scope, per John's explicit instruction: UPDATE + DELETE on all four
-- tables, PLUS INSERT on stations and modules (stations_write_owner_manager,
-- modules_write_owner_manager use the same bare check). INSERT on
-- chat_messages and near_miss_reports stays venue-wide, unchanged -- staff
-- genuinely need it there (ask-larder route writes both turns;
-- report-near-miss route writes the initial report) and was never part of
-- this gap.

-- near_miss_reports: UPDATE, DELETE
drop policy if exists near_miss_update_owner_manager on near_miss_reports;
create policy near_miss_update_manager_tier on near_miss_reports
  for update using (
    venue_id = private.auth_venue_id() and private.auth_is_manager_tier()
  );

drop policy if exists near_miss_delete_owner_manager on near_miss_reports;
create policy near_miss_delete_manager_tier on near_miss_reports
  for delete using (
    venue_id = private.auth_venue_id() and private.auth_is_manager_tier()
  );

-- chat_messages: UPDATE, DELETE
drop policy if exists chat_messages_update_owner_manager on chat_messages;
create policy chat_messages_update_manager_tier on chat_messages
  for update using (
    venue_id = private.auth_venue_id() and private.auth_is_manager_tier()
  );

drop policy if exists chat_messages_delete_owner_manager on chat_messages;
create policy chat_messages_delete_manager_tier on chat_messages
  for delete using (
    venue_id = private.auth_venue_id() and private.auth_is_manager_tier()
  );

-- stations: INSERT, UPDATE, DELETE
drop policy if exists stations_write_owner_manager on stations;
create policy stations_insert_manager_tier on stations
  for insert with check (
    venue_id = private.auth_venue_id() and private.auth_is_manager_tier()
  );

drop policy if exists stations_update_owner_manager on stations;
create policy stations_update_manager_tier on stations
  for update using (
    venue_id = private.auth_venue_id() and private.auth_is_manager_tier()
  );

drop policy if exists stations_delete_owner_manager on stations;
create policy stations_delete_manager_tier on stations
  for delete using (
    venue_id = private.auth_venue_id() and private.auth_is_manager_tier()
  );

-- modules: INSERT, UPDATE, DELETE
drop policy if exists modules_write_owner_manager on modules;
create policy modules_insert_manager_tier on modules
  for insert with check (
    venue_id = private.auth_venue_id() and private.auth_is_manager_tier()
  );

drop policy if exists modules_update_owner_manager on modules;
create policy modules_update_manager_tier on modules
  for update using (
    venue_id = private.auth_venue_id() and private.auth_is_manager_tier()
  );

drop policy if exists modules_delete_owner_manager on modules;
create policy modules_delete_manager_tier on modules
  for delete using (
    venue_id = private.auth_venue_id() and private.auth_is_manager_tier()
  );
