-- Venue iPad mode, defence in depth. The shared device account (app_users.role = 'device') is blocked by the API routes
-- from recording anything under a person's name. These RESTRICTIVE policies add the same limit at the database, so the
-- device account's own browser session cannot read or write other people's records either, even by calling the
-- database directly. Restrictive policies are ANDed with the existing permissive venue policies, so nothing else changes
-- for owners, managers or staff.
--
-- What the device account keeps: reading venue content (modules, stations, FAQs, troubleshooting), its own app_users row
-- (needed to sign in), and inserting its own Ask Larder chat messages.
--
-- ROLLBACK: drop each policy named below.

drop policy if exists app_users_device_own_row on public.app_users;
create policy app_users_device_own_row on public.app_users
  as restrictive for select to authenticated
  using (private.auth_role() <> 'device' or auth_id = auth.uid());

drop policy if exists chat_messages_device_no_read on public.chat_messages;
create policy chat_messages_device_no_read on public.chat_messages
  as restrictive for select to authenticated
  using (private.auth_role() <> 'device');

drop policy if exists esignatures_device_none on public.esignatures;
create policy esignatures_device_none on public.esignatures
  as restrictive for all to authenticated
  using (private.auth_role() <> 'device');

drop policy if exists staff_certificates_device_none on public.staff_certificates;
create policy staff_certificates_device_none on public.staff_certificates
  as restrictive for all to authenticated
  using (private.auth_role() <> 'device');

drop policy if exists staff_module_acknowledgements_device_none on public.staff_module_acknowledgements;
create policy staff_module_acknowledgements_device_none on public.staff_module_acknowledgements
  as restrictive for all to authenticated
  using (private.auth_role() <> 'device');

drop policy if exists staff_module_progress_device_none on public.staff_module_progress;
create policy staff_module_progress_device_none on public.staff_module_progress
  as restrictive for all to authenticated
  using (private.auth_role() <> 'device');

drop policy if exists venue_key_roles_device_none on public.venue_key_roles;
create policy venue_key_roles_device_none on public.venue_key_roles
  as restrictive for all to authenticated
  using (private.auth_role() <> 'device');

drop policy if exists staff_access_changes_device_none on public.staff_access_changes;
create policy staff_access_changes_device_none on public.staff_access_changes
  as restrictive for select to authenticated
  using (private.auth_role() <> 'device');

drop policy if exists staff_role_changes_device_none on public.staff_role_changes;
create policy staff_role_changes_device_none on public.staff_role_changes
  as restrictive for select to authenticated
  using (private.auth_role() <> 'device');

drop policy if exists compliance_submissions_device_none on public.compliance_form_submissions;
create policy compliance_submissions_device_none on public.compliance_form_submissions
  as restrictive for select to authenticated
  using (private.auth_role() <> 'device');
