-- Root cause of the Block P "RAG retrieval-consistency bug": an owner's
-- app_users.staff_role_id is null (owners don't hold a frontline staff_role
-- the way PIN-based staff do), and this function's role-scoping clause
-- (`mr.role_id = au.staff_role_id`) is never true when staff_role_id is
-- null under standard SQL NULL semantics. That silently excludes owner
-- (and manager, same elevated-account shape per Tech Bible §6) accounts
-- from EVERY module that carries any module_roles scoping at all (e.g.
-- Cash Handling, Closing Procedures) -- not a phrasing/embedding issue,
-- a real role-scoping bug. Owner/manager are full back-office accounts and
-- should see everything a frontline role can, same elevation convention
-- already used for the app_users RLS policy (private.auth_role()).
create or replace function public.match_knowledge_chunks(p_query_embedding vector, p_match_count integer DEFAULT 5)
 returns table(id uuid, source_module_id uuid, content_chunk text, similarity double precision)
 language sql stable security definer
 set search_path to 'public', 'extensions', 'pg_temp'
as $function$
  select kc.id, kc.source_module_id, kc.content_chunk,
         1 - (kc.embedding <=> p_query_embedding) as similarity
  from knowledge_chunks kc
  join modules m on m.id = kc.source_module_id
  where kc.venue_id = private.auth_venue_id()
    and m.status = 'live'
    and (
      private.auth_role() in ('owner', 'manager')
      or not exists (select 1 from module_roles mr where mr.module_id = m.id)
      or exists (
        select 1 from module_roles mr
        join app_users au on au.auth_id = auth.uid()
        where mr.module_id = m.id and mr.role_id = au.staff_role_id
      )
    )
  order by kc.embedding <=> p_query_embedding
  limit p_match_count;
$function$;
