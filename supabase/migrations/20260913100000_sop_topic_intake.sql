-- Block T -- wizard-directed SOP determination and guided intake. Replaces
-- SopIntakeHub's blank "Section content" textarea with a pipeline that
-- decides which of PART_B_TOPICS a venue actually needs, then asks concrete
-- guided questions per topic, then generates the module and the Block R
-- sop_documents row from those structured answers -- not from prose a
-- specialist composed with no prompting.

-- Lets go-live tell a curation-populated sop_documents row apart from one
-- generateSopDocument() extracted from freeform module_sections prose, so
-- go-live's existing unconditional call to generateSopDocument() can skip
-- re-deriving (and downgrading) a row curation already populated from
-- richer structured intake answers. Additive; every existing reader of
-- sop_documents only selects content/generated_at/module_id.
alter table sop_documents add column if not exists generated_via text not null default 'legacy_extraction'
  check (generated_via in ('legacy_extraction', 'intake_curation'));

-- T1's output -- one row per venue+topic recording whether this venue needs
-- that PART_B_TOPICS entry, and how confidently. confidence='low' is the
-- "flag for a one-tap specialist confirm rather than deciding unilaterally"
-- row the spec requires -- the UI renders these as a confirm card instead of
-- silently applying the rule/AI pass's guess. Unique on (venue_id,
-- topic_key) so re-running determination (e.g. after an upstream wizard
-- answer changes) is a plain upsert, not a duplicate-row hazard.
create table sop_topic_decisions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  topic_key text not null,
  applicable boolean not null,
  confidence text not null check (confidence in ('high', 'low')),
  source text not null check (source in ('rule', 'ai', 'specialist_confirmed')),
  rationale text,
  confirmed_by uuid references app_users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, topic_key)
);
alter table sop_topic_decisions enable row level security;
create policy venue_isolation_sop_topic_decisions on sop_topic_decisions
  for all using (venue_id = private.auth_venue_id());

-- T2/T3's actual interview transcript -- one row per venue+topic+question,
-- covering the universal seven-part scaffold plus any layered
-- behavioral-read/safety-honesty/troubleshoot-escalate questions a topic
-- also gets (src/lib/onboarding/sopQuestions.ts owns the question wording;
-- this table only holds answers). attachment_extracted_text is parse-sop's
-- rawContent for a photo/document the specialist attached to this specific
-- question, kept separate from the typed answer_text. extracted_contact is
-- a candidate {name, phone, role} pulled from a troubleshoot-escalate
-- answer that names a real external contact -- never written to
-- venue_contacts until the specialist explicitly confirms it (T5).
create table sop_intake_answers (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id) on delete cascade,
  topic_key text not null,
  question_key text not null,
  question_type text not null check (question_type in ('universal', 'behavioral_read', 'safety_honesty', 'troubleshoot_escalate')),
  answer_text text,
  attachment_storage_path text,
  attachment_extracted_text text,
  extracted_contact jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, topic_key, question_key)
);
alter table sop_intake_answers enable row level security;
create policy venue_isolation_sop_intake_answers on sop_intake_answers
  for all using (venue_id = private.auth_venue_id());
