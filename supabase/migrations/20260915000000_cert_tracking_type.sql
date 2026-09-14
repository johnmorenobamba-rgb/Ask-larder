-- Victoria-specific cert tracking distinction (15 Sep 2026 build session).
-- WWCC is a hard legal deadline under VIC's Worker Screening Act (5 years
-- from issue). RSA/Food Handling/Food Safety Supervisor/First Aid are
-- industry-recommended refreshers in VIC, not mandatory renewals with a
-- legal cutoff -- they must read that way in the product, not as
-- "expired"/"non-compliant". MUST be re-verified per state before any
-- interstate venue onboards -- these classifications and the 3/5-year
-- periods are not necessarily correct outside Victoria.
alter table certificate_types
  add column if not exists cert_kind text check (cert_kind in ('wwcc','rsa','food_safety_supervisor','food_handling','first_aid','other')),
  add column if not exists tracking_type text not null default 'recommended_refresher' check (tracking_type in ('hard_expiry','recommended_refresher')),
  add column if not exists validity_years integer not null default 3;

-- Best-effort backfill for existing rows (all real data today is VIC-only).
-- New rows are classified explicitly at creation time going forward (see
-- src/lib/certs/certTracking.ts) -- this is just for what already exists.
update certificate_types set cert_kind = 'wwcc', tracking_type = 'hard_expiry', validity_years = 5
  where cert_kind is null and (name ilike '%working with children%' or name ilike '%wwcc%' or name ilike '%blue card%');
update certificate_types set cert_kind = 'rsa', tracking_type = 'recommended_refresher', validity_years = 3
  where cert_kind is null and name ilike '%rsa%';
update certificate_types set cert_kind = 'food_safety_supervisor', tracking_type = 'recommended_refresher', validity_years = 3
  where cert_kind is null and name ilike '%food safety supervisor%';
update certificate_types set cert_kind = 'food_handling', tracking_type = 'recommended_refresher', validity_years = 3
  where cert_kind is null and name ilike '%food handling%';
update certificate_types set cert_kind = 'first_aid', tracking_type = 'recommended_refresher', validity_years = 3
  where cert_kind is null and name ilike '%first aid%';
