-- E-signature stamp, server side only (hardening-2 task 2). PART 1 of 2: the new function. ADDITIVE; safe to apply now.
-- Problem: complete_onboarding_signature(text, text, text) is executable by any signed in user and TRUSTS the ip and
-- device arguments, so a signed in user could call it directly through the API with forged values and write a false
-- stamp into the immutable esignatures record.
-- Fix, in two parts so the code that is live in production keeps working until the new code is deployed:
--   PART 1 (this file, apply now): public.record_onboarding_signature(p_user_id, p_typed_name, p_ip, p_device), callable
--     by service_role ONLY. The Next.js route resolves the signed in person, computes ip and device from the request
--     headers on the server and calls this with the service role. The function checks the person is an active staff
--     member, normalises the stamp (trimmed, length capped, never empty) and writes the same rows the old function writes.
--   PART 2 (20261005040100_esign_revoke_client_call.sql, apply AFTER the new route is on main and deployed): removes the
--     authenticated EXECUTE grant from the old function so clients cannot call it at all.
-- Existing signatures are not touched. No table, column or policy changes.
--
-- ROLLBACK:
--   drop function if exists public.record_onboarding_signature(uuid, text, text, text);

create or replace function public.record_onboarding_signature(
  p_user_id uuid,
  p_typed_name text,
  p_ip text,
  p_device text
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_name text := btrim(coalesce(p_typed_name, ''));
  v_ip text := coalesce(nullif(left(btrim(coalesce(p_ip, '')), 100), ''), 'unknown');
  v_device text := coalesce(nullif(left(btrim(coalesce(p_device, '')), 500), ''), 'unknown');
  v_progress record;
  v_esignature_id uuid;
  v_count int := 0;
begin
  if v_name = '' or length(v_name) > 200 then
    raise exception 'A typed name is required.';
  end if;
  if not exists (select 1 from app_users where id = p_user_id and deactivated_at is null) then
    raise exception 'Not signed in.';
  end if;

  for v_progress in
    select id, module_id
    from staff_module_progress
    where user_id = p_user_id
      and status = 'completed'
      and esignature_id is null
  loop
    insert into esignatures (user_id, module_id, typed_name, ip_address, device_info)
    values (p_user_id, v_progress.module_id, v_name, v_ip, v_device)
    returning id into v_esignature_id;

    update staff_module_progress
    set esignature_id = v_esignature_id
    where id = v_progress.id;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('user_id', p_user_id, 'modules_signed', v_count);
end;
$$;

revoke all on function public.record_onboarding_signature(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_onboarding_signature(uuid, text, text, text) to service_role;
