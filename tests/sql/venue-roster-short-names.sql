-- venue_roster short names (20261007100000). Rolled back, no data is kept. Expected: all PASS, 0 FAIL.
do $$
declare
  vT uuid := gen_random_uuid(); r jsonb; v_slug text; out text[] := '{}'; pass int; fail int; names text; ok boolean; i int;
  nm text[] := array['Priya Nair','Priya Nash','Meg O''Brien','cher','Sam Lee','Sam Lee','Anna Smith-Jones'];
  a uuid;
begin
  execute $q$ create function pg_temp.chk(p_label text, p_cond boolean) returns text language sql as
    $f$ select case when coalesce(p_cond,false) then 'PASS ' else 'FAIL ' end || p_label $f$ $q$;
  insert into venues(id,name,slug) values (vT,'RosterT','rt-'||substr(vT::text,1,8)) returning slug into v_slug;
  for i in 1..array_length(nm,1) loop
    a := gen_random_uuid();
    insert into auth.users(id,aud,role,email) values (a,'authenticated','authenticated','s'||a||'@t.test');
    insert into app_users(auth_id,venue_id,role,name) values (a,vT,'staff',nm[i]);
  end loop;
  a := gen_random_uuid();
  insert into auth.users(id,aud,role,email) values (a,'authenticated','authenticated','o'||a||'@t.test');
  insert into app_users(auth_id,venue_id,role,name) values (a,vT,'owner','Olive Ownerson');
  a := gen_random_uuid();
  insert into auth.users(id,aud,role,email) values (a,'authenticated','authenticated','d'||a||'@t.test');
  insert into app_users(auth_id,venue_id,role,name,deactivated_at) values (a,vT,'staff','Gone Person',now());

  execute 'set local role anon';
  r := public.venue_roster(v_slug);
  begin perform public.roster_display_names(vT); ok := true; exception when others then ok := false; end;
  execute 'reset role';
  out := out || pg_temp.chk('anon cannot call the helper directly', not ok);
  select string_agg(e->>'name', ' | ' order by e->>'name') into names from jsonb_array_elements(r->'staff') e;
  out := out || pg_temp.chk('seven active staff, owner and deactivated excluded', jsonb_array_length(r->'staff') = 7);
  out := out || pg_temp.chk('no full surname is returned (Nair, Brien, Smith, Jones, Ownerson, Gone)', names !~* '(nair|brien|smith|jones|ownerson|gone)');
  out := out || pg_temp.chk('Priya Nair and Priya Nash are told apart', names like '%Priya Nai.%' and names like '%Priya Nas.%');
  out := out || pg_temp.chk('identical names are numbered', names like '%Sam L. 1%' and names like '%Sam L. 2%');
  out := out || pg_temp.chk('apostrophe and single word names', names like '%Meg O.%' and names like '%cher%');
  out := out || pg_temp.chk('JSON keys unchanged (venue.id,name,branding; staff.id,name)',
    (r->'venue') ?& array['id','name','branding'] and (select bool_and((e - 'id' - 'name') = '{}'::jsonb) from jsonb_array_elements(r->'staff') e));

  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS (rolled back): % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
