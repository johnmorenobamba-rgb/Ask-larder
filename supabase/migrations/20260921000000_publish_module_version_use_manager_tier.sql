-- Suggestion assistant, item 4 (John's review, 21 Sep 2026): publish_module_
-- version() checked role in ('owner','manager') directly against
-- app_users.role, a second, separate authorization check that never got
-- updated when isManagerTier was unified two sessions ago (20 Sep). The
-- route calling this RPC already checks staff.isManagerTier correctly, but
-- the RPC re-checks with the old, narrower logic -- a Head Chef, Sous Chef,
-- or 2IC passes the route's check and then hits this RPC's own exception.
-- Now in this feature's real critical path: approving a suggestion against
-- an already-live module routes through publish-version.
--
-- staff_roles.fallback_tier is the same signal getCurrentStaff() reads to
-- compute isManagerTier (role = 'owner' or 'manager', OR the caller's
-- staff_roles row is fallback_tier = 'authorized') -- reproduced here in
-- SQL since this is a SECURITY DEFINER function with no access to the
-- application's own TypeScript.
create or replace function public.publish_module_version(p_module_id uuid, p_changelog text default null::text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_caller_role text;
  v_caller_venue_id uuid;
  v_caller_fallback_tier text;
  v_new_version int;
  v_version_id uuid;
begin
  select au.role, au.venue_id, sr.fallback_tier
    into v_caller_role, v_caller_venue_id, v_caller_fallback_tier
    from app_users au
    left join staff_roles sr on sr.id = au.staff_role_id
    where au.auth_id = auth.uid();

  if v_caller_role is null
     or (v_caller_role not in ('owner', 'manager') and coalesce(v_caller_fallback_tier, 'frontline') <> 'authorized') then
    raise exception 'Not authorized to publish module versions.';
  end if;

  update modules set version = version + 1
    where id = p_module_id and venue_id = v_caller_venue_id
    returning version into v_new_version;

  if v_new_version is null then
    raise exception 'Module not found in your venue.';
  end if;

  insert into module_versions (module_id, version, changelog)
    values (p_module_id, v_new_version, p_changelog)
    returning id into v_version_id;

  return v_version_id;
end;
$function$;
