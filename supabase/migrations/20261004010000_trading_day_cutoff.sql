-- P23: closing forms belong to a venue TRADING DAY, not the calendar day. A venue that closes at 1am logs its
-- closing checks after midnight; those belong to the day that just ended. The trading day starts at a cutoff
-- hour in venue local time (default 05:00): a record made before the cutoff counts for the previous day.
-- Additive: one new column with a default on venue_compliance_settings. Existing rows get 5. Existing RLS
-- (staff read, manager tier insert and update) and grants already cover the new column.
--
-- ROLLBACK:  alter table venue_compliance_settings drop column if exists trading_day_cutoff_hour;
--            (the application code of the same commit reads this column: revert it too)

alter table venue_compliance_settings
  add column if not exists trading_day_cutoff_hour smallint not null default 5
  check (trading_day_cutoff_hour between 0 and 12);
