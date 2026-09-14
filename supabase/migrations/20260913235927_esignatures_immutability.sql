-- Real bug found live (data-provenance/output-verification audit, 14 Sep
-- 2026): esignatures had a single ALL-command RLS policy scoped only to
-- venue isolation, with no restriction on UPDATE/DELETE. Confirmed
-- exploitable: an ordinary authenticated staff session could PATCH its own
-- (or, since the qual only checks venue not user, any same-venue staff
-- member's) esignature row directly via the REST API and silently rewrite
-- typed_name/signed_at/ip_address/device_info. This violates CLAUDE.md's
-- non-negotiable: e-signatures are a comprehension attestation and must be
-- an immutable record.
--
-- The only real write path (complete_onboarding_signature) is a
-- SECURITY DEFINER function owned by postgres (rolbypassrls = true), so it
-- never needed RLS permission to INSERT in the first place -- removing
-- direct client write access here breaks nothing real.
drop policy if exists venue_isolation_esignatures on public.esignatures;

create policy esignatures_venue_select on public.esignatures
  for select
  to authenticated
  using (user_id in (select id from app_users where venue_id = private.auth_venue_id()));

-- No insert/update/delete policy for authenticated/public at all -- the
-- absence of a policy for a command means RLS denies it outright, which is
-- exactly the "immutable once written" guarantee this table needs. The
-- SECURITY DEFINER RPC (rolbypassrls) remains the only write path.
