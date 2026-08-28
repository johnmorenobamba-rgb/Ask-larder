-- Owner dashboard (Block E) foundation schema: everything E3/E5/E6 need that
-- doesn't exist yet. Independent of Block D, safe to apply any time after
-- the schema-drift reconciliation.

-- ============================
-- E3: idempotent cert-expiry nudge tracking. Keyed by (staff_certificate_id,
-- cadence_days) rather than just staff_certificate_id, so each cadence
-- threshold (e.g. 30/14/7 days) gets its own one-time send -- and a renewed
-- certificate (a fresh row, per the existing upload flow) naturally starts a
-- fresh nudge cycle with no reset logic needed.
-- ============================
create table if not exists cert_nudge_log (
  id uuid primary key default gen_random_uuid(),
  staff_certificate_id uuid references staff_certificates(id) on delete cascade,
  cadence_days int not null,
  sent_at timestamptz default now(),
  unique (staff_certificate_id, cadence_days)
);

alter table cert_nudge_log enable row level security;
drop policy if exists venue_isolation_cert_nudge_log on cert_nudge_log;
create policy venue_isolation_cert_nudge_log on cert_nudge_log
  for all using (
    staff_certificate_id in (
      select sc.id from staff_certificates sc
      join app_users au on au.id = sc.user_id
      where au.venue_id = private.auth_venue_id()
    )
  );

-- ============================
-- E5: escalation resolution state. is_escalation itself already exists
-- (differentiator_schema); this adds the open/resolved lifecycle the
-- escalation digest needs, mirroring near_miss_reports.status. No RLS
-- change needed -- the existing venue_isolation_chat_messages "for all"
-- policy already covers UPDATE.
-- ============================
alter table chat_messages add column if not exists escalation_status text default 'open'
  check (escalation_status in ('open','resolved'));

-- ============================
-- E6 prerequisite: near-miss-photos currently has only an INSERT policy
-- (added in qr_versioning_nearmiss) -- the inbox can't display uploaded
-- photos without a SELECT policy too.
-- ============================
drop policy if exists near_miss_photos_venue_isolation_select on storage.objects;
create policy near_miss_photos_venue_isolation_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'near-miss-photos'
    and (storage.foldername(name))[1] = private.auth_venue_id()::text
  );
