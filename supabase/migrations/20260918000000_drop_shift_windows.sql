-- Item 5 of the 18 Sep punch list: Shift windows is being removed entirely.
-- No venue ever had a real capture point for this column (confirmed 13 Sep
-- 2026: "venues.shift_windows had no real capture point anywhere in the
-- app"), and this venue (the only one with the owner-facing form that could
-- write it) doesn't hold shift data at all. Front-end callers (staff home
-- "Shift" bento cell, Ask Larder's context block, the owner Settings form
-- and its API route) were all removed in the same commit as this migration.
alter table venues drop column if exists shift_windows;
