-- Phase 3: single end-of-flow e-signature (locked decision — one signing
-- screen after all modules/certs are done, not per-module). Atomically
-- writes one esignatures row per completed-but-unsigned module and backfills
-- staff_module_progress.esignature_id, so a mid-transaction failure can't
-- leave some modules signed and others not.
--
-- Deviates from the plan's literal (p_user_id, p_typed_name, p_ip, p_device)
-- signature by dropping p_user_id: the caller's own app_users row is derived
-- from auth.uid() inside the function instead of trusting a client-supplied
-- id, so there's no argument to spoof another staff member's signature with.
-- authenticated-callable (not service_role-only like bootstrap_owner) since
-- this runs as the signed-in staff member, not an admin action.

create or replace function public.complete_onboarding_signature(
  p_typed_name text,
  p_ip text,
  p_device text
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user_id uuid;
  v_progress record;
  v_esignature_id uuid;
  v_count int := 0;
begin
  select id into v_user_id from app_users where auth_id = auth.uid();
  if v_user_id is null then
    raise exception 'Not signed in.';
  end if;

  for v_progress in
    select id, module_id
    from staff_module_progress
    where user_id = v_user_id
      and status = 'completed'
      and esignature_id is null
  loop
    insert into esignatures (user_id, module_id, typed_name, ip_address, device_info)
    values (v_user_id, v_progress.module_id, p_typed_name, p_ip, p_device)
    returning id into v_esignature_id;

    update staff_module_progress
    set esignature_id = v_esignature_id
    where id = v_progress.id;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('user_id', v_user_id, 'modules_signed', v_count);
end;
$$;

revoke execute on function public.complete_onboarding_signature(text, text, text) from public;
grant execute on function public.complete_onboarding_signature(text, text, text) to authenticated;
