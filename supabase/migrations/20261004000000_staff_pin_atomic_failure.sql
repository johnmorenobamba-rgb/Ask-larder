-- P26: the live staff PIN login and the second signature use ONE atomic, capped failure counter.
-- Additive: a new function only; no table, column or data changes.
--
-- Before: the login read the failed attempt count, added one in application code and wrote it back, so N
-- parallel wrong PINs could all read the same count and never reach the lock. This function does the
-- increment in a single UPDATE (the row lock serialises parallel callers, and each re-checks the lock
-- after waiting), and it does NOT count an attempt while the account is already locked, so a burst of
-- parallel requests ends at exactly 5 attempts and one 15 minute lock, never more. The application calls it
-- BEFORE comparing the PIN (it reserves an attempt), so at most 5 guesses per lock window reach the compare;
-- a correct PIN resets the counter afterwards, as before.
-- Same rules as before: 5 attempts lock for 15 minutes; only a correct PIN resets the counter (done by the
-- login code, unchanged); an attempt after a lock has expired locks again straight away (unchanged).
-- Callable by service_role only (the login route and the second signature check use the admin client).
--
-- ROLLBACK:  drop function if exists public.record_staff_pin_failure(uuid);
--            (the application code of the same commit must be reverted too, or the login would error on a wrong PIN)

create or replace function public.record_staff_pin_failure(p_staff_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  r record;
begin
  update app_users
  set pin_failed_attempts = coalesce(pin_failed_attempts, 0) + 1,
      pin_locked_until = case
        when coalesce(pin_failed_attempts, 0) + 1 >= 5 then now() + interval '15 minutes'
        else pin_locked_until
      end
  where id = p_staff_id
    and (pin_locked_until is null or pin_locked_until <= now())
  returning pin_failed_attempts, pin_locked_until into r;

  if found then
    return jsonb_build_object('counted', true, 'attempts', r.pin_failed_attempts, 'locked_until', r.pin_locked_until);
  end if;

  -- already locked (not counted) or no such person
  select pin_failed_attempts, pin_locked_until into r from app_users where id = p_staff_id;
  return jsonb_build_object('counted', false, 'attempts', r.pin_failed_attempts, 'locked_until', r.pin_locked_until);
end;
$$;

revoke all on function public.record_staff_pin_failure(uuid) from public, anon, authenticated;
grant execute on function public.record_staff_pin_failure(uuid) to service_role;
