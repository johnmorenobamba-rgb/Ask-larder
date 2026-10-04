-- E-signature stamp (20261005040000 and, inside this rolled back test, 20261005040100). Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); a_s uuid := gen_random_uuid(); a_o uuid := gen_random_uuid();
  s_id uuid; s_gone uuid; m1 uuid; m2 uuid; r jsonb; n int; ok boolean; ip text; dev text; nm text;
  out text[] := '{}'; pass int; fail int; esig_before int;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  select count(*) into esig_before from esignatures;
  insert into venues(id,name,slug) values (vT,'EsigT','es-'||substr(vT::text,1,8));
  insert into auth.users(id,aud,role,email) values (a_s,'authenticated','authenticated','s'||a_s||'@t.test'),(a_o,'authenticated','authenticated','o'||a_o||'@t.test');
  insert into app_users(auth_id,venue_id,role,name) values (a_s,vT,'staff','Sig Person') returning id into s_id;
  insert into app_users(venue_id,role,name,deactivated_at) values (vT,'staff','Gone Person',now()) returning id into s_gone;
  insert into modules(venue_id,title) values (vT,'M one') returning id into m1;
  insert into modules(venue_id,title) values (vT,'M two') returning id into m2;
  insert into staff_module_progress(user_id,module_id,status) values (s_id,m1,'completed'),(s_id,m2,'completed');
  insert into staff_module_progress(user_id,module_id,status) values (s_gone,m1,'completed');

  out := out || pg_temp.chk('new function: anon and authenticated cannot execute, service_role can',
    not has_function_privilege('anon','public.record_onboarding_signature(uuid,text,text,text)','EXECUTE')
    and not has_function_privilege('authenticated','public.record_onboarding_signature(uuid,text,text,text)','EXECUTE')
    and has_function_privilege('service_role','public.record_onboarding_signature(uuid,text,text,text)','EXECUTE'));
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_s, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.record_onboarding_signature(s_id, 'Forged', '6.6.6.6', 'forged device'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('a real call as a signed in user is denied', not ok);
  execute 'set local role anon';
  begin perform public.record_onboarding_signature(s_id, 'Forged', '6.6.6.6', 'forged device'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('a real call as anon is denied', not ok);
  select count(*) into n from esignatures where typed_name = 'Forged';
  out := out || pg_temp.chk('no forged signature was written', n = 0);

  execute 'set local role service_role';
  r := public.record_onboarding_signature(s_id, '  Sig Person  ', '203.0.113.9', 'Test Agent/1.0');
  execute 'reset role';
  select count(*) into n from esignatures where user_id = s_id;
  out := out || pg_temp.chk('the service role path signs every completed unsigned module once', (r->>'modules_signed')::int = 2 and n = 2);
  select ip_address, device_info, typed_name into ip, dev, nm from esignatures where user_id = s_id limit 1;
  out := out || pg_temp.chk('the stamp and trimmed name are stored', ip = '203.0.113.9' and dev = 'Test Agent/1.0' and nm = 'Sig Person');
  out := out || pg_temp.chk('progress rows are linked to their signature', (select count(*) from staff_module_progress where user_id = s_id and esignature_id is not null) = 2);
  execute 'set local role service_role';
  r := public.record_onboarding_signature(s_id, 'Sig Person', 'x', 'y');
  execute 'reset role';
  out := out || pg_temp.chk('a second call signs nothing more (idempotent)', (r->>'modules_signed')::int = 0 and (select count(*) from esignatures where user_id = s_id) = 2);

  execute 'set local role service_role';
  begin perform public.record_onboarding_signature(s_gone, 'Gone Person', 'x', 'y'); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('a deactivated person cannot sign', not ok);
  begin perform public.record_onboarding_signature(gen_random_uuid(), 'Nobody', 'x', 'y'); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('an unknown user id is refused', not ok);
  begin perform public.record_onboarding_signature(s_id, '   ', 'x', 'y'); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('a blank name is refused', not ok);
  begin perform public.record_onboarding_signature(s_id, repeat('a', 201), 'x', 'y'); ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('a name over 200 characters is refused', not ok);
  execute 'reset role';
  insert into staff_module_progress(user_id,module_id,status) values (s_id,(select id from modules where venue_id=vT and title='M one'),'completed') on conflict do nothing;
  update staff_module_progress set esignature_id = null where user_id = s_id and module_id = m1;
  execute 'set local role service_role';
  r := public.record_onboarding_signature(s_id, 'Sig Person', null, null);
  execute 'reset role';
  out := out || pg_temp.chk('a missing ip or device is stored as unknown, never empty', (r->>'modules_signed')::int >= 1 and exists (select 1 from esignatures where user_id = s_id and ip_address = 'unknown' and device_info = 'unknown'));

  -- part 2 (20261005040100), applied inside this rolled back test only
  out := out || pg_temp.chk('before part 2 the old function is still callable by a signed in user (production code keeps working)', has_function_privilege('authenticated','public.complete_onboarding_signature(text,text,text)','EXECUTE'));
  execute 'revoke execute on function public.complete_onboarding_signature(text, text, text) from public, anon, authenticated';
  out := out || pg_temp.chk('after part 2 the old function is not callable by authenticated or anon', not has_function_privilege('authenticated','public.complete_onboarding_signature(text,text,text)','EXECUTE') and not has_function_privilege('anon','public.complete_onboarding_signature(text,text,text)','EXECUTE'));
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a_s, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.complete_onboarding_signature('Forged', '6.6.6.6', 'forged device'); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('after part 2 a forged direct call is denied', not ok);
  out := out || pg_temp.chk('after part 2 service_role still holds execute', has_function_privilege('service_role','public.complete_onboarding_signature(text,text,text)','EXECUTE'));

  begin delete from venues where id = vT; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('cleanup cascade works', ok);
  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back; esignatures before %): % PASS, % FAIL\n%', esig_before, pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
