-- Atomic venue + owner app_users creation, called via the service-role
-- client's .rpc() after the auth.users row has already been created
-- (Supabase Auth user creation can't happen inside plain SQL). Both
-- inserts run in the function's single implicit transaction, so a
-- failure on either one rolls back both — no orphaned venue row.
--
-- Locked to service_role only: this is the v1 "no self-serve signup"
-- boundary enforced at the database layer, not just by convention.

create or replace function public.bootstrap_owner(
  p_auth_id uuid,
  p_venue_name text,
  p_venue_slug text,
  p_owner_name text,
  p_owner_email text
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_venue_id uuid;
  v_app_user_id uuid;
begin
  insert into venues (name, slug) values (p_venue_name, p_venue_slug)
    returning id into v_venue_id;

  insert into app_users (auth_id, venue_id, role, name, email)
    values (p_auth_id, v_venue_id, 'owner', p_owner_name, p_owner_email)
    returning id into v_app_user_id;

  return jsonb_build_object('venue_id', v_venue_id, 'app_user_id', v_app_user_id);
end;
$$;

revoke execute on function public.bootstrap_owner(uuid, text, text, text, text) from public;
grant execute on function public.bootstrap_owner(uuid, text, text, text, text) to service_role;
