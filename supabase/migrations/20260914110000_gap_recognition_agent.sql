-- Gap-Recognition Agent (standing pipeline step, per the Decision Log
-- correction: runs on every module for every venue, always -- not a
-- one-off remediation). Two tables: a versioned, checklist reference
-- (topic_gap_checklists, seeded from real compliance/operations knowledge,
-- not invented per-run) and a persisted log of what the agent found each
-- time it runs (topic_gap_reports). Plus provenance on module_sections so
-- the owner-approval view can show what's theirs vs. what Larder proposed,
-- per CLAUDE.md's liability model.

alter table public.module_sections
  add column provenance text not null default 'owner_sourced'
    check (provenance in ('owner_sourced', 'ai_standard_fill', 'ai_manual_sourced', 'ai_recommended_pending', 'ai_recommended_confirmed'));

comment on column public.module_sections.provenance is
  'owner_sourced: from the owner''s own intake material. ai_standard_fill: generic industry/compliance-standard content the gap-recognition agent scaffolded. ai_manual_sourced: equipment content grounded in a real manufacturer manual (station QR pipeline). ai_recommended_pending: an AI-suggested default not yet confirmed by the owner -- must not be treated as approved content. ai_recommended_confirmed: the same, after explicit owner confirmation.';

create table public.topic_gap_checklists (
  id uuid primary key default gen_random_uuid(),
  topic_key text not null unique,
  title text not null,
  venue_type text,
  sub_procedures jsonb not null,
  source_notes text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.topic_gap_checklists is
  'Reference checklist per topic: the real sub-procedures a competent SOP on that topic must address. Seeded from grounded compliance/operations knowledge (Food Standards Code, WorkSafe, standard hospitality practice), not derived ad hoc by the agent per run. version bumps whenever the checklist itself is revised, which is what triggers a re-check of already-live content for that topic.';
comment on column public.topic_gap_checklists.sub_procedures is
  'jsonb array of {key, label, why_it_matters, default_mechanism} -- default_mechanism is one of standard_fill | owner_question | recommendation, set when the checklist is authored, not decided fresh by the agent each run.';

create table public.topic_gap_reports (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  topic_key text not null,
  checklist_version integer not null,
  sub_procedure_key text not null,
  standard_coverage text not null check (standard_coverage in ('covered', 'partial', 'missing')),
  venue_specific_coverage text not null check (venue_specific_coverage in ('covered', 'partial', 'missing')),
  evidence_quote text,
  recommended_action text not null,
  recommended_mechanism text not null check (recommended_mechanism in ('none', 'standard_fill', 'owner_question', 'recommendation')),
  material_source text not null check (material_source in ('raw_intake_answers', 'current_module_content')),
  created_at timestamptz not null default now()
);

comment on table public.topic_gap_reports is
  'One row per (module, sub-procedure) per agent run -- a durable log of every gap-recognition pass, not just the latest. material_source records whether the agent checked raw pre-draft intake answers (the live pipeline''s real hookup for new content) or the module''s current drafted content (the fallback used for re-checking already-seeded/legacy modules with no sop_intake_answers on file, e.g. Two Fires).';

alter table public.topic_gap_checklists enable row level security;
alter table public.topic_gap_reports enable row level security;

-- Checklists are a shared reference, not tenant data -- every authenticated
-- venue session can read them (needed to know what "done" means for a
-- topic), only service-role writes them (founder-curated, not owner-edited).
create policy topic_gap_checklists_select on public.topic_gap_checklists
  for select to authenticated using (true);

-- Reports ARE tenant data -- scoped like every other venue-owned table.
create policy topic_gap_reports_venue_isolation on public.topic_gap_reports
  for all to authenticated
  using (venue_id in (select app_users.venue_id from public.app_users where app_users.auth_id = auth.uid()))
  with check (venue_id in (select app_users.venue_id from public.app_users where app_users.auth_id = auth.uid()));
