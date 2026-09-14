-- p_created_by_specialist_id has no default, which forces every caller
-- (including internal QA/test seed scripts that call the RPC directly via
-- the service-role admin client, bypassing bootstrapOwner.ts's PIN gate
-- entirely -- e.g. scripts/visual-qa.ts, tests/e2e/owner-dashboard-smoke.spec.ts)
-- to pass a real specialist id even though "no specialist, seeded directly
-- for internal test/QA purposes" is a legitimate state. Adding a default
-- keeps the real /onboarding/start route's behavior unchanged (it always
-- passes a real id, since bootstrapOwner.ts requires a verified PIN first)
-- while letting internal seed scripts omit it honestly instead of faking one.
drop function if exists public.bootstrap_owner(uuid, text, text, text, text, uuid);

create or replace function public.bootstrap_owner(
  p_auth_id uuid,
  p_venue_name text,
  p_venue_slug text,
  p_owner_name text,
  p_owner_email text,
  p_created_by_specialist_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_venue_id uuid;
  v_app_user_id uuid;
begin
  insert into venues (name, slug, created_by_specialist_id) values (p_venue_name, p_venue_slug, p_created_by_specialist_id)
    returning id into v_venue_id;

  insert into app_users (auth_id, venue_id, role, name, email)
    values (p_auth_id, v_venue_id, 'owner', p_owner_name, p_owner_email)
    returning id into v_app_user_id;

  return jsonb_build_object('venue_id', v_venue_id, 'app_user_id', v_app_user_id);
end;
$function$;

revoke execute on function public.bootstrap_owner(uuid, text, text, text, text, uuid) from public, anon, authenticated;
