-- Equipment-sourced content pipeline (station QR / troubleshooting work,
-- Correction 2): FAQs and troubleshooting entries per station, sourced from
-- a real manufacturer manual when one can be found, falling back to
-- generic standard-fill content when it can't. Same provenance discipline
-- as module_sections -- never presented as owner-authored, always carries
-- a real citation.
create table public.station_faqs (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  question text not null,
  answer text not null,
  provenance text not null
    check (provenance in ('owner_sourced', 'ai_standard_fill', 'ai_manual_sourced', 'ai_recommended_pending', 'ai_recommended_confirmed')),
  citation text,
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.station_troubleshooting_issues (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  issue_title text not null,
  diagnosis_steps text not null,
  resolution_text text not null,
  escalation_required boolean not null default false,
  provenance text not null
    check (provenance in ('owner_sourced', 'ai_standard_fill', 'ai_manual_sourced', 'ai_recommended_pending', 'ai_recommended_confirmed')),
  citation text,
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.station_faqs.citation is
  'Real source citation (manual title + URL) when provenance is ai_manual_sourced, or "Standard hospitality practice" when ai_standard_fill. Null only for owner_sourced.';
comment on column public.station_troubleshooting_issues.citation is
  'Real source citation (manual title + URL) when provenance is ai_manual_sourced, or "Standard hospitality practice" when ai_standard_fill. Null only for owner_sourced.';

alter table public.station_faqs enable row level security;
alter table public.station_troubleshooting_issues enable row level security;

create policy station_faqs_venue_isolation on public.station_faqs
  for all to authenticated
  using (station_id in (
    select s.id from public.stations s
    join public.app_users au on au.venue_id = s.venue_id
    where au.auth_id = auth.uid()
  ))
  with check (station_id in (
    select s.id from public.stations s
    join public.app_users au on au.venue_id = s.venue_id
    where au.auth_id = auth.uid()
  ));

create policy station_troubleshooting_venue_isolation on public.station_troubleshooting_issues
  for all to authenticated
  using (station_id in (
    select s.id from public.stations s
    join public.app_users au on au.venue_id = s.venue_id
    where au.auth_id = auth.uid()
  ))
  with check (station_id in (
    select s.id from public.stations s
    join public.app_users au on au.venue_id = s.venue_id
    where au.auth_id = auth.uid()
  ));

-- Task 1: distinguish a structurally-inferred document answer (the new
-- second pass -- real content, real citation, but synthesized from
-- reference/bullet-style material rather than lifted from an already-
-- narrative sentence) from a direct verbatim extraction. Both are
-- real/grounded; this just keeps an honest record of which kind of read it
-- was, same reasoning as module_sections.provenance.
alter table public.sop_intake_answers drop constraint sop_intake_answers_answer_source_check;
alter table public.sop_intake_answers
  add constraint sop_intake_answers_answer_source_check
  check (answer_source = any (array['specialist', 'document', 'document_inferred']));
