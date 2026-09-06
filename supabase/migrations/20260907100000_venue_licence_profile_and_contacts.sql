-- Block P2 gaps #1 and #7, closed 7 Sep 2026. Both were found by walking a
-- real bar through the onboarding flow: there was nowhere to persist a
-- venue's own licence/address/ABN data (the root branch of the entire
-- bar-specific flow), and nowhere to persist Business Continuity's
-- emergency contacts (tradespeople, insurer, regulator).

create table venue_licence_profile (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade unique,
  state text,
  address text,
  abn text,
  licence_type text,
  licence_number text,
  licensed_capacity int,
  approved_trading_hours jsonb default '{}',
  late_night_endorsement boolean default false,
  conditions text,
  created_at timestamptz default now()
);
alter table venue_licence_profile enable row level security;
create policy venue_isolation_venue_licence_profile on venue_licence_profile
  for all using (venue_id = private.auth_venue_id());

-- General enough to absorb gap #2 (security-firm contact) and gap #4
-- (hazard-escalation contact) as well, rather than three narrow tables,
-- per the P2 document's own recommendation.
create table venue_contacts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references venues(id) on delete cascade,
  contact_type text, -- e.g. electrician | plumber | locksmith | insurer | security_firm | regulator | escalation
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);
alter table venue_contacts enable row level security;
create policy venue_isolation_venue_contacts on venue_contacts
  for all using (venue_id = private.auth_venue_id());
