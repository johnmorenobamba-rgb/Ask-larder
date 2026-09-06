-- Tech Bible §15i (added 6 Sep 2026, Block P finding) -- revises the
-- previously blanket fallback rule. A Duty Manager's own module told her to
-- set the alarm as her own closing task, then the blanket fallback rule
-- told her to ask a supervisor for the alarm code to do that exact task.
-- Frontline roles keep identical protection; authorized roles (manager and
-- above, decided per venue) can now actually receive restricted content.
alter table staff_roles add column if not exists fallback_tier text check (fallback_tier in ('frontline','authorized')) default 'frontline';
alter table knowledge_chunks add column if not exists is_restricted boolean default false;
alter table module_sections add column if not exists is_restricted boolean default false;

-- match_knowledge_chunks needs to also return is_restricted so the app
-- layer can apply tier-gating as a second, defense-in-depth check on top
-- of module_roles scoping (module_roles can be misconfigured -- see the
-- owner/manager bypass fix in the prior migration -- so a chunk-level
-- check that doesn't rely on scoping alone matters here).
drop function if exists match_knowledge_chunks(vector, integer);

create function public.match_knowledge_chunks(p_query_embedding vector, p_match_count integer DEFAULT 5)
 returns table(id uuid, source_module_id uuid, content_chunk text, similarity double precision, is_restricted boolean)
 language sql stable security definer
 set search_path to 'public', 'extensions', 'pg_temp'
as $function$
  select kc.id, kc.source_module_id, kc.content_chunk,
         1 - (kc.embedding <=> p_query_embedding) as similarity,
         kc.is_restricted
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
