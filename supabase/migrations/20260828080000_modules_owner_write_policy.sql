-- The owner-approval gate is a locked architecture rule (CLAUDE.md: "every
-- module must be explicitly approved by the venue owner before it goes
-- live... don't build a path that skips this"). Today's venue_isolation_modules
-- policy is "for all using (venue_id = private.auth_venue_id())" -- any
-- authenticated staff member in the venue, not just owner/manager, could
-- flip a module's status via a direct client call, bypassing Block E's new
-- approve/go-live routes entirely. Same class of gap tighten_app_users_rls
-- already fixed for app_users; closing it here the same way, now that
-- Block E's routes are the only place status legitimately changes.
--
-- Staff still need broad SELECT (reading live module content is the whole
-- staff-side flow) -- only INSERT/UPDATE/DELETE are restricted. Module
-- creation itself still goes through the admin/service-role client (the
-- founder's Claude Code session, per the "Venue #1: raw" workflow), which
-- bypasses RLS regardless, so this doesn't block that.

drop policy if exists venue_isolation_modules on modules;

drop policy if exists modules_select_own_venue on modules;
create policy modules_select_own_venue on modules
  for select using (venue_id = private.auth_venue_id());

drop policy if exists modules_write_owner_manager on modules;
create policy modules_write_owner_manager on modules
  for insert with check (
    venue_id = private.auth_venue_id() and private.auth_role() in ('owner','manager')
  );

drop policy if exists modules_update_owner_manager on modules;
create policy modules_update_owner_manager on modules
  for update using (
    venue_id = private.auth_venue_id() and private.auth_role() in ('owner','manager')
  );

drop policy if exists modules_delete_owner_manager on modules;
create policy modules_delete_owner_manager on modules
  for delete using (
    venue_id = private.auth_venue_id() and private.auth_role() in ('owner','manager')
  );
