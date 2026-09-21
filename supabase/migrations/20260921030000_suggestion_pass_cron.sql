-- Schedules the weekly suggestion pass across every venue, via pg_cron +
-- pg_net, matching the cert-nudge/weekly-digest precedent -- with one
-- deliberate difference: there is no Deno Edge Function here. runSuggestionPass
-- (src/lib/suggestions/runSuggestionPass.ts) is real Node/Next.js code --
-- Anthropic SDK calls, @/lib/... imports, server-only guards -- and hand
-- duplicating that clustering + drafting pipeline into Deno (the way
-- cert-nudge/weekly-digest hand-duplicate their much smaller amount of logic)
-- would be substantial, easy-to-drift duplication of exactly the kind those
-- two functions' own comments already flag as a manual-sync burden. Instead
-- pg_net posts straight to a new, secret-protected Next.js route
-- (src/app/api/internal/suggestions/run-all/route.ts) that runs server-side
-- with the service-role admin client and calls the real pipeline directly.
--
-- Scheduled for Sunday 12:00 UTC -- ten hours clear of weekly-digest (Sunday
-- 22:00 UTC) and clear of cert-nudge's daily 22:00 UTC run, since this job
-- makes real per-venue Claude API calls and needs to finish well before the
-- digest reads that week's content_suggestions state.
--
-- Idempotency has two layers. This table is the job-level guard (skip a
-- venue already run this week, so an accidental double-fire doesn't burn
-- Claude tokens twice); runSuggestionPass's own overlapsExisting() check
-- (unchanged, see runSuggestionPass.ts) is the content-level guard that
-- actually stops a dismissed suggestion resurrecting or a pending one
-- duplicating. Insert-after-success only, same as cert_nudge_log, so a
-- failed run is naturally retried the following week rather than silently
-- marked done.
--
-- One-time manual step required before this job can authenticate (run once
-- via the Supabase SQL editor, not committed anywhere -- same pattern as
-- cert-nudge's anon_key):
--   select vault.create_secret('<the generated cron secret>', 'suggestion_pass_cron_secret');
-- The same value must also be set as SUGGESTION_PASS_CRON_SECRET in Vercel
-- (production + preview) so the route can verify the Authorization header.

create table public.suggestion_pass_runs (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  run_week date not null,
  created_at timestamptz not null default now(),
  unique (venue_id, run_week)
);

comment on table public.suggestion_pass_runs is
  'Job-level idempotency guard for the weekly suggestion-pass cron -- one row per venue per ISO week, inserted only after a successful run. Service-role only, no authenticated policy; this is internal scheduling bookkeeping, not venue-facing data.';

alter table public.suggestion_pass_runs enable row level security;
-- Deliberately zero policies for authenticated/anon -- only the service-role
-- admin client (src/lib/supabase/admin.ts) ever touches this table, from the
-- internal cron route. RLS on with no policy is the closed-by-default state
-- CLAUDE.md requires for every table.

select cron.schedule(
  'suggestion-pass-weekly',
  '0 12 * * 0', -- Sunday 12:00 UTC
  $$
  select net.http_post(
    url := 'https://asklarder.com.au/api/internal/suggestions/run-all',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'suggestion_pass_cron_secret')
    )
  );
  $$
);
