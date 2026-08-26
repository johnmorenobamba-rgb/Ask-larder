-- Baseline migration for Ask Larder, hand-authored to match the live
-- larder-dev project (kkgnjbqmhagspeomlzav) exactly, confirmed via direct
-- introspection (pg_policies, pg_get_functiondef, pg_constraint, pg_extension)
-- rather than `supabase db pull`, since the CLI needs a DB password not
-- available this session. This captures Tech Bible §15's original schema
-- plus fixes/additions made in the prior live session: venues.slug,
-- app_users.staff_role_id, the PIN-auth columns, the private.auth_venue_id()
-- helper (moved out of PostgREST's exposed schema, pinned search_path),
-- public.venue_roster(), and the pgvector/pgcrypto extensions relocated to
-- their own `extensions` schema.

-- ============================
-- Extensions
-- ============================
create schema if not exists extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ============================
-- Private schema (not exposed via PostgREST)
-- ============================
create schema if not exists private;

-- ============================
-- Tables
-- ============================

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  branding jsonb default '{}'::jsonb,
  multi_venue_group_id uuid,
  monthly_tier text default 'single',
  cert_nudge_cadence int[] default '{30,14,7}',
  created_at timestamptz default now()
);

create table if not exists staff_roles (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  name text not null
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  venue_id uuid references venues(id) on delete cascade,
  role text not null check (role in ('owner','manager','staff')),
  name text not null,
  email text,
  phone text,
  staff_role_id uuid references staff_roles(id),
  pin_hash text,
  pin_set_at timestamptz,
  pin_failed_attempts int default 0,
  pin_locked_until timestamptz,
  created_at timestamptz default now()
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  role_id uuid references staff_roles(id),
  title text not null,
  status text default 'draft' check (status in ('draft','pending_approval','approved','live')),
  version int default 1,
  created_from_sop_ids uuid[],
  created_at timestamptz default now()
);

create table if not exists module_sections (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  section_order int not null,
  content text,
  photo_refs text[],
  video_ref text
);

create table if not exists check_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  question text not null,
  expected_answer_context text
);

create table if not exists staff_module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  module_id uuid references modules(id) on delete cascade,
  status text default 'not_started' check (status in ('not_started','in_progress','completed')),
  completed_at timestamptz,
  esignature_id uuid
);

create table if not exists esignatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  module_id uuid references modules(id) on delete cascade,
  typed_name text not null,
  signed_at timestamptz default now(),
  ip_address text,
  device_info text
);

create table if not exists certificate_types (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  name text not null
);

create table if not exists staff_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  certificate_type_id uuid references certificate_types(id),
  photo_ref text,
  issued_date date,
  expiry_date date,
  status text default 'valid' check (status in ('valid','expiring','expired'))
);

create table if not exists sop_source_documents (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  file_ref text,
  raw_content text,
  uploaded_at timestamptz default now(),
  processed_status text default 'pending'
);

create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  source_module_id uuid references modules(id),
  content_chunk text not null,
  embedding extensions.vector(1024)
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  venue_id uuid references venues(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  message text not null,
  retrieved_chunk_ids uuid[],
  created_at timestamptz default now()
);

create table if not exists edit_requests (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  request_month date not null,
  requested_by uuid references app_users(id),
  description text,
  created_at timestamptz default now()
);

-- ============================
-- Helper function (private schema — not exposed via PostgREST)
-- ============================
create or replace function private.auth_venue_id() returns uuid
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select venue_id from app_users where auth_id = auth.uid()
$$;

-- ============================
-- Staff PIN-login lookup (anon-callable, name/branding only — no PINs/hashes/emails)
-- ============================
create or replace function public.venue_roster(p_slug text) returns jsonb
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select jsonb_build_object(
    'venue', jsonb_build_object('id', v.id, 'name', v.name, 'branding', v.branding),
    'staff', coalesce(
      (select jsonb_agg(jsonb_build_object('id', u.id, 'name', u.name) order by u.name)
       from app_users u
       where u.venue_id = v.id and u.role = 'staff'),
      '[]'::jsonb
    )
  )
  from venues v
  where v.slug = p_slug;
$$;

grant execute on function public.venue_roster(text) to anon, authenticated;

-- ============================
-- Row Level Security (multi-tenant isolation)
-- ============================

alter table venues enable row level security;
drop policy if exists venue_isolation_venues on venues;
create policy venue_isolation_venues on venues
  for all using (id = private.auth_venue_id());

alter table staff_roles enable row level security;
drop policy if exists venue_isolation_staff_roles on staff_roles;
create policy venue_isolation_staff_roles on staff_roles
  for all using (venue_id = private.auth_venue_id());

alter table app_users enable row level security;
drop policy if exists venue_isolation_app_users on app_users;
create policy venue_isolation_app_users on app_users
  for all using (venue_id = private.auth_venue_id());

alter table modules enable row level security;
drop policy if exists venue_isolation_modules on modules;
create policy venue_isolation_modules on modules
  for all using (venue_id = private.auth_venue_id());

alter table module_sections enable row level security;
drop policy if exists venue_isolation_module_sections on module_sections;
create policy venue_isolation_module_sections on module_sections
  for all using (module_id in (select id from modules where venue_id = private.auth_venue_id()));

alter table check_questions enable row level security;
drop policy if exists venue_isolation_check_questions on check_questions;
create policy venue_isolation_check_questions on check_questions
  for all using (module_id in (select id from modules where venue_id = private.auth_venue_id()));

alter table staff_module_progress enable row level security;
drop policy if exists venue_isolation_staff_module_progress on staff_module_progress;
create policy venue_isolation_staff_module_progress on staff_module_progress
  for all using (user_id in (select id from app_users where venue_id = private.auth_venue_id()));

alter table esignatures enable row level security;
drop policy if exists venue_isolation_esignatures on esignatures;
create policy venue_isolation_esignatures on esignatures
  for all using (user_id in (select id from app_users where venue_id = private.auth_venue_id()));

alter table certificate_types enable row level security;
drop policy if exists venue_isolation_certificate_types on certificate_types;
create policy venue_isolation_certificate_types on certificate_types
  for all using (venue_id = private.auth_venue_id());

alter table staff_certificates enable row level security;
drop policy if exists venue_isolation_staff_certificates on staff_certificates;
create policy venue_isolation_staff_certificates on staff_certificates
  for all using (user_id in (select id from app_users where venue_id = private.auth_venue_id()));

alter table sop_source_documents enable row level security;
drop policy if exists venue_isolation_sop_source_documents on sop_source_documents;
create policy venue_isolation_sop_source_documents on sop_source_documents
  for all using (venue_id = private.auth_venue_id());

alter table knowledge_chunks enable row level security;
drop policy if exists venue_isolation_knowledge_chunks on knowledge_chunks;
create policy venue_isolation_knowledge_chunks on knowledge_chunks
  for all using (venue_id = private.auth_venue_id());

alter table chat_messages enable row level security;
drop policy if exists venue_isolation_chat_messages on chat_messages;
create policy venue_isolation_chat_messages on chat_messages
  for all using (venue_id = private.auth_venue_id());

alter table edit_requests enable row level security;
drop policy if exists venue_isolation_edit_requests on edit_requests;
create policy venue_isolation_edit_requests on edit_requests
  for all using (venue_id = private.auth_venue_id());

-- ============================
-- Storage
-- ============================
insert into storage.buckets (id, name, public)
values ('certs', 'certs', false)
on conflict (id) do nothing;
