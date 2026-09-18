-- Item 7 of the 18 Sep punch list: staff_module_progress was writing
-- duplicate rows per completion (flagged 13 Sep, never fixed -- this is
-- the real fix). Root cause, confirmed live: the API route's own
-- check-then-act ("does a row already exist?" then insert-or-update) used
-- .maybeSingle(), which throws once 2+ rows already match -- and the route
-- never checked that error, so it silently treated "check errored" the
-- same as "no existing row" and inserted yet another one. Once a venue hit
-- 2 duplicates for any reason (e.g. a double-submit), every later
-- completion attempt for that same module kept adding more, forever.
-- Confirmed on 3 staff across 2 venues, not unique to one account.

-- Remove duplicates first, keeping the earliest real completion (and its
-- real e-signature) per (user_id, module_id). The later duplicate rows'
-- own esignature_id rows are left in esignatures untouched -- immutable
-- audit records per the e-signature design, and nothing else in the app
-- references an esignature row directly by id outside its owning
-- staff_module_progress row, so leaving them as harmless orphans is
-- correct rather than deleting audit history.
delete from staff_module_progress smp
using (
  select id, row_number() over (
    partition by user_id, module_id order by completed_at asc nulls last, id asc
  ) as rn
  from staff_module_progress
) ranked
where smp.id = ranked.id and ranked.rn > 1;

-- Prevents this class of bug outright; complete-module/route.ts is being
-- switched to a real upsert against this constraint in the same commit.
alter table staff_module_progress
  add constraint staff_module_progress_user_module_unique unique (user_id, module_id);
