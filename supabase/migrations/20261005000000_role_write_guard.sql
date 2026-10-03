-- Role write guard (predeploy task 1). Closes a privilege escalation hole found 3 Oct 2026:
--   * staff_roles had ONE policy, FOR ALL, venue only: any signed in person in a venue could insert, update (department,
--     fallback_tier) or delete any role of that venue, including their own.
--   * app_users UPDATE allowed any person to update their OWN row in ANY column (role, staff_role_id, venue_id,
--     pin_hash, deactivated_at) because the policy has no column or value check, so someone could set role = 'owner',
--     or give themselves an authorized role, or move themselves to another venue.
--   * private.auth_is_manager_tier() is (app_users.role in owner, manager) OR (staff_roles.fallback_tier = authorized),
--     so BOTH routes lead straight to manager tier.
--   * anon and authenticated also held TRUNCATE, TRIGGER and REFERENCES on both tables (TRUNCATE bypasses RLS).
-- This migration is additive and only restricts:
--   1. staff_roles: SELECT for the venue; INSERT, UPDATE, DELETE only for manager tier of the same venue.
--   2. A BEFORE trigger on staff_roles: only the owner may set or change fallback_tier (including inserting an
--      authorized role); venue_id can never change.
--   3. A BEFORE trigger on app_users, for signed in client sessions only (service role, postgres and migrations are
--      untouched): the target row must be in the caller's own venue; venue_id, auth_id and the PIN columns never change from a client; only the owner changes role (never
--      their own); only manager tier assigns staff_role_id, except that a person who has NO role yet may pick a
--      frontline role for themselves (the welcome screen); only manager tier changes deactivated_at; a non owner cannot
--      edit or delete an owner row; nobody deletes their own row from a client; a non owner can only insert role 'staff'.
--   4. TRUNCATE, TRIGGER, REFERENCES revoked from anon and authenticated on both tables.
-- NOTE: applied as two entries: role_write_guard, then role_write_guard_fix_delete_bypass (the bypass branch of the app_users
-- trigger returned NEW on DELETE, which is NULL and would silently skip server side deletes; found by the suite, fixed before any use).
-- ROLLBACK:
--   drop trigger if exists app_users_write_guard on public.app_users;   -- (this trigger now covers insert, update and delete)
--   drop trigger if exists staff_roles_write_guard on public.staff_roles;
--   drop function if exists private.app_users_write_guard();
--   drop function if exists private.staff_roles_write_guard();
--   drop policy if exists staff_roles_select_own_venue on public.staff_roles;
--   drop policy if exists staff_roles_insert_manager on public.staff_roles;
--   drop policy if exists staff_roles_update_manager on public.staff_roles;
--   drop policy if exists staff_roles_delete_manager on public.staff_roles;
--   create policy venue_isolation_staff_roles on public.staff_roles for all using (venue_id = private.auth_venue_id());
--   grant truncate, trigger, references on public.app_users, public.staff_roles to anon, authenticated;

