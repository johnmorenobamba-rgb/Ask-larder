-- Bar staff can fill the temperature log (B2). The Cellar keg cool room and the bar back fridges are tracked units, and a
-- Cellarman (Bar department) could not log them because submit_compliance_form only accepted the BOH and FOH audiences
-- (P24 widened submit_compliance_record to BAR but deliberately left this function back of house).
--
-- The change is one allowed audience: array['BOH', 'FOH'] becomes array['BOH', 'FOH', 'BAR'] in the live function body.
-- Row level security on compliance_form_submissions is generic (it reads each row's visible_to_roles), so it needs no change.
-- The function is patched in place from its own definition, so nothing else in it can drift. Safe to re-run.
--
-- ROLLBACK: re-run the same block with the two strings swapped (BAR removed from the array). Any B2 rows already stored with
-- BAR in visible_to_roles stay readable by Bar staff and managers; delete or update them first if that matters.

do $$
declare
  d text;
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p
  where p.proname = 'submit_compliance_form' and p.pronamespace = 'public'::regnamespace;

  if d is null then
    raise exception 'submit_compliance_form not found';
  end if;

  if position($q$array['BOH', 'FOH', 'BAR']$q$ in d) > 0 then
    return; -- already applied
  end if;

  if position($q$array['BOH', 'FOH']$q$ in d) = 0 then
    raise exception 'Expected audience list not found in submit_compliance_form; not patching';
  end if;

  d := replace(d, $q$array['BOH', 'FOH']$q$, $q$array['BOH', 'FOH', 'BAR']$q$);
  execute d;
end
$$;
