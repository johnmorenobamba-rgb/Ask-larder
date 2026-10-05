-- Default privileges (hardening-3, B3). State on 5 Oct 2026 (pg_default_acl, postgres role, schema public): new tables and new
-- sequences already grant nothing to anon (20261005050000, 20261005020000). New functions had an explicit default entry
-- (postgres=X, anon=X, authenticated=X, service_role=X). This removes the explicit anon entry.
-- CORRECTION found while testing: this does NOT stop anon executing a new function, because Postgres also grants EXECUTE on every
-- new function to PUBLIC (proacl contains =X/postgres) and a schema level default privilege cannot remove that; only the global
-- form (without IN SCHEMA) can, and that would also strip PUBLIC execute from future helper functions in other schemas (private.*)
-- that policies call, so it is deliberately NOT done. The guard for functions is tests/sql/anon-allowlist.sql check 3, which fails
-- if any function in public is anon executable beyond venue_roster(text). Every migration that creates a function must revoke
-- execute from public (the existing migrations do).
-- Roles whose defaults cannot be changed from here: supabase_admin (public schema tables, sequences and functions still grant anon;
-- ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin returns 42501 permission denied to change default privileges).
-- ADDITIVE and tiny: only the explicit default entry for FUTURE functions created by postgres changes. No existing object changes.
--
-- ROLLBACK:
--   alter default privileges for role postgres in schema public grant execute on functions to anon;

alter default privileges for role postgres in schema public revoke execute on functions from anon;
