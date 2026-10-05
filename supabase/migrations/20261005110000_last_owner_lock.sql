-- Last owner race (hardening-3, B6). Before: the "a venue must keep at least one active owner" check read the other owners without any
-- lock, so two owners deactivating each other (or one deleting the other and the other deleting them) at the same moment both
-- passed it and the venue ended with NO active owner. Reproduced with two signed in owners before this migration
-- (tests/last-owner-race.test.ts, round 0: 0 active owners).
-- After: the check runs while holding a per venue transaction level advisory lock (pg_advisory_xact_lock on a hash of the venue id),
-- so the second transaction waits, then sees the first one's committed change and is refused. The check was also added to the DELETE
-- branch (it had none; two owners deleting each other could strand a venue).
-- ADDITIVE: create or replace of one function (body = 20261005100000 plus the two blocks marked B6). No table, row or grant changes.
-- Server paths (service_role, postgres) are exempt as before. The lock is released automatically at commit or rollback.
--
-- ROLLBACK: restore private.app_users_write_guard() from 20261005100000_authorized_holder_guards.sql (re-run its function body).

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
    -- B6: deleting an active owner is serialised per venue and may never remove the last active owner
    if old.role = 'owner' and old.deactivated_at is null then
      perform pg_advisory_xact_lock(hashtextextended('last_owner:' || old.venue_id::text, 0));
      if not exists (select 1 from app_users o where o.venue_id = old.venue_id and o.role = 'owner' and o.deactivated_at is null and o.id <> old.id) then
        raise exception 'A venue must keep at least one active owner';
      end if;
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
  -- B6: serialised per venue (transaction level advisory lock) so two owners acting at the same moment cannot both pass the check;
  -- the check runs after the lock is held, so it sees the other transaction's committed change
  if old.role = 'owner' and old.deactivated_at is null and (new.role <> 'owner' or new.deactivated_at is not null) then
    perform pg_advisory_xact_lock(hashtextextended('last_owner:' || old.venue_id::text, 0));
    if not exists (select 1 from app_users o where o.venue_id = old.venue_id and o.role = 'owner' and o.deactivated_at is null and o.id <> old.id) then
      raise exception 'A venue must keep at least one active owner';
    end if;
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
