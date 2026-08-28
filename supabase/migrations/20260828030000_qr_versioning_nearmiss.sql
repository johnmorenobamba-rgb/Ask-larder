-- Phase 4a: C9 (SOP versioning + re-acknowledgement) and C10 (near-miss
-- quick-report) support. Schema for module_versions/staff_module_acknowledgements/
-- stations/near_miss_reports and their RLS policies already exist live
-- (20260827060000_differentiator_schema.sql) — this migration adds what's
-- still genuinely missing: the version-publish RPC and storage policies for
-- the near-miss-photos bucket (bucket exists live but has zero policies,
-- currently unusable via the client SDK).

-- ============================
-- C9: publish a new module version (owner/manager only)
-- ============================
create or replace function public.publish_module_version(
  p_module_id uuid,
  p_changelog text default null
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_caller_role text;
  v_caller_venue_id uuid;
  v_new_version int;
  v_version_id uuid;
begin
  select role, venue_id into v_caller_role, v_caller_venue_id
    from app_users where auth_id = auth.uid();

  if v_caller_role is null or v_caller_role not in ('owner', 'manager') then
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
$$;

revoke execute on function public.publish_module_version(uuid, text) from public;
grant execute on function public.publish_module_version(uuid, text) to authenticated;

alter table module_versions
  add constraint module_versions_module_id_version_key unique (module_id, version);

-- ============================
-- C10: near-miss-photos storage policies
-- ============================
drop policy if exists near_miss_photos_venue_isolation_insert on storage.objects;
create policy near_miss_photos_venue_isolation_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'near-miss-photos'
    and (storage.foldername(name))[1] = private.auth_venue_id()::text
  );
