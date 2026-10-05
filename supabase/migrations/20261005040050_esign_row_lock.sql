-- E-signature function: lock the unsigned progress rows while signing (hardening-2 task 2, follow up to 20261005040000).
-- Why: two concurrent sign requests for the same person (a double tap) could both read the same unsigned rows, insert two
-- signatures per module and leave the first signature orphaned. FOR UPDATE makes the second request wait, then see the rows
-- already signed and sign nothing. Same signature, grants and behaviour otherwise. ADDITIVE (create or replace).
--
-- ROLLBACK: re-run the body in 20261005040000_esign_server_stamp.sql (no FOR UPDATE).

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
    order by id
    for update
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
