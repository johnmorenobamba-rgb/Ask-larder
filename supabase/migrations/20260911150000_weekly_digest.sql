-- Weekly "what staff actually asked" owner report, 11 Sep 2026.
--
-- chat_messages stores a user question and the assistant's reply as two
-- separate rows with no link between them -- confirmed live: the existing
-- Escalations page (src/app/(owner)/[venueSlug]/owner/(protected)/
-- escalations/page.tsx) already wants to show what was asked but can only
-- show the assistant row's own text (the refusal wording, e.g. "Ask your
-- supervisor for assistance..."), never the actual question, because
-- nothing ties the two rows together. exchange_id fixes this for both the
-- weekly report and, going forward, that same gap on the Escalations page.
--
-- out_of_scope was returned by the ask-larder API (src/app/api/staff/
-- ask-larder/route.ts) from the moment it was built but never persisted --
-- only is_escalation was. It's the more useful signal for this report
-- specifically: an out-of-scope question is a direct, actionable pointer
-- at a real gap in a venue's SOP content, which is exactly what this
-- report exists to surface.
alter table chat_messages add column if not exists exchange_id uuid;
alter table chat_messages add column if not exists out_of_scope boolean;

create index if not exists chat_messages_exchange_id_idx on chat_messages (exchange_id);

-- Schedules the weekly-digest Edge Function, following the exact pattern
-- already established for cert-nudge (20260828070000_cert_nudge_cron.sql)
-- -- same Vault-backed anon-key lookup, same reasoning for not hardcoding
-- a key in committed SQL.
select cron.schedule(
  'weekly-digest-report',
  '0 22 * * 0', -- Sunday 22:00 UTC = Monday 08:00 AEST / 09:00 AEDT, so the report is waiting at the start of the trading week, not buried mid-week
  $$
  select net.http_post(
    url := 'https://kkgnjbqmhagspeomlzav.supabase.co/functions/v1/weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
    )
  );
  $$
);
