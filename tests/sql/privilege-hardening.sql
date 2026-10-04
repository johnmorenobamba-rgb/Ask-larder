-- Privilege hardening (20261005020000): read only assertions, nothing is written. Expected: all PASS, 0 FAIL.
do $$
declare
  r record; p text; bad int := 0; out text[] := '{}'; pass int; fail int;
begin
  for r in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','v','m','p') loop
    foreach p in array array['TRUNCATE','TRIGGER','REFERENCES'] loop
      if has_table_privilege('anon', 'public.' || quote_ident(r.relname), p) or has_table_privilege('authenticated', 'public.' || quote_ident(r.relname), p) then
        bad := bad + 1; out := out || ('FAIL ' || p || ' still granted on ' || r.relname);
      end if;
    end loop;
  end loop;
  out := out || (case when bad = 0 then 'PASS no public table or view grants TRUNCATE, TRIGGER or REFERENCES to anon or authenticated' else 'FAIL see above' end);
  out := out || (case when not has_function_privilege('anon','public.complete_onboarding_signature(text,text,text)','EXECUTE') and has_function_privilege('service_role','public.complete_onboarding_signature(text,text,text)','EXECUTE') then 'PASS complete_onboarding_signature: anon no, service_role yes (authenticated is revoked by 20261005040100 once applied)' else 'FAIL complete_onboarding_signature grants' end);
  out := out || (case when not has_function_privilege('anon','public.record_onboarding_signature(uuid,text,text,text)','EXECUTE') and not has_function_privilege('authenticated','public.record_onboarding_signature(uuid,text,text,text)','EXECUTE') and has_function_privilege('service_role','public.record_onboarding_signature(uuid,text,text,text)','EXECUTE') then 'PASS record_onboarding_signature is service role only' else 'FAIL record_onboarding_signature grants' end);
  out := out || (case when not has_function_privilege('anon','public.match_knowledge_chunks(extensions.vector,integer)','EXECUTE') and has_function_privilege('authenticated','public.match_knowledge_chunks(extensions.vector,integer)','EXECUTE') and has_function_privilege('service_role','public.match_knowledge_chunks(extensions.vector,integer)','EXECUTE') then 'PASS match_knowledge_chunks: anon no, authenticated and service_role yes' else 'FAIL match_knowledge_chunks grants' end);
  out := out || (case when not has_function_privilege('anon','public.match_knowledge_chunks_for_authoring(extensions.vector,uuid,integer)','EXECUTE') and has_function_privilege('authenticated','public.match_knowledge_chunks_for_authoring(extensions.vector,uuid,integer)','EXECUTE') then 'PASS match_knowledge_chunks_for_authoring: anon no, authenticated yes' else 'FAIL match_knowledge_chunks_for_authoring grants' end);
  out := out || (case when not has_function_privilege('anon','public.publish_module_version(uuid,text)','EXECUTE') and has_function_privilege('authenticated','public.publish_module_version(uuid,text)','EXECUTE') then 'PASS publish_module_version: anon no, authenticated yes' else 'FAIL publish_module_version grants' end);
  out := out || (case when has_function_privilege('anon','public.venue_roster(text)','EXECUTE') then 'PASS venue_roster stays callable by anon (staff login page)' else 'FAIL venue_roster lost anon execute' end);
  out := out || (case when not has_function_privilege('anon','public.submit_compliance_record(uuid,uuid,text,text[],text[],jsonb,jsonb,text,uuid)','EXECUTE') and not has_function_privilege('authenticated','public.submit_compliance_record(uuid,uuid,text,text[],text[],jsonb,jsonb,text,uuid)','EXECUTE') then 'PASS submit_compliance_record is service role only' else 'FAIL submit_compliance_record grants' end);
  select count(*) filter (where l like 'PASS%'), count(*) filter (where l like 'FAIL%') into pass, fail from unnest(out) l;
  raise exception E'RESULTS: % PASS, % FAIL\n%', pass, fail, array_to_string(array(select l from unnest(out) l where l not like 'PASS%'), E'\n');
end $$;
