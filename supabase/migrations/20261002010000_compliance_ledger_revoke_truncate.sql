-- Compliance Forms 0b follow-up (pre-approved by John, 2 Oct 2026): the ledger can
-- no longer be truncated by service_role. After 20261002000000, service_role had
-- lost INSERT and UPDATE on compliance_form_submissions but still held the
-- default TRUNCATE (plus REFERENCES and TRIGGER). TRUNCATE is not a row
-- operation, so neither RLS nor the immutability trigger would stop it.
-- service_role keeps SELECT and DELETE (test cleanup, venue cascade runs as the
-- table owner). The application never truncates anything.
--
-- ROLLBACK:
--   grant truncate, references, trigger on compliance_form_submissions to service_role;

revoke truncate, references, trigger on compliance_form_submissions from service_role;
