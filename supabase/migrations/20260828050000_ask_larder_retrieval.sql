-- Ask Larder retrieval: an HNSW index for nearest-neighbour search over
-- knowledge_chunks.embedding, and match_knowledge_chunks(), the sole entry
-- point the chatbot's retrieval step is allowed to use. This is the actual
-- isolation boundary for the chatbot -- venue scoping (private.auth_venue_id()),
-- the owner-approval gate (modules.status = 'live'), and role scoping
-- (module_roles, zero rows = visible to every role, same convention as the
-- staff-side module checklist) all happen inside this function, resolved from
-- auth.uid() server-side. None of it depends on anything a prompt could
-- influence -- retrieval is filtered at the data layer, per the locked
-- architecture rule, not as a prompt instruction that could be bypassed.
--
-- Must be called through the request-scoped client (src/lib/supabase/server.ts's
-- createClient()), never the admin client -- the admin client has no auth.uid(),
-- so this silently returns zero rows rather than leaking across venues, but it
-- would make the chatbot appear broken. Don't "fix" that by switching callers
-- to the admin client.

create index if not exists knowledge_chunks_embedding_hnsw_idx
  on knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.match_knowledge_chunks(
  p_query_embedding extensions.vector(1024),
  p_match_count int default 5
) returns table (
  id uuid,
  source_module_id uuid,
  content_chunk text,
  similarity float
)
language sql stable security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select kc.id, kc.source_module_id, kc.content_chunk,
         1 - (kc.embedding <=> p_query_embedding) as similarity
  from knowledge_chunks kc
  join modules m on m.id = kc.source_module_id
  where kc.venue_id = private.auth_venue_id()
    and m.status = 'live'
    and (
      not exists (select 1 from module_roles mr where mr.module_id = m.id)
      or exists (
        select 1 from module_roles mr
        join app_users au on au.auth_id = auth.uid()
        where mr.module_id = m.id and mr.role_id = au.staff_role_id
      )
    )
  order by kc.embedding <=> p_query_embedding
  limit p_match_count;
$$;

revoke execute on function public.match_knowledge_chunks(extensions.vector, int) from public;
grant execute on function public.match_knowledge_chunks(extensions.vector, int) to authenticated;
