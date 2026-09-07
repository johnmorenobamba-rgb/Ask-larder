-- Q3 (micro-guide writer) flagged a real gap: LIC0's "not sure yet" answer
-- had no defined licence_status value. Leaving the column null in that case
-- would recreate exactly the ambiguity the enum was built to eliminate
-- (null could mean "not yet asked" OR "asked, but unresolved") -- the
-- distinction between those two states is real: one is an incomplete
-- wizard run, the other is a specialist who asked and got a genuinely
-- unclear answer, which should route to founder escalation rather than
-- guessing. Adding a fifth explicit value rather than leaving this null.
alter table venue_licence_profile drop constraint if exists venue_licence_profile_licence_status_check;
alter table venue_licence_profile add constraint venue_licence_profile_licence_status_check
  check (licence_status in ('none', 'byo_unlicensed', 'limited', 'full', 'unconfirmed'));
