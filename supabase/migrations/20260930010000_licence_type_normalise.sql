-- Compliance Forms Stage 0a, decision item 6 (29 Sep 2026): normalise
-- venue_licence_profile.licence_type to on_premises / general / late_night /
-- packaged (snake_case), or null.
--
-- Approved mapping (audited against every live venue, 30 Sep 2026):
--   on_premises  -> on_premises   (The Quiet Fox, The Split Note)
--   general_club -> general       (coachmans-arms-wizard)
--   null         -> null          (unlicensed / not yet answered)
--   other_unsure -> null          (no live rows; the wizard now stores null
--                                  for it and keeps the founder-escalation
--                                  flag licence_type_other_unsure)
--
-- Deliberately NO check tying licence_type to licence_status: "Other or
-- unsure" is a legitimate null on a licensed venue. "Required when licensed"
-- is enforced in the wizard UI, with the founder-escalation path as the
-- exemption.

alter table venue_licence_profile add column if not exists licence_type_original text;

-- Keep the original free text exactly as it was, once.
update venue_licence_profile
   set licence_type_original = licence_type
 where licence_type_original is null and licence_type is not null;

update venue_licence_profile set licence_type = 'general' where licence_type = 'general_club';
update venue_licence_profile set licence_type = null where licence_type = 'other_unsure';

alter table venue_licence_profile
  add constraint venue_licence_profile_licence_type_check
  check (licence_type is null or licence_type in ('on_premises', 'general', 'late_night', 'packaged'))
  not valid;

alter table venue_licence_profile validate constraint venue_licence_profile_licence_type_check;
