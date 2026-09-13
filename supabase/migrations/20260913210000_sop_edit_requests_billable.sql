-- sop_edit_requests had no way to tell a free edit apart from a billable
-- one, even though the pricing schedule (scripts/client-documents/
-- buildPricingSchedule.mjs) promises 5 free content edits per venue per
-- month and $15 AUD each beyond that. Nothing enforced or recorded which
-- bucket a given request fell into -- the founder had to manually count
-- rows/emails to know what to invoice. `billable` is set once at insert
-- time (see request-edit/route.ts) and never recomputed, so it stays a
-- stable historical record even if a later request that month is deleted.
alter table public.sop_edit_requests
  add column billable boolean not null default false;

comment on column public.sop_edit_requests.billable is
  'True if this was the 6th+ edit request for the venue in its calendar month (beyond the 5 free included per the pricing schedule). Computed once at insert time, not derived live.';
