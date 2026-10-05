-- Owner alerts for generic form failures (hardening-2 task 6, P22): B3 goods receiving, B6 two stage cooling, B12 pest log.
-- Reuses the B2 episode alert table (compliance_alert_log). A trigger writes ONE alert row per episode when a failing record is
-- saved; the Next.js server sends the email (src/lib/compliance/alerts.ts), only when COMPLIANCE_ALERT_EMAIL_ENABLED is "true"
-- (it is UNSET everywhere), and outside production only to the test recipient.
-- Episodes (one email per item per episode):
--   B6  item = the cooling batch (chain_id). The first failing stage of a batch alerts; a later failing stage of the same batch does not.
--   B3  item = supplier and product. A failing delivery alerts when the previous delivery of that item (not corrected away) was not failing.
--   B12 item = location. A pest sighting alerts when the previous record for that location (not corrected away) was not a sighting.
--   A correction of a record that already has an alert is the same episode: no second alert.
-- Passing records, other forms and B2 are untouched. No existing row is changed: the trigger only acts on records saved after it
-- exists. ADDITIVE: one function and one trigger; the alert table and its policies are unchanged.
--
-- ROLLBACK:
--   drop trigger if exists compliance_generic_alert on public.compliance_form_submissions;
--   drop function if exists private.compliance_generic_alert();
--   (alert rows already written stay in compliance_alert_log with kind generic_fail_episode; they are harmless and can be left.)

create or replace function private.compliance_generic_alert() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_key text;
  v_prev boolean;
begin
  if new.form_id not in ('B3', 'B6', 'B12') or not coalesce(new.out_of_range, false) then
    return new;
  end if;
  -- a correction of a record that was already alerted is the same episode
  if new.corrects_submission_id is not null
     and exists (select 1 from compliance_alert_log al where al.submission_id = new.corrects_submission_id) then
    return new;
  end if;

  if new.form_id = 'B6' then
    v_key := new.payload ->> 'chain_id';
    if v_key is null then
      return new;
    end if;
    if exists (select 1 from compliance_alert_log al
               join compliance_form_submissions s on s.id = al.submission_id
               where s.venue_id = new.venue_id and s.form_id = 'B6' and s.payload ->> 'chain_id' = v_key) then
      return new;
    end if;
  elsif new.form_id = 'B3' then
    v_key := lower(btrim(coalesce(new.payload #>> '{values,supplier}', ''))) || '|' || lower(btrim(coalesce(new.payload #>> '{values,product}', '')));
    select s.out_of_range into v_prev from compliance_form_submissions s
    where s.venue_id = new.venue_id and s.form_id = 'B3' and s.id <> new.id
      and lower(btrim(coalesce(s.payload #>> '{values,supplier}', ''))) || '|' || lower(btrim(coalesce(s.payload #>> '{values,product}', ''))) = v_key
      and not exists (select 1 from compliance_form_submissions c where c.corrects_submission_id = s.id)
    order by s.submitted_at desc, s.id desc limit 1;
    if coalesce(v_prev, false) then
      return new;
    end if;
  else
    v_key := lower(btrim(coalesce(new.payload #>> '{values,location}', '')));
    select s.out_of_range into v_prev from compliance_form_submissions s
    where s.venue_id = new.venue_id and s.form_id = 'B12' and s.id <> new.id
      and lower(btrim(coalesce(s.payload #>> '{values,location}', ''))) = v_key
      and not exists (select 1 from compliance_form_submissions c where c.corrects_submission_id = s.id)
    order by s.submitted_at desc, s.id desc limit 1;
    if coalesce(v_prev, false) then
      return new;
    end if;
  end if;

  insert into compliance_alert_log (submission_id, venue_id, kind)
  values (new.id, new.venue_id, 'generic_fail_episode')
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.compliance_generic_alert() from public, anon, authenticated;

drop trigger if exists compliance_generic_alert on public.compliance_form_submissions;
create trigger compliance_generic_alert after insert on public.compliance_form_submissions
  for each row execute function private.compliance_generic_alert();
