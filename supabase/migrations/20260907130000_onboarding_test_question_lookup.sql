-- Block Q5 -- wizard Page 12 gap-detection loop, test-question step
-- (docs/block-q/q1-requirements-catalog.md Part B; q2-wizard-flow-and-schema.md
-- §3 Page 12 step 3). match_knowledge_chunks (20260828050000, revised
-- 20260907093000) is hard-filtered to modules.status = 'live', because that
-- is the correct, locked isolation boundary for the real Ask Larder
-- chatbot staff actually talk to. But content mid-authoring during
-- onboarding is *always* status = 'draft' (module-sections, this session,
-- never sets it otherwise -- the owner-approval gate only advances status
-- via the existing approve/go-live/publish-version flow) -- so retrieval
-- filtered to 'live' would return zero rows for every single gap-detection
-- test question, making the self-consistency loop this exists for
-- impossible to run before a module is approved.
--
-- This is a deliberate, narrow exception to the production retrieval
-- contract for exactly one internal, owner/manager-only use case (a
-- draft-content spot check by the onboarding specialist, not a real staff
-- question) -- NOT a precedent for loosening match_knowledge_chunks itself
-- or any other retrieval path. To keep the exception narrow:
--   1. It's scoped to one specific module (p_source_module_id), never a
--      free venue-wide search -- unlike match_knowledge_chunks, which
--      searches across every live module for the venue.
--   2. It still enforces venue isolation via private.auth_venue_id().
--   3. It additionally requires private.auth_role() in ('owner','manager')
--      -- match_knowledge_chunks has no such restriction (any staff role
--      can query live content, gated instead by module_roles), but this
--      function intentionally has no status filter, so restricting it to
--      the same owner/manager check the app-layer route already enforces
--      is a defense-in-depth measure against a frontline staff account
--      ever using it to read a venue's not-yet-approved draft content.

create or replace function public.match_knowledge_chunks_for_authoring(
  p_query_embedding extensions.vector(1024),
  p_source_module_id uuid,
  p_match_count int default 8
) returns table (
  id uuid,
  content_chunk text,
  is_restricted boolean,
  similarity float
)
language sql stable security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select kc.id, kc.content_chunk, kc.is_restricted,
         1 - (kc.embedding <=> p_query_embedding) as similarity
  from knowledge_chunks kc
  where kc.venue_id = private.auth_venue_id()
    and kc.source_module_id = p_source_module_id
    and private.auth_role() in ('owner', 'manager')
  order by kc.embedding <=> p_query_embedding
  limit p_match_count;
$$;

revoke execute on function public.match_knowledge_chunks_for_authoring(extensions.vector, uuid, int) from public;
grant execute on function public.match_knowledge_chunks_for_authoring(extensions.vector, uuid, int) to authenticated;
