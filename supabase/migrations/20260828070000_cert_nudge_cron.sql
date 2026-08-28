-- Schedules the cert-nudge Edge Function daily via pg_cron + pg_net.
--
-- Deliberately does NOT hardcode a Supabase key anywhere in this file --
-- committed migrations are permanent git history, not a place for secrets,
-- even ones already meant to be public like the anon key. Instead it reads
-- the key at call time from Supabase Vault (supabase_vault, enabled by
-- default on every project), by name.
--
-- One-time manual step required before this job can actually authenticate
-- (run once via the Supabase SQL editor, not committed anywhere):
--   select vault.create_secret('<the project''s anon/publishable key>', 'anon_key');
-- The RESEND_API_KEY the function itself needs is a separate function
-- secret (`supabase secrets set RESEND_API_KEY=...`), not a Vault entry.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'cert-nudge-daily',
  '0 22 * * *', -- 22:00 UTC = 08:00 AEST / 09:00 AEDT, before a typical venue's morning shift
  $$
  select net.http_post(
    url := 'https://kkgnjbqmhagspeomlzav.supabase.co/functions/v1/cert-nudge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    )
  );
  $$
);
