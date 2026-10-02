-- P5: stop any signed-in staff member deleting or rewriting their venue (and, by cascade, the
-- compliance ledger). Additive tightening: SELECT stays venue wide; UPDATE on venues becomes
-- manager tier; nothing in the app deletes or inserts venues with a user client (service role and
-- the SECURITY DEFINER bootstrap_owner bypass RLS). venue_licence_profile: read for all staff,
-- insert and update for manager tier (the wizard upserts it), no delete.
--
-- ROLLBACK (restores the previous behaviour exactly):
--   drop policy if exists venues_select_own on venues;
--   drop policy if exists venues_update_manager_tier on venues;
--   create policy venue_isolation_venues on venues for all using (id = private.auth_venue_id());
--   grant all on venues to anon, authenticated;
--   drop policy if exists licence_profile_select on venue_licence_profile;
--   drop policy if exists licence_profile_insert_manager_tier on venue_licence_profile;
--   drop policy if exists licence_profile_update_manager_tier on venue_licence_profile;
--   create policy venue_isolation_venue_licence_profile on venue_licence_profile for all using (venue_id = private.auth_venue_id());
--   grant all on venue_licence_profile to anon, authenticated;

-- venues
drop policy if exists venue_isolation_venues on venues;
create policy venues_select_own on venues
  for select using (id = private.auth_venue_id());
create policy venues_update_manager_tier on venues
  for update using (id = private.auth_venue_id() and private.auth_is_manager_tier())
  with check (id = private.auth_venue_id() and private.auth_is_manager_tier());

revoke all on venues from anon;
revoke all on venues from authenticated;
grant select, update on venues to authenticated;

-- venue_licence_profile
drop policy if exists venue_isolation_venue_licence_profile on venue_licence_profile;
create policy licence_profile_select on venue_licence_profile
  for select using (venue_id = private.auth_venue_id());
create policy licence_profile_insert_manager_tier on venue_licence_profile
  for insert with check (venue_id = private.auth_venue_id() and private.auth_is_manager_tier());
create policy licence_profile_update_manager_tier on venue_licence_profile
  for update using (venue_id = private.auth_venue_id() and private.auth_is_manager_tier())
  with check (venue_id = private.auth_venue_id() and private.auth_is_manager_tier());

revoke all on venue_licence_profile from anon;
revoke all on venue_licence_profile from authenticated;
grant select, insert, update on venue_licence_profile to authenticated;
