-- Block U -- owner-side staff lifecycle (U1), upload-first intake
-- provenance (U2). U3 needs no schema change (photo_library.station_id
-- already models a station's photo correctly).

-- U1: soft-delete for staff. Never hard-deleted -- staff_module_progress,
-- staff_certificates, and esignatures must survive intact for audit
-- purposes. getCurrentStaff() filters this live, which is what actually
-- revokes access immediately (an already-issued Supabase session/JWT would
-- otherwise keep working until it expires regardless of login being
-- blocked) -- see src/lib/auth/session.ts.
alter table app_users add column if not exists deactivated_at timestamptz;

-- venue_roster() feeds the staff PIN-login picker -- without this filter a
-- deactivated staff member's name would keep appearing there even though
-- actually logging in as them is already blocked elsewhere.
create or replace function public.venue_roster(p_slug text) returns jsonb
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select jsonb_build_object(
    'venue', jsonb_build_object('id', v.id, 'name', v.name, 'branding', v.branding),
    'staff', coalesce(
      (select jsonb_agg(jsonb_build_object('id', u.id, 'name', u.name) order by u.name)
       from app_users u
       where u.venue_id = v.id and u.role = 'staff' and u.deactivated_at is null),
      '[]'::jsonb
    )
  )
  from venues v
  where v.slug = p_slug;
$$;

-- U2: sop_source_documents has sat fully orphaned since Block Q -- nothing
-- ever read it back out. Block U starts actually using it (topic-scoped
-- upload-first intake) rather than adding a parallel table.
alter table sop_source_documents add column if not exists topic_key text;

-- Lets the intake UI and any later review show which answer came from the
-- venue's own uploaded document versus a follow-up question the specialist
-- typed -- queryable provenance, not just ephemeral in the session.
alter table sop_intake_answers add column if not exists answer_source text not null default 'specialist'
  check (answer_source in ('specialist', 'document'));
