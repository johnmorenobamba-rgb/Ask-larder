-- Syncs the "running late" policy fix approved in Notion (Welcome & How We
-- Work, Section 2) into the live module content — closed in Notion on
-- 27 Aug 2026 but not yet pulled into the database until now.

update module_sections
set content = '## How this kitchen communicates
- Who to go to for what (chain of command — Kitchen Hand → Chef → Sous Chef → Head Chef)
- How shifts and rosters are communicated and changed
- **What to do if running late or unable to make a shift:** contact your supervisor at least 30 minutes before your shift start time — call or message directly, don''t wait until you''re already late to say something. The earlier the kitchen knows, the easier it is to cover.
- Where to raise a problem versus where to raise an idea'
where id = 'd4e0a7d8-2863-49d7-b2e8-2d08678846f8' and section_order = 2;

update check_questions
set
  question = 'If you know you''re going to be late for a shift, what should you do?',
  options = '["Wait until you arrive to explain", "Contact your supervisor at least 30 minutes before your shift start time", "Message a co-worker to cover for you without telling a supervisor"]'::jsonb,
  correct_option_index = 1,
  expected_answer_context = 'Correct: B — contact your supervisor at least 30 minutes before your shift start time. Reasoning: the earlier the kitchen knows, the easier it is to cover.'
where id = '8e007083-12a2-4d45-8aea-3ed8706e306b';
