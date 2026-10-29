-- Venue iPad mode (Coachman's Arms first, behind a per venue setting).
--
-- A shared venue iPad signs in as a device account: a minimal app_users row with role 'device', no PIN and no staff role.
-- It can read venue content at the lowest access level (modules with no role restriction, station FAQs and
-- troubleshooting) and use Ask Larder as a non manager tier asker. Everything that records WHO did something (module
-- completion, signatures, certs, forms, near misses) is refused for the device account in the API routes: a person
-- signs in with their own PIN for those.
--
-- The iPad stays paired through an httpOnly cookie holding a random token. Only its SHA 256 hash is stored here.
-- venue_devices has row level security on and a read policy for owner and manager of the same venue. There are no write
-- policies: pairing and revoking go through the server with the service role.
--
-- ROLLBACK: drop table public.venue_devices; alter table public.venues drop column ipad_mode_enabled;
-- delete from public.app_users where role = 'device'; restore the role check without 'device'.

alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users add constraint app_users_role_check check (role in ('owner', 'manager', 'staff', 'device'));

alter table public.venues add column if not exists ipad_mode_enabled boolean not null default false;

create table if not exists public.venue_devices (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'Venue iPad',
  paired_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);
create index if not exists venue_devices_venue_idx on public.venue_devices (venue_id);

alter table public.venue_devices enable row level security;

drop policy if exists venue_devices_select_owner_manager on public.venue_devices;
create policy venue_devices_select_owner_manager on public.venue_devices
  for select to authenticated
  using (venue_id = private.auth_venue_id() and private.auth_role() in ('owner', 'manager'));

update public.venues set ipad_mode_enabled = true where slug = 'coachmans-arms-wizard';
