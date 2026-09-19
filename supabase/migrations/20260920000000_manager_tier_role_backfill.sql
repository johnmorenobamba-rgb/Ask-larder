-- Locked product policy, 19 Sep 2026: Head Chef, Sous Chef, Manager
-- (Duty/Venue/Operations Manager and similar), and 2IC job titles get
-- manager-tier authority at every venue -- full owner-dashboard access and
-- Ask Larder's authorized fallback tier -- not a per-venue owner choice.
-- Going forward this is enforced at role-creation time
-- (isManagerTierRoleName, src/lib/onboarding/constants.ts, enforced
-- server-side in staff-roles/route.ts). This is the one-time backfill for
-- roles that already existed before that enforcement landed.
update staff_roles
set fallback_tier = 'authorized'
where fallback_tier != 'authorized'
and (
  lower(name) like '%head chef%'
  or lower(name) like '%sous chef%'
  or lower(name) like '%manager%'
  or lower(name) like '%2ic%'
);
