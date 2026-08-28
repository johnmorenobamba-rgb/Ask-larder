-- Same reasoning as modules_owner_write_policy: E4's light content-edit
-- routes are about to become the first-ever app write path to
-- module_sections/check_questions (confirmed via grep -- nothing writes to
-- either today). Their current FK-subquery policies are "for all", so any
-- authenticated staff in the venue could otherwise edit training content
-- directly, bypassing the owner/manager-only edit routes entirely.

drop policy if exists venue_isolation_module_sections on module_sections;

drop policy if exists module_sections_select_own_venue on module_sections;
create policy module_sections_select_own_venue on module_sections
  for select using (module_id in (select id from modules where venue_id = private.auth_venue_id()));

drop policy if exists module_sections_write_owner_manager on module_sections;
create policy module_sections_write_owner_manager on module_sections
  for all
  using (
    private.auth_role() in ('owner','manager')
    and module_id in (select id from modules where venue_id = private.auth_venue_id())
  )
  with check (
    private.auth_role() in ('owner','manager')
    and module_id in (select id from modules where venue_id = private.auth_venue_id())
  );

drop policy if exists venue_isolation_check_questions on check_questions;

drop policy if exists check_questions_select_own_venue on check_questions;
create policy check_questions_select_own_venue on check_questions
  for select using (module_id in (select id from modules where venue_id = private.auth_venue_id()));

drop policy if exists check_questions_write_owner_manager on check_questions;
create policy check_questions_write_owner_manager on check_questions
  for all
  using (
    private.auth_role() in ('owner','manager')
    and module_id in (select id from modules where venue_id = private.auth_venue_id())
  )
  with check (
    private.auth_role() in ('owner','manager')
    and module_id in (select id from modules where venue_id = private.auth_venue_id())
  );
