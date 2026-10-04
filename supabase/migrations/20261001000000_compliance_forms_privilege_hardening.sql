-- P1 from the 1 Oct 2026 Compliance Forms 0a report (approved by John).
-- Supabase's default privileges gave anon and authenticated full DML plus
-- TRUNCATE, TRIGGER and REFERENCES on every new public table. RLS and the
-- immutability trigger already blocked row changes, but TRUNCATE is not a row
-- operation (no RLS, no row trigger), so the "insert-only" ledger was weaker
-- than intended. This removes the privileges that should never have existed.
--
-- compliance_form_submissions: authenticated keeps SELECT and the column-level
-- INSERT grant from 20260930000000, nothing else. anon gets nothing.
-- venue_compliance_settings / venue_refrigeration_units: anon gets nothing;
-- authenticated keeps SELECT, INSERT and UPDATE (the wizard writes them) and
-- loses DELETE, TRUNCATE, REFERENCES and TRIGGER (units are retired with
-- is_active, never deleted).
--
-- service_role and the table owner are untouched, so migrations, the venue
-- ON DELETE CASCADE and the service-role cleanup path keep working.

revoke all on compliance_form_submissions from anon, public;
revoke update, delete, truncate, trigger, references on compliance_form_submissions from authenticated;

revoke all on venue_compliance_settings from anon, public;
revoke delete, truncate, references, trigger on venue_compliance_settings from authenticated;

revoke all on venue_refrigeration_units from anon, public;
revoke delete, truncate, references, trigger on venue_refrigeration_units from authenticated;
