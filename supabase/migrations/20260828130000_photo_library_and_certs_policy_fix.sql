-- Personal Dashboard / Owner Admin Panel spec: photo library (tagged asset
-- bank, upload once, reuse everywhere a photo is needed -- e.g. a station
-- photo tagged for a module can also serve as a bento dashboard Continue-
-- card thumbnail). Also fixes a live gap found while building this: the
-- `certs` bucket has had a bucket-creation row since the baseline schema
-- but never got storage.objects RLS policies (unlike near-miss-photos,
-- which got both insert and select in separate follow-up migrations) --
-- cert photo uploads/reads have been silently blocked by RLS this whole
-- time. Same insert+select pattern as near-miss-photos, applied to both.

-- ============================
-- 1. Fix: certs bucket storage policies (was missing entirely)
-- ============================
drop policy if exists certs_venue_isolation_insert on storage.objects;
create policy certs_venue_isolation_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'certs'
    and (storage.foldername(name))[1] = private.auth_venue_id()::text
  );

drop policy if exists certs_venue_isolation_select on storage.objects;
create policy certs_venue_isolation_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'certs'
    and (storage.foldername(name))[1] = private.auth_venue_id()::text
  );

-- ============================
-- 2. photo_library table
-- ============================
create table if not exists photo_library (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  storage_path text not null,
  tag text not null check (tag in ('station', 'module', 'general', 'hero')),
  station_id uuid references stations(id) on delete set null,
  module_id uuid references modules(id) on delete set null,
  uploaded_by uuid references app_users(id) on delete set null,
  created_at timestamptz default now()
);

alter table photo_library enable row level security;

drop policy if exists photo_library_venue_select on photo_library;
create policy photo_library_venue_select on photo_library
  for select to authenticated
  using (venue_id = private.auth_venue_id());

-- Owner/manager-only writes, matching the write-policy convention already
-- locked for modules/module_sections/check_questions/stations.
drop policy if exists photo_library_owner_write on photo_library;
create policy photo_library_owner_write on photo_library
  for all to authenticated
  using (
    venue_id = private.auth_venue_id()
    and exists (
      select 1 from app_users au
      where au.auth_id = auth.uid() and au.role in ('owner', 'manager')
    )
  )
  with check (
    venue_id = private.auth_venue_id()
    and exists (
      select 1 from app_users au
      where au.auth_id = auth.uid() and au.role in ('owner', 'manager')
    )
  );

-- ============================
-- 3. photo-library storage bucket + policies
-- ============================
insert into storage.buckets (id, name, public)
values ('photo-library', 'photo-library', false)
on conflict (id) do nothing;

drop policy if exists photo_library_bucket_venue_isolation_insert on storage.objects;
create policy photo_library_bucket_venue_isolation_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photo-library'
    and (storage.foldername(name))[1] = private.auth_venue_id()::text
  );

drop policy if exists photo_library_bucket_venue_isolation_select on storage.objects;
create policy photo_library_bucket_venue_isolation_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photo-library'
    and (storage.foldername(name))[1] = private.auth_venue_id()::text
  );

-- ============================
-- 4. app_users.voice_output_enabled -- Settings screen's TTS toggle, off
--    by default per the Ask Larder spec.
-- ============================
alter table app_users add column if not exists voice_output_enabled boolean not null default false;