create or replace function private.staff_roles_write_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_caller record;
begin
  if coalesce(current_setting('role', true), 'none') in ('none', 'postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;
  select au.id, au.role, au.venue_id into v_caller from app_users au where au.auth_id = auth.uid() and au.deactivated_at is null;
  if not found then
    raise exception 'Not allowed to change roles';
  end if;
  if new.venue_id is distinct from v_caller.venue_id then
    raise exception 'Not allowed to change roles of another venue';
  end if;
  if tg_op = 'UPDATE' and new.venue_id is distinct from old.venue_id then
    raise exception 'A role cannot move to another venue';
  end if;
  if tg_op = 'INSERT' then
    if coalesce(new.fallback_tier, 'frontline') <> 'frontline' and v_caller.role <> 'owner' then
      raise exception 'Only the owner can create a manager tier role';
    end if;
  elsif new.fallback_tier is distinct from old.fallback_tier and v_caller.role <> 'owner' then
    raise exception 'Only the owner can change a role tier';
  end if;
  return new;
end;
$$;

create or replace function private.app_users_write_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_caller record;
  v_is_mgr boolean;
  v_new_tier text;
  v_new_role_venue uuid;
begin
  if coalesce(current_setting('role', true), 'none') in ('none', 'postgres', 'service_role', 'supabase_admin') then
    if tg_op = 'DELETE' then
      return old; -- a BEFORE DELETE trigger that returns NULL would silently skip the delete
    end if;
    return new;
  end if;
  select au.id, au.role, au.venue_id,
         (au.role in ('owner', 'manager') or coalesce(sr.fallback_tier, 'frontline') = 'authorized') as is_mgr
    into v_caller
  from app_users au
  left join staff_roles sr on sr.id = au.staff_role_id
  where au.auth_id = auth.uid() and au.deactivated_at is null;
  if not found then
    raise exception 'Not allowed to change staff';
  end if;
  v_is_mgr := v_caller.is_mgr;

  if tg_op = 'DELETE' then
    if old.venue_id is distinct from v_caller.venue_id then
      raise exception 'Not allowed to remove staff of another venue';
    end if;
    if old.id = v_caller.id then
      raise exception 'You cannot delete your own account';
    end if;
    if old.role = 'owner' and v_caller.role <> 'owner' then
      raise exception 'Only an owner can delete an owner';
    end if;
    return old;
  end if;

  if new.staff_role_id is not null then
    select sr.venue_id, coalesce(sr.fallback_tier, 'frontline') into v_new_role_venue, v_new_tier from staff_roles sr where sr.id = new.staff_role_id;
    if v_new_role_venue is distinct from new.venue_id then
      raise exception 'That role belongs to another venue';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.venue_id is distinct from v_caller.venue_id then
      raise exception 'Not allowed to add staff to another venue';
    end if;
    if new.role <> 'staff' and v_caller.role <> 'owner' then
      raise exception 'Only the owner can add an owner or manager';
    end if;
    if new.auth_id is not null or new.pin_hash is not null then
      raise exception 'Logins and PINs are set by the server only';
    end if;
    if new.staff_role_id is not null and v_new_tier <> 'frontline' and not v_is_mgr then
      raise exception 'Only a manager can assign a manager tier role';
    end if;
    return new;
  end if;

  -- UPDATE
  if old.venue_id is distinct from v_caller.venue_id then
    raise exception 'Not allowed to change staff of another venue';
  end if;
  if new.id is distinct from old.id or new.venue_id is distinct from old.venue_id or new.auth_id is distinct from old.auth_id then
    raise exception 'Identity and venue cannot be changed from a client';
  end if;
  if new.pin_hash is distinct from old.pin_hash or new.pin_set_at is distinct from old.pin_set_at
     or new.pin_failed_attempts is distinct from old.pin_failed_attempts or new.pin_locked_until is distinct from old.pin_locked_until then
    raise exception 'PIN fields are changed by the server only';
  end if;
  if old.role = 'owner' and old.id <> v_caller.id and v_caller.role <> 'owner' then
    raise exception 'Only an owner can change an owner';
  end if;
  if new.role is distinct from old.role then
    if v_caller.role <> 'owner' or old.id = v_caller.id then
      raise exception 'Only the owner can change a role, and not their own';
    end if;
  end if;
  if new.deactivated_at is distinct from old.deactivated_at and not v_is_mgr then
    raise exception 'Only a manager can deactivate or reactivate staff';
  end if;
  if new.staff_role_id is distinct from old.staff_role_id then
    if v_is_mgr then
      null; -- manager tier assigns roles within the venue (venue checked above)
    elsif old.id = v_caller.id and old.staff_role_id is null and new.staff_role_id is not null and v_new_tier = 'frontline' then
      null; -- a new hire picking a frontline role for themselves on the welcome screen
    else
      raise exception 'Only a manager can assign this role';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.app_users_write_guard() from public, anon, authenticated;
revoke all on function private.staff_roles_write_guard() from public, anon, authenticated;

drop trigger if exists staff_roles_write_guard on public.staff_roles;
create trigger staff_roles_write_guard before insert or update on public.staff_roles
  for each row execute function private.staff_roles_write_guard();
drop trigger if exists app_users_write_guard on public.app_users;
create trigger app_users_write_guard before insert or update or delete on public.app_users
  for each row execute function private.app_users_write_guard();

drop policy if exists venue_isolation_staff_roles on public.staff_roles;
drop policy if exists staff_roles_select_own_venue on public.staff_roles;
drop policy if exists staff_roles_insert_manager on public.staff_roles;
drop policy if exists staff_roles_update_manager on public.staff_roles;
drop policy if exists staff_roles_delete_manager on public.staff_roles;
create policy staff_roles_select_own_venue on public.staff_roles for select using (venue_id = private.auth_venue_id());
create policy staff_roles_insert_manager on public.staff_roles for insert
  with check (venue_id = private.auth_venue_id() and private.auth_is_manager_tier());
create policy staff_roles_update_manager on public.staff_roles for update
  using (venue_id = private.auth_venue_id() and private.auth_is_manager_tier())
  with check (venue_id = private.auth_venue_id() and private.auth_is_manager_tier());
create policy staff_roles_delete_manager on public.staff_roles for delete
  using (venue_id = private.auth_venue_id() and private.auth_is_manager_tier());

revoke truncate, trigger, references on public.app_users from anon, authenticated;
revoke truncate, trigger, references on public.staff_roles from anon, authenticated;
