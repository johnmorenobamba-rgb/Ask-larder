-- Closes the real hole found in the 14 Sep pre-launch audit: /onboarding/start
-- (and its POST /api/auth/bootstrap-owner) succeeds for any anonymous
-- request with no auth check at all, directly contradicting CLAUDE.md's
-- locked "v1 has no self-serve signup" decision. bootstrap_owner() already
-- has EXECUTE revoked from anon/authenticated (see
-- 20260914180000_revoke_bootstrap_owner_public_execute.sql) but the route
-- behind it (server-side, service-role) had no gate of its own. This adds
-- a real PIN gate enforced server-side in bootstrapOwner.ts, plus an audit
-- trail of which onboarding specialist created which venue.

create table if not exists onboarding_specialists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table onboarding_specialists enable row level security;
-- No policies -- same "RLS on with zero policies = closed to anon and
-- authenticated, only the service-role client can reach it" convention as
-- every other internal-only table in this schema. Never queried client-side.

-- Basic rate limiting/lockout on repeated wrong-PIN attempts, keyed by a
-- hash of the caller's IP (never the raw IP) since this endpoint is
-- genuinely anonymous until a valid PIN is presented -- there's no staff
-- identity to key a lockout on the way staffPin.ts locks by app_users.id.
create table if not exists onboarding_pin_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null unique,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table onboarding_pin_attempts enable row level security;

alter table venues add column if not exists created_by_specialist_id uuid references onboarding_specialists(id);

-- Adding a 6th parameter changes bootstrap_owner's signature/identity in
-- Postgres (functions are identified by name + arg types) -- CREATE OR
-- REPLACE with a different arg list creates a new overload rather than
-- replacing the old one, so the stale 5-arg version must be dropped
-- explicitly or both would exist (and PostgREST would refuse to pick
-- between them on an ambiguous call).
drop function if exists public.bootstrap_owner(uuid, text, text, text, text);

create or replace function public.bootstrap_owner(
  p_auth_id uuid,
  p_venue_name text,
  p_venue_slug text,
  p_owner_name text,
  p_owner_email text,
  p_created_by_specialist_id uuid
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

-- Recreating the function resets grants to the Postgres default (PUBLIC
-- has EXECUTE), so this has to be re-revoked exactly like the original
-- 14 Sep fix -- service-role only, by design.
revoke execute on function public.bootstrap_owner(uuid, text, text, text, text, uuid) from anon, authenticated;
