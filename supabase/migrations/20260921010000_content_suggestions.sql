-- Suggestion assistant (Part 2 design, confirmed by John 21 Sep 2026): turns
-- signals Larder already has (repeated uncovered questions, escalation
-- patterns, near-miss patterns) into concrete, evidence-backed draft
-- suggestions. Deliberately does NOT touch topic_gap_reports/
-- topic_gap_checklists -- that agent stays out of scope for this pass per
-- John's explicit instruction (dormant, proven only against test venues).

-- Optional per-venue override for the proportion-based default thresholds
-- computed in application code (src/lib/suggestions/thresholds.ts). NULL
-- for every venue until a settings UI exists to edit this -- the
-- proportion-of-active-staff default is what actually makes the feature
-- fire on a small venue, this column just leaves room for a venue to be
-- tuned individually later without a schema change.
-- Shape when set: {"repeated_gap_staff_fraction": 0.4, "repeated_gap_min_count": 2,
--   "escalation_min_count": 3, "near_miss_min_count": 2}
alter table public.venues add column content_suggestion_thresholds jsonb null;

create table public.content_suggestions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  signal_type text not null check (signal_type in ('repeated_gap', 'escalation_pattern', 'near_miss_pattern')),
  -- Structured evidence, always shown in the UI, never an unexplained
  -- recommendation: which real rows fed this, and for escalation/near-miss
  -- clusters (a model classification pass, not keyword matching -- John's
  -- review, 21 Sep), which specific reports got grouped together and why,
  -- so a bad grouping is visible and correctable rather than a hidden
  -- judgment call baked into a count. Shape varies by signal_type; always
  -- includes a "source_ids" array (chat_messages.id or
  -- near_miss_reports.id) used for dismissal-fingerprint overlap checks
  -- (see runSuggestionPass.ts) so a dismissed pattern doesn't regenerate
  -- identically next cycle.
  evidence jsonb not null,
  headline text not null,
  reasoning text not null,
  -- Null target_module_id means this venue has no existing module this
  -- topic genuinely belongs inside -- the assistant says that plainly
  -- (CLAUDE.md: never patches a real intake gap with inference) rather than
  -- drafting content with nowhere real to go. blocked_reason explains WHY
  -- there's no proposed_content when it's null: no_target_module (a
  -- genuine content gap, not something to draft around) or
  -- credential_reference (moduleContentReferencesCredential flagged the
  -- drafted content before it was ever inserted -- this needs a real
  -- role-restriction decision, never a normal draft).
  target_module_id uuid references public.modules(id) on delete set null,
  proposed_topic_key text,
  proposed_content text,
  blocked_reason text check (blocked_reason in ('no_target_module', 'credential_reference')),
  dismissed_reason text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.app_users(id)
);

comment on table public.content_suggestions is
  'One row per detected pattern (repeated out-of-scope question cluster, escalation cluster, or near-miss cluster). Always a draft -- approving creates/updates a module_sections row with provenance ai_recommended_pending, the exact same approval gate and provenance-badge language as any other AI-suggested content. Never auto-published.';

alter table public.content_suggestions enable row level security;

create policy content_suggestions_venue_isolation on public.content_suggestions
  for all to authenticated
  using (venue_id in (select app_users.venue_id from public.app_users where app_users.auth_id = auth.uid()))
  with check (venue_id in (select app_users.venue_id from public.app_users where app_users.auth_id = auth.uid()));

create index content_suggestions_venue_status_idx on public.content_suggestions (venue_id, status);
