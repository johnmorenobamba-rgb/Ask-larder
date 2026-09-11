-- Block R -- curated SOP documents (cached, not generated on view) and the
-- edit-request flow behind it.

-- R1 finding: nothing anywhere records who approved a module or when --
-- approve/route.ts only ever flipped status. Additive, nullable columns;
-- existing modules simply show "Not recorded" in the SOP document header
-- rather than a backfilled/fabricated value.
alter table modules add column if not exists approved_by uuid references app_users(id);
alter table modules add column if not exists approved_at timestamptz;

-- One cached curated document per module (module_id unique -- "Regenerate"
-- is an upsert on this same row, not a new version). content holds the
-- distilled Part 0 shape (purpose/scope/who performs it/materials/procedure/
-- safety-critical callouts/definition of done/escalation contact) as jsonb
-- so the view/print renderer and the "Print all" assembler both read
-- structured fields, not markdown they'd have to re-parse.
-- generated_from_hash is a sha256 of the source module_sections content at
-- generation time -- lets a future "this SOP may be stale" check compare
-- without re-running the model on every dashboard view.
create table sop_documents (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null unique references modules(id) on delete cascade,
  content jsonb not null,
  generated_at timestamptz not null default now(),
  generated_from_hash text not null
);
alter table sop_documents enable row level security;
create policy venue_isolation_sop_documents on sop_documents
  for all using (module_id in (select id from modules where venue_id = private.auth_venue_id()));

-- The first real mechanism behind the $25/edit pricing line -- status is a
-- real tracked field (open/contacted/resolved), not just an append-only log.
create table sop_edit_requests (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  module_id uuid not null references modules(id) on delete cascade,
  requester uuid references app_users(id),
  description text not null,
  status text not null default 'open' check (status in ('open', 'contacted', 'resolved')),
  created_at timestamptz not null default now()
);
alter table sop_edit_requests enable row level security;
create policy venue_isolation_sop_edit_requests on sop_edit_requests
  for all using (venue_id = private.auth_venue_id());
