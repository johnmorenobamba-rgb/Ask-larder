-- Authorized role holders (hardening-3, B1). Before: a manager (or any manager tier person the table policies let through) could
-- deactivate, reactivate or delete a person who holds an Authorized role, or an app role manager.
-- After: ONLY the owner may deactivate, reactivate or delete a person who holds an Authorized tier role, an app role manager
-- or an owner. The manager tier keeps deactivating and deleting Frontline people. Role demotion was already owner only
-- (20261005060000). The last active owner rule is unchanged here (B6 serialises it in the next migration).
-- Also an insert only log of deactivations and reactivations (who, whom, role and tier at the time, when), written by a trigger,
-- readable by the manager tier of the venue, written by nobody through the API.
-- Server paths (service_role, postgres) are exempt, as before.
-- ADDITIVE: create or replace of one function (body = the 20261005060000 version plus the two blocks marked B1), one new
-- table, one trigger. No existing row is changed.
--
-- ROLLBACK:
--   drop trigger if exists staff_access_change_log on public.app_users;
--   drop function if exists private.log_staff_access_change();
--   drop table if exists public.staff_access_changes;
--   -- then restore private.app_users_write_guard() from 20261005060000_role_change_guards.sql (re-run its function body).

create table if not exists public.staff_access_changes (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  staff_user_id uuid not null,
  changed_by uuid,
  action text not null check (action in ('deactivated', 'reactivated')),
  role_name text,
  tier text,
  changed_at timestamptz not null default now()
);
create index if not exists staff_access_changes_venue_idx on public.staff_access_changes (venue_id, changed_at desc);

alter table public.staff_access_changes enable row level security;
drop policy if exists staff_access_changes_select on public.staff_access_changes;
create policy staff_access_changes_select on public.staff_access_changes
  for select to authenticated
  using (venue_id = private.auth_venue_id() and private.auth_is_manager_tier());

revoke all on public.staff_access_changes from public, anon, authenticated;
grant select on public.staff_access_changes to authenticated;

create or replace function private.log_staff_access_change() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_actor uuid;
  v_role record;
begin
  if new.deactivated_at is not distinct from old.deactivated_at then return new; end if;
  select id into v_actor from app_users where auth_id = auth.uid();
  select name, coalesce(fallback_tier, 'frontline') as tier into v_role from staff_roles where id = old.staff_role_id;
  insert into staff_access_changes (venue_id, staff_user_id, changed_by, action, role_name, tier)
  values (new.venue_id, new.id, v_actor, case when new.deactivated_at is not null then 'deactivated' else 'reactivated' end,
          v_role.name, case when old.role in ('owner', 'manager') then 'authorized' else coalesce(v_role.tier, 'frontline') end);
  return new;
end;
$$;
revoke all on function private.log_staff_access_change() from public, anon, authenticated;

drop trigger if exists staff_access_change_log on public.app_users;
create trigger staff_access_change_log after update of deactivated_at on public.app_users
  for each row execute function private.log_staff_access_change();

create or replace function private.app_users_write_guard() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_caller record;
  v_is_mgr boolean;
  v_new_tier text;
  v_old_tier text;
  v_target_protected boolean;
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
    -- B1: only the owner removes someone who holds an Authorized role (or is a manager); the manager tier removes Frontline people only
    select (old.role in ('owner', 'manager') or coalesce(sr.fallback_tier, 'frontline') = 'authorized') into v_target_protected
      from (select 1) x left join staff_roles sr on sr.id = old.staff_role_id;
    if v_target_protected and v_caller.role <> 'owner' then
      raise exception 'Only the owner can remove someone with an Authorized role';
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
    if new.staff_role_id is not null and v_new_tier <> 'frontline' and v_caller.role <> 'owner' then
      raise exception 'Only the owner can assign an Authorized role';
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
  -- B1: only the owner deactivates or reactivates someone who holds an Authorized role (or is a manager)
  if new.deactivated_at is distinct from old.deactivated_at and v_caller.role <> 'owner' then
    select (old.role in ('owner', 'manager') or coalesce(sr.fallback_tier, 'frontline') = 'authorized') into v_target_protected
      from (select 1) x left join staff_roles sr on sr.id = old.staff_role_id;
    if v_target_protected then
      raise exception 'Only the owner can deactivate or reactivate someone with an Authorized role';
    end if;
  end if;
  -- the last active owner cannot be demoted or deactivated
  if old.role = 'owner' and old.deactivated_at is null
     and (new.role <> 'owner' or new.deactivated_at is not null)
     and not exists (select 1 from app_users o where o.venue_id = old.venue_id and o.role = 'owner' and o.deactivated_at is null and o.id <> old.id) then
    raise exception 'A venue must keep at least one active owner';
  end if;
  if new.staff_role_id is distinct from old.staff_role_id then
    if old.id = v_caller.id and old.staff_role_id is not null then
      raise exception 'You cannot change your own role';
    end if;
    select coalesce(sr.fallback_tier, 'frontline') into v_old_tier from staff_roles sr where sr.id = old.staff_role_id;
    if v_caller.role <> 'owner'
       and (coalesce(v_new_tier, 'frontline') <> 'frontline' or coalesce(v_old_tier, 'frontline') <> 'frontline') then
      raise exception 'Only the owner can assign or remove an Authorized role';
    end if;
    if v_is_mgr then
      null; -- manager tier moves people between frontline roles; the owner may use any role (venue checked above)
    elsif old.id = v_caller.id and old.staff_role_id is null and new.staff_role_id is not null and v_new_tier = 'frontline' then
      null; -- a new hire picking a frontline role for themselves on the welcome screen
    else
      raise exception 'Only a manager can assign this role';
    end if;
  end if;
  return new;
end;
$$;
