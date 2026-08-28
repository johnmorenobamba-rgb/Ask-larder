-- E8's station CRUD is the first app write path to stations (confirmed via
-- grep -- nothing writes to it today; QR-scan entry only ever reads).
-- Same pattern as modules_owner_write_policy: staff need broad SELECT
-- (QR station entry reads it), INSERT/UPDATE/DELETE become owner/manager
-- only.

drop policy if exists venue_isolation_stations on stations;

drop policy if exists stations_select_own_venue on stations;
create policy stations_select_own_venue on stations
  for select using (venue_id = private.auth_venue_id());

drop policy if exists stations_write_owner_manager on stations;
create policy stations_write_owner_manager on stations
  for insert with check (
    venue_id = private.auth_venue_id() and private.auth_role() in ('owner','manager')
  );

drop policy if exists stations_update_owner_manager on stations;
create policy stations_update_owner_manager on stations
  for update using (
    venue_id = private.auth_venue_id() and private.auth_role() in ('owner','manager')
  );

drop policy if exists stations_delete_owner_manager on stations;
create policy stations_delete_owner_manager on stations
  for delete using (
    venue_id = private.auth_venue_id() and private.auth_role() in ('owner','manager')
  );
