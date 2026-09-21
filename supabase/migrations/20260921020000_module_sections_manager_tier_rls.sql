-- Suggestion assistant Part 4 live testing (21 Sep 2026) found a real,
-- previously-undiscovered gap: approving a suggestion inserts a
-- module_sections row (see approve/route.ts), gated at the API layer by
-- staff.isManagerTier (role in ('owner','manager') OR
-- staff_roles.fallback_tier = 'authorized' -- src/lib/auth/session.ts).
-- module_sections_write_owner_manager (module_content_owner_write_policy,
-- 28 Aug 2026) predates that unification and still checks the bare literal
-- private.auth_role() in ('owner','manager'). A real Head Chef test
-- account (fallback_tier='authorized', app_users.role='staff') passed the
-- route's isManagerTier check, then had the insert silently rejected by
-- RLS -- the exact same class of bug adjustment #4 already found and fixed
-- in publish_module_version() this session, just one layer down and in a
-- different table.
--
-- private.auth_is_manager_tier() gives RLS one shared source for this,
-- mirroring session.ts's isManagerTier exactly, instead of every policy
-- re-deriving it. Applied here to module_sections and check_questions (the
-- two tables this migration's own predecessor covered together, and the
-- ones directly in this feature's critical path). Other tables still using
-- the bare owner/manager check (near_miss_reports, chat_messages, stations,
-- modules, match_knowledge_chunks, onboarding_test_question_lookup) are a
-- real, separate, wider gap -- deliberately NOT touched here, flagged to
-- John as its own follow-up rather than folded into this feature's scope.
create or replace function private.auth_is_manager_tier() returns boolean
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select au.role in ('owner', 'manager') or coalesce(sr.fallback_tier, 'frontline') = 'authorized'
  from app_users au
  left join staff_roles sr on sr.id = au.staff_role_id
  where au.auth_id = auth.uid()
$$;

drop policy if exists module_sections_write_owner_manager on module_sections;
create policy module_sections_write_owner_manager on module_sections
  for all
  using (
    private.auth_is_manager_tier()
    and module_id in (select id from modules where venue_id = private.auth_venue_id())
  )
  with check (
    private.auth_is_manager_tier()
    and module_id in (select id from modules where venue_id = private.auth_venue_id())
  );

drop policy if exists check_questions_write_owner_manager on check_questions;
create policy check_questions_write_owner_manager on check_questions
  for all
  using (
    private.auth_is_manager_tier()
    and module_id in (select id from modules where venue_id = private.auth_venue_id())
  )
  with check (
    private.auth_is_manager_tier()
    and module_id in (select id from modules where venue_id = private.auth_venue_id())
  );
