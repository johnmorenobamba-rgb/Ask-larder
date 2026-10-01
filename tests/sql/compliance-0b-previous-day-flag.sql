-- Compliance Forms 0b: a flag from a PREVIOUS DAY with no recheck stays open until a LATER in range
-- reading exists. The API cannot create a backdated reading (the server stamps the time), so this
-- backdates inside a rolled-back transaction by disabling triggers for that transaction only
-- (session_replication_role). Throwaway venue; nothing persists. Expected: 4 PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); r uuid; s uuid; u1 uuid; u2 uuid; old_id uuid; res jsonb;
  out text[] := '{}'; open_before boolean; open_other boolean; open_after boolean; days_old numeric;
begin
  insert into venues(id,name,slug) values (vT,'T0b prev day','t0b-prev-'||substr(vT::text,1,8));
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Kitchen Hand','BOH','frontline') returning id into r;
  insert into app_users(venue_id,role,name,staff_role_id) values (vT,'staff','Kit Hand',r) returning id into s;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vT,'Fridge A','cold',5) returning id into u1;
  insert into venue_refrigeration_units(venue_id,name,unit_type,max_temp_c) values (vT,'Fridge B','cold',5) returning id into u2;

  set local session_replication_role = replica;
  insert into compliance_form_submissions(venue_id,form_id,submitted_by,submitted_by_name,submitted_at,payload,out_of_range,corrective_action,visible_to_roles)
  values (vT,'B2',s,'Kit Hand', now() - interval '3 days',
    jsonb_build_object('unit_id',u1,'unit_name','Fridge A','unit_type','cold','reading_c',9,'limit_kind','max','limit_c',5,'episode_start',true),
    true,'Door ajar',array['BOH']) returning id into old_id;
  insert into compliance_form_submissions(venue_id,form_id,submitted_by,submitted_by_name,submitted_at,payload,out_of_range,visible_to_roles)
  values (vT,'B2',s,'Kit Hand', now() - interval '3 days',
    jsonb_build_object('unit_id',u2,'unit_name','Fridge B','unit_type','cold','reading_c',3,'limit_kind','max','limit_c',5,'episode_start',false), false, array['BOH']);
  set local session_replication_role = origin;

  select out_of_range, extract(day from now() - submitted_at) into open_before, days_old from compliance_b2_latest_readings where venue_id=vT and unit_id=u1;
  select out_of_range into open_other from compliance_b2_latest_readings where venue_id=vT and unit_id=u2;
  out := out || format('%s a flag from %s days ago with no recheck is STILL the latest effective reading and open (out_of_range=%s)', case when coalesce(open_before,false) and days_old >= 2 then 'PASS' else 'FAIL' end, days_old, open_before);
  out := out || format('%s an in range reading from 3 days ago for another unit is not a flag', case when open_other = false then 'PASS' else 'FAIL' end);

  res := public.submit_compliance_form(vT, s, 'B2', array['BOH'], jsonb_build_array(jsonb_build_object('client_request_id', gen_random_uuid(), 'unit_id', u1, 'reading_c', 3.5)), 'test');
  select out_of_range into open_after from compliance_b2_latest_readings where venue_id=vT and unit_id=u1;
  out := out || format('%s a LATER in range reading closes the flag (out_of_range=%s)', case when open_after = false then 'PASS' else 'FAIL' end, open_after);
  out := out || format('%s the old out of range row itself is untouched in the ledger', case when exists(select 1 from compliance_form_submissions where id=old_id and out_of_range and (payload->>'reading_c')::numeric=9) then 'PASS' else 'FAIL' end);
  raise exception E'RESULTS (rolled back):\n%', array_to_string(out, E'\n');
end $$;
