-- Roster privacy (launch-1, Phase 1). venue_roster() is callable by anon (the staff login picker), so it must not return full
-- names. The "name" value becomes first name plus the first letter of the last name and a full stop ("Priya N."). Same JSON
-- shape and keys, same filters (active staff, role staff only), same SECURITY DEFINER and pinned search_path, same EXECUTE grants.
-- Collisions in one venue: the last name part is lengthened until the people differ but never to the full surname (at most all but the last letter), then a number is added for people who still look the same.
-- The picker only displays the name; login uses the staff id, and the typed name on the e-signature is typed by the person.
--
-- ROLLBACK SQL (the definition before this migration):
--   create or replace function public.venue_roster(p_slug text) returns jsonb
--   language sql stable security definer set search_path to 'public', 'pg_temp'
--   as $fn$
--     select jsonb_build_object(
--       'venue', jsonb_build_object('id', v.id, 'name', v.name, 'branding', v.branding),
--       'staff', coalesce(
--         (select jsonb_agg(jsonb_build_object('id', u.id, 'name', u.name) order by u.name)
--          from app_users u
--          where u.venue_id = v.id and u.role = 'staff' and u.deactivated_at is null),
--         '[]'::jsonb))
--     from venues v where v.slug = p_slug;
--   $fn$;
--   drop function public.roster_display_names(uuid);

create or replace function public.roster_display_names(p_venue uuid)
returns table(staff_id uuid, display_name text)
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
  with base as (
    select u.id, btrim(regexp_replace(u.name, '\s+', ' ', 'g')) as n
    from app_users u
    where u.venue_id = p_venue and u.role = 'staff' and u.deactivated_at is null
  ), parts as (
    select id, n, split_part(n, ' ', 1) as f,
      case when position(' ' in n) > 0 then substring(n from '(\S+)$') end as l
    from base
  ), cooked as (
    select id, n,
      case when f = lower(f) or f = upper(f) then initcap(f) else f end as f,
      case when l is null then null else
        (case when coalesce(nullif(regexp_replace(l, '^[^[:alpha:]]+', ''), ''), l) = upper(coalesce(nullif(regexp_replace(l, '^[^[:alpha:]]+', ''), ''), l))
              and char_length(l) > 1
              then lower(coalesce(nullif(regexp_replace(l, '^[^[:alpha:]]+', ''), ''), l))
              else coalesce(nullif(regexp_replace(l, '^[^[:alpha:]]+', ''), ''), l) end)
      end as l
    from parts
  ), lens as (
    select c.id, c.n, c.f, c.l,
      case when c.l is null then null else
        coalesce((select min(k) from generate_series(1, greatest(1, char_length(c.l) - 1)) k
                  where not exists (
                    select 1 from cooked o
                    where o.id <> c.id and o.l is not null
                      and lower(o.f) = lower(c.f)
                      and lower(left(o.l, k)) = lower(left(c.l, k))
                      and lower(o.l) <> lower(c.l))),
                 greatest(1, char_length(c.l) - 1))
      end as k
    from cooked c
  ), named as (
    select id,
      case when l is null then coalesce(nullif(n, ''), 'Staff')
           else f || ' ' || upper(left(l, 1)) || substr(l, 2, k - 1)
                  || case when k = 1 or k < char_length(l) then '.' else '' end
      end as d
    from lens
  )
  select id, case when count(*) over (partition by lower(d)) > 1
                  then d || ' ' || row_number() over (partition by lower(d) order by id)::text
                  else d end
  from named;
$$;

revoke all on function public.roster_display_names(uuid) from public, anon, authenticated;

create or replace function public.venue_roster(p_slug text) returns jsonb
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select jsonb_build_object(
    'venue', jsonb_build_object('id', v.id, 'name', v.name, 'branding', v.branding),
    'staff', coalesce(
      (select jsonb_agg(jsonb_build_object('id', r.staff_id, 'name', r.display_name) order by r.display_name, r.staff_id)
       from public.roster_display_names(v.id) r),
      '[]'::jsonb
    )
  )
  from venues v
  where v.slug = p_slug;
$$;
