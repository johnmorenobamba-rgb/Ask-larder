-- Same reasoning as chat_messages_write_policy: E6's resolve action is the
-- first UPDATE path on near_miss_reports.status. Staff still need INSERT
-- (report-near-miss/route.ts writes via the request-scoped client) and
-- SELECT is left venue-wide (unchanged -- not asked to restrict who can
-- read reports, only who can resolve them). UPDATE/DELETE become
-- owner/manager only.

drop policy if exists venue_isolation_near_miss on near_miss_reports;

drop policy if exists near_miss_select_own_venue on near_miss_reports;
create policy near_miss_select_own_venue on near_miss_reports
  for select using (venue_id = private.auth_venue_id());

drop policy if exists near_miss_insert_own_venue on near_miss_reports;
create policy near_miss_insert_own_venue on near_miss_reports
  for insert with check (venue_id = private.auth_venue_id());

drop policy if exists near_miss_update_owner_manager on near_miss_reports;
create policy near_miss_update_owner_manager on near_miss_reports
  for update using (
    venue_id = private.auth_venue_id() and private.auth_role() in ('owner','manager')
  );

drop policy if exists near_miss_delete_owner_manager on near_miss_reports;
create policy near_miss_delete_owner_manager on near_miss_reports
  for delete using (
    venue_id = private.auth_venue_id() and private.auth_role() in ('owner','manager')
  );
