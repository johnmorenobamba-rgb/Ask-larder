-- Reconciles migration history with the live DB. Three migrations were applied
-- live with no corresponding local file: tighten_app_users_rls (20260827212145),
-- venue1_role_restructure_and_cert_types (20260828001857), and
-- fix_venue1_department_labels (20260828001925) -- confirmed via direct
-- introspection (list_migrations, pg_policies, information_schema) rather than
-- assumed. This migration captures the SCHEMA those left behind, non-destructively
-- (create/alter/drop-then-create throughout, safe to rerun). It deliberately does
-- NOT replay the venue #1 role-restructure/cert-type-population DATA statements
-- those migrations also ran -- that data is already live, one-time, and
-- non-idempotent (plain inserts with no ON CONFLICT; rerunning would duplicate
-- rows). Schema only, matching the project's precedent of separating schema from
-- one-off content migrations (see 20260828025000_running_late_policy_content.sql).

-- ============================
-- From tighten_app_users_rls: app_users_select_own_venue allowed any staff
-- member to write ANY row in their own venue, not just their own. Split into
-- SELECT (venue-wide, needed for the staff login picker) and self-scoped
-- INSERT/UPDATE/DELETE with owner/manager elevation, via a new security-definer
-- role helper alongside the existing private.auth_venue_id().
-- ============================
create or replace function private.auth_role() returns text
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select role from app_users where auth_id = auth.uid()
$$;

drop policy if exists venue_isolation_app_users on app_users;

drop policy if exists app_users_select_own_venue on app_users;
create policy app_users_select_own_venue on app_users
  for select using (venue_id = private.auth_venue_id());

drop policy if exists app_users_insert_owner_manager on app_users;
create policy app_users_insert_owner_manager on app_users
  for insert with check (
    venue_id = private.auth_venue_id() and private.auth_role() in ('owner','manager')
  );

drop policy if exists app_users_update_self_or_owner_manager on app_users;
create policy app_users_update_self_or_owner_manager on app_users
  for update using (
    auth_id = auth.uid() or private.auth_role() in ('owner','manager')
  );

drop policy if exists app_users_delete_owner_manager on app_users;
create policy app_users_delete_owner_manager on app_users
  for delete using (
    private.auth_role() in ('owner','manager')
  );

-- ============================
-- From venue1_role_restructure_and_cert_types: staff_roles gained a department
-- tag (FOH/BOH) and certificate_type_roles (mirrors module_roles' pattern) was
-- added to scope certificate types to the roles that need them.
-- ============================
alter table staff_roles add column if not exists department text check (department in ('FOH','BOH'));

create table if not exists certificate_type_roles (
  certificate_type_id uuid references certificate_types(id) on delete cascade,
  role_id uuid references staff_roles(id) on delete cascade,
  primary key (certificate_type_id, role_id)
);

alter table certificate_type_roles enable row level security;
drop policy if exists venue_isolation_certificate_type_roles on certificate_type_roles;
create policy venue_isolation_certificate_type_roles on certificate_type_roles
  for all using (
    certificate_type_id in (select id from certificate_types where venue_id = private.auth_venue_id())
  );

-- fix_venue1_department_labels was a pure data correction (swapped FOH/BOH
-- values already inserted above) -- no schema to reconcile.
