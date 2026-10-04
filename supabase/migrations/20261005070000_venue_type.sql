-- Venue type (hardening-2 task 5, P27): cafe, restaurant, pub, bar or other, chosen in the onboarding wizard.
-- It only changes which compliance forms START switched on for a venue that has chosen a type (the cafe pack for cafes,
-- the bar forms for pubs and bars). An owner's own switch on the forms page always wins (an explicit venue_compliance_forms
-- row is never overridden). A venue with no type keeps exactly the defaults it has today: the column is NULL for every
-- existing venue and nothing here writes to any existing row.
-- ADDITIVE: one nullable column with a check constraint on an existing table (venue_compliance_settings, whose RLS already
-- limits writes to the owner and manager tier of the same venue). No data changes.
--
-- ROLLBACK:
--   alter table public.venue_compliance_settings drop column if exists venue_type;

alter table public.venue_compliance_settings
  add column if not exists venue_type text
  check (venue_type is null or venue_type in ('cafe', 'restaurant', 'pub', 'bar', 'other'));
