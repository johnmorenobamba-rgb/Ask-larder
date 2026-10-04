-- record_staff_pin_failure (20261004000000): privileges, counting, lock, expired lock, unknown id.
-- One DO block, forced RAISE, throwaway venue only. Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); r_boh uuid; s1 uuid; s2 uuid;
  out text[] := '{}'; res jsonb; i int; att int; locked timestamptz; ok boolean; pass int; fail int;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  insert into venues(id,name,slug) values (vT,'PinT','pint-'||substr(vT::text,1,8));
  insert into staff_roles(venue_id,name,department,fallback_tier) values (vT,'Kitchen Hand','BOH','frontline') returning id into r_boh;
  insert into app_users(venue_id,role,name,staff_role_id,pin_hash) values (vT,'staff','Pin One',r_boh,'x') returning id into s1;
  insert into app_users(venue_id,role,name,staff_role_id,pin_hash) values (vT,'staff','Pin Two',r_boh,'x') returning id into s2;

  out := out || pg_temp.chk('anon cannot execute', not has_function_privilege('anon','public.record_staff_pin_failure(uuid)','EXECUTE'));
  out := out || pg_temp.chk('authenticated cannot execute', not has_function_privilege('authenticated','public.record_staff_pin_failure(uuid)','EXECUTE'));
  out := out || pg_temp.chk('service_role can execute', has_function_privilege('service_role','public.record_staff_pin_failure(uuid)','EXECUTE'));
  execute 'set local role authenticated';
  begin perform public.record_staff_pin_failure(s1); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('a real call as authenticated is denied', not ok);

  execute 'set local role service_role';
  for i in 1..4 loop res := public.record_staff_pin_failure(s1); end loop;
  execute 'reset role';
  select pin_failed_attempts, pin_locked_until into att, locked from app_users where id = s1;
  out := out || pg_temp.chk('four attempts counted, not locked', att = 4 and locked is null and (res->>'counted')::boolean);

  execute 'set local role service_role';
  res := public.record_staff_pin_failure(s1);
  execute 'reset role';
  select pin_failed_attempts, pin_locked_until into att, locked from app_users where id = s1;
  out := out || pg_temp.chk('the fifth attempt locks for about 15 minutes', att = 5 and locked > now() + interval '14 minutes' and locked < now() + interval '16 minutes');

  execute 'set local role service_role';
  for i in 1..10 loop res := public.record_staff_pin_failure(s1); end loop;
  execute 'reset role';
  select pin_failed_attempts, pin_locked_until into att, locked from app_users where id = s1;
  out := out || pg_temp.chk('attempts on a locked account are not counted (still 5, same lock)', att = 5 and not (res->>'counted')::boolean);

  update app_users set pin_locked_until = now() - interval '1 minute' where id = s1;
  execute 'set local role service_role';
  res := public.record_staff_pin_failure(s1);
  execute 'reset role';
  select pin_failed_attempts, pin_locked_until into att, locked from app_users where id = s1;
  out := out || pg_temp.chk('after the lock expires the next attempt counts (6) and locks again straight away (unchanged behaviour)', att = 6 and locked > now() and (res->>'counted')::boolean);

  execute 'set local role service_role';
  res := public.record_staff_pin_failure(gen_random_uuid());
  execute 'reset role';
  out := out || pg_temp.chk('an unknown id returns counted false and changes nothing', not (res->>'counted')::boolean and res->>'attempts' is null);

  select pin_failed_attempts into att from app_users where id = s2;
  out := out || pg_temp.chk('another account is untouched', coalesce(att,0) = 0);

  begin delete from venues where id = vT; ok := true; exception when others then ok := false; end;
  out := out || pg_temp.chk('cleanup cascade works', ok);
  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
