-- Station content in Ask Larder (5 Nov 2026, demo fix).
--
-- Problem: approved station_faqs and station_troubleshooting_issues were never
-- embedded. knowledge_chunks was only written by ingestModule(), and
-- match_knowledge_chunks INNER JOINed modules (status = 'live'), so a station's
-- approved troubleshooting entry ("Oven is not reaching or holding the set
-- temperature") could never be retrieved. Staff asking "the oven is not getting
-- hot enough" were told nothing was documented.
--
-- Fix: a chunk now has exactly one source, a module OR a station. Station chunks
-- are written by src/lib/ai/ingestStationContent.ts from APPROVED rows only, so
-- the owner approval gate still decides what Ask Larder can say; there is no
-- module status to check for them. Venue isolation is unchanged: every station
-- chunk carries venue_id, the existing venue_isolation_knowledge_chunks policy
-- covers it, and the RPC still filters to private.auth_venue_id().
--
-- match_knowledge_chunks_for_authoring is untouched: it filters on
-- source_module_id = p_source_module_id, so station chunks (null module) can
-- never appear in a module's authoring spot-check.

alter table public.knowledge_chunks
  add column if not exists source_station_id uuid null references public.stations(id) on delete cascade;

create index if not exists knowledge_chunks_source_station_id_idx
  on public.knowledge_chunks (source_station_id)
  where source_station_id is not null;

-- Module chunks are deleted by source_module_id on every re-ingest; that column
-- had no index either.
create index if not exists knowledge_chunks_source_module_id_idx
  on public.knowledge_chunks (source_module_id)
  where source_module_id is not null;

alter table public.knowledge_chunks
  drop constraint if exists knowledge_chunks_exactly_one_source;
alter table public.knowledge_chunks
  add constraint knowledge_chunks_exactly_one_source
  check (num_nonnulls(source_module_id, source_station_id) = 1);

-- Same signature, return shape, SECURITY DEFINER and search_path as before.
-- Exact search via a materialized CTE: with the venue filter applied after an
-- HNSW scan, the index only returns ef_search (40) nearest rows across ALL
-- venues before filtering, so a venue could get back fewer than p_match_count
-- rows, or miss its best match. A venue has a few hundred chunks at most, so an
-- exact scan of its own rows is cheap and always correct. (Setting
-- hnsw.iterative_scan on the function is refused on this project.)
create or replace function public.match_knowledge_chunks(p_query_embedding extensions.vector, p_match_count integer default 5)
returns table(id uuid, source_module_id uuid, content_chunk text, similarity double precision, is_restricted boolean)
language sql
stable security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
  with candidates as materialized (
    select kc.id, kc.source_module_id, kc.content_chunk, kc.is_restricted, kc.embedding
    from knowledge_chunks kc
    left join modules m on m.id = kc.source_module_id
    where kc.venue_id = private.auth_venue_id()
      and (
        (
          kc.source_module_id is not null
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
        )
        or kc.source_station_id is not null
      )
  )
  select c.id, c.source_module_id, c.content_chunk,
         1 - (c.embedding <=> p_query_embedding) as similarity,
         c.is_restricted
  from candidates c
  order by c.embedding <=> p_query_embedding
  limit p_match_count;
$function$;

-- create or replace keeps existing grants; restated so this file stands alone.
revoke execute on function public.match_knowledge_chunks(extensions.vector, integer) from public, anon;
grant execute on function public.match_knowledge_chunks(extensions.vector, integer) to authenticated, service_role;
