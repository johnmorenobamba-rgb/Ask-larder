-- Dashboard speed plan, Phase 2: one round trip instead of three for the
-- staff layout's "anything to re-acknowledge?" check.
--
-- Same rule as the TypeScript it replaces (src/lib/staff/outstandingAcknowledgements.ts):
-- for each module the person has completed, take its latest published
-- version; it is outstanding when it was published after their completion
-- (or the completion has no timestamp) and they have not acknowledged that
-- exact version. Timestamps are compared as timestamps here, where the old
-- code compared ISO strings.
--
-- security invoker: runs with the caller's own rights, so the RLS policies on
-- staff_module_progress, module_versions, modules and
-- staff_module_acknowledgements apply exactly as they did to the three
-- separate queries. Nothing here widens what anyone can read.

create or replace function public.outstanding_acknowledgements(p_user_id uuid)
returns table (module_id uuid, module_title text, module_version_id uuid, changelog text)
language sql
stable
security invoker
set search_path = public
as $$
  with completed as (
    select p.module_id, p.completed_at
    from staff_module_progress p
    where p.user_id = p_user_id
      and p.status = 'completed'
      and p.module_id is not null
  ),
  latest as (
    select distinct on (v.module_id) v.id, v.module_id, v.published_at, v.changelog
    from module_versions v
    join completed c on c.module_id = v.module_id
    order by v.module_id, v.published_at desc nulls last, v.id
  )
  select l.module_id, coalesce(m.title, '') as module_title, l.id as module_version_id, l.changelog
  from latest l
  join completed c on c.module_id = l.module_id
  left join modules m on m.id = l.module_id
  where (c.completed_at is null or (l.published_at is not null and l.published_at > c.completed_at))
    and not exists (
      select 1
      from staff_module_acknowledgements a
      where a.user_id = p_user_id
        and a.module_version_id = l.id
    );
$$;

revoke all on function public.outstanding_acknowledgements(uuid) from public, anon;
grant execute on function public.outstanding_acknowledgements(uuid) to authenticated;
