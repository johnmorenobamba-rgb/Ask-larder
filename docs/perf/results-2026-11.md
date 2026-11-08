# Dashboard speed: results, 8 to 9 Nov 2026

Goal: the staff app and the owner dashboard load and navigate in 0.5 to 0.75 s. Ask Larder answer time was out of scope.

**Result: met.** Every measured page and nav click is under the 750 ms budget in production, and the speed check now fails if
one goes over. Staff home went from 7.0 s to about 0.5 s, the owner dashboard from 3.6 s to about 0.5 s.

Measured with `tests/e2e/perf.spec.ts` against https://asklarder.com.au from Melbourne (desktop Chromium): request sent, or nav
link tapped, until the page's own heading is visible. Throwaway accounts on coachmans-arms-wizard, removed after every run.
Median of the warm runs (3 per page, 5 for the last column).

## Before and after (median ms, production)

| Page | Baseline (iad1) | Phase 1 (syd1) | Phase 2 (round trips) | Phase 3 (skeletons) |
|---|---|---|---|---|
| Staff: load home | 7022 | 1081 | 488 | **492** |
| Staff: load modules | 3040 | 471 | 471 | **479** |
| Owner: load dashboard | 3550 | 968 | 463 | **493** |
| Owner: load compliance | 3280 | 481 | 497 | **466** |
| Staff: nav to modules | 2771 | 723 | 707 | **416** (690) |
| Staff: nav to certificates | 1868 | 645 | 653 | **409** (653) |
| Staff: nav to home | 5392 | 1174 | 650 | **418** (634) |
| Owner: nav to staff | 2765 | 737 | 738 | **434** (761) |
| Owner: nav to certificates | 2311 | 652 | 661 | **404** (675) |
| Owner: nav to compliance | 3859 | 635 | 635 | **399** (671) |

About the nav rows: until the last run, the nav timer started while the menu drawer was still sliding in (240 ms), and Playwright
waited for the link to stop moving before tapping it. So the baseline, Phase 1 and Phase 2 nav numbers each include about 200 to
250 ms of animation that a person never waits for. The spec now starts the timer once the link is still. The bracketed Phase 3
numbers are the same deployment measured with the old timer, for a like for like comparison with the earlier columns. Phase 3
was about perceived speed (the header and nav no longer vanish), not server time, so its old timer numbers match Phase 2.

Load rows are measured the same way in every column.

Cold first hits right after a deploy are slower (about 1.0 to 1.6 s for staff home and the dashboard) while fresh server
instances start and fetch the token signing key once. They settle within a few requests.

## Where the time went, and what changed

| Request | Serial Supabase trips before | After | Server time, local (Melbourne to Sydney), before then after |
|---|---|---|---|
| Staff layout | 7: auth, app_users, 3 acknowledgement queries, department, venue | 2: app_users (shared with the page), one acknowledgements function | about 830 ms, then about 170 ms |
| Staff home page | about 16 | 4: app_users (shared), one batch (the compliance hub inside it takes 2 rounds), one batch of signed photo URLs | about 1800 ms, then 280 to 440 ms |
| Staff modules page | 4 | 2 | about 370 ms, then about 115 ms |
| Owner layout | 3 | 1 (shared with the page) | about 570 ms, then about 80 ms |
| Owner dashboard page | about 7 | 3 | about 1450 ms, then 270 to 360 ms |
| Owner compliance page | 6 | 3 | about 900 ms, then 190 to 330 ms |

"Auth" now costs no trip on a warm server: see getClaims below. From syd1 each trip is about 10 to 20 ms; from iad1 it was about
200 ms, which is why Phase 1 alone cut most of the time.

- **Phase 1:** `vercel.json` `"regions": ["syd1"]`. Confirmed in the Vercel deployment details (`regions: ["syd1"]`) and the
  `x-vercel-id` header (`syd1::syd1::...`).
- **Phase 2:** `getCurrentStaff` wrapped in React `cache()` and embedding the role's department and the venue (name, slug, iPad
  mode, cert cadence), so the layouts, the forms, temperature and B2 routes no longer look them up separately. The
  `deactivated_at is null` filter is unchanged. Outstanding acknowledgements became one security invoker SQL function. The staff
  home runs everything in one batch (section count embedded, photos by venue, the hub alongside; the temperature tile reads the
  hub's own B2 overview instead of loading it twice). `loadB2Overview`, `loadHub` (4 rounds to 2) and the stations loader (one
  batch call to sign photo URLs) were flattened, and seven more pages were parallelised (module page, modules list, certificates,
  escalations, near-misses, weekly report, completions).
- **Phase 3:** content area skeletons replace the full screen overlay in both `(protected)/loading.tsx` files, so the header,
  nav drawer and floating buttons stay on screen. Screenshots at mobile, iPad and desktop: `docs/screenshots/loading-skeletons/`.
  Nav links were already `next/link` with default prefetch, which now prefetches the skeleton, so a tap shows it at once.
- **Phase 4:** 59 foreign key indexes, then (after John's approval) the RLS rewrite below. Both applied to larder-dev.
- **Phase 5:** the speed check fails over 750 ms (`PERF_REPORT_ONLY=1` to only report). The region rule and how to run the check
  are in `docs/venue-build-manual.md` section 7. `PERF_TIMING` is not set in any Vercel environment.

### auth.getClaims() (switched)

The project signs tokens with ES256 (asymmetric; checked from the JWKS endpoint), and supabase-js keeps the public key in a
module level cache, so `getClaims()` verifies the token on the server itself instead of asking the auth server on every request.

Trade-off: `getUser()` asks the auth server, so a session signed out on another device, or a deleted login, is rejected at once.
With `getClaims()` such a token keeps working until it expires (the access token lifetime, one hour by default).
Deactivation is not affected: it is the `deactivated_at` filter on the app_users lookup, which still runs on every request.
`tests/e2e/deactivation-instant.spec.ts` proves it locally and in production: a signed in staff member and a signed in manager are
deactivated, and their very next page load lands on the login page and Ask Larder returns 401.

### router.refresh()

Changed: the owner Compliance forms page (`FormActivationList` switches and `TradingDayControl`). After a successful save the
switch state, its reason line and the hour are already known, and nothing else on that page uses them. The onboarding wizard step
that shares `FormActivationList` keeps its refresh.

Left as they are, on purpose:
- Module approval, FAQ and troubleshooting approval, suggestion approval: the owner approval gate is not to be touched.
- Temperature log and compliance form submissions: the server works out out of range flags and alerts, so the result is not
  known in the browser.
- Staff role select: the staff screen's role name, department and tier text come from the server.
- Contacts manager: the add route does not return the new contact's id, and the route is shared with the onboarding wizard.

## Still over 750 ms

None of the measured pages or nav clicks. Not measured and worth a look later: the owner Modules page (the approval screen) still
waits two avoidable sequential trips; it was left untouched because it is the approval gate. The station QR screens keep their
full screen loading overlay (outside the dashboards).

## The RLS rewrite (approved and applied on 9 Nov 2026)

John approved it after the report; it was applied to larder-dev as
`supabase/migrations/20261109020000_rls_initplan_and_policy_merge.sql` and `npm run test:isolation` passed 48/48 straight after
(the acknowledgements RLS test 4/4 too). The performance advisor then showed no `auth_rls_initplan` and no
`multiple_permissive_policies` findings, and each of `check_questions`, `module_sections` and `photo_library` has exactly one
SELECT policy. The rollback stays at `supabase/pending/20261109020000_rollback.sql`. The section below is what was reviewed.

It cleared the remaining 7 `auth_rls_initplan` and 11 `multiple_permissive_policies` advisor findings.

- Seven policies get `auth.uid()` wrapped as `(select auth.uid())`: same value, evaluated once per query instead of once per row.
- `check_questions`, `module_sections` and `photo_library` each had a FOR ALL write policy that also counted as a second SELECT
  policy. Its condition is always the select policy plus a manager tier check, so for reading, the pair equals the select policy
  alone. It is replaced by the same condition for INSERT, UPDATE and DELETE. Nobody gains or loses read or write access.
- One of the seven is `app_users_device_own_row`, the restrictive policy that keeps the venue iPad account to its own row. Only
  the wrapper changes, but it is a device restriction, so it is called out; drop that statement if you prefer.

Why it is not tested "locally": this machine has no Docker, so there is no local Supabase stack (the README already notes the
project applies migrations straight to larder-dev). Instead, every new policy expression was run as a read only `WHERE` clause on
larder-dev to prove it is valid SQL, and the select policy equivalence was checked by reading the definitions. `npm run
test:isolation` passes 48/48 on the current policies; it has not run against the new ones. Two ways forward, your call:
1. Approve applying it to larder-dev, then `npm run test:isolation` right after, with the rollback file ready.
2. Test it first on a Supabase branch (a temporary copy of the database; small hourly cost).

The SQL, exactly as it stands (the file has the same plus comments):

```sql
begin;
alter policy app_users_update_self_or_owner_manager on public.app_users
  using (((auth_id = (select auth.uid())) or (private.auth_role() = any (array['owner'::text, 'manager'::text]))));
alter policy app_users_device_own_row on public.app_users
  using (((private.auth_role() <> 'device'::text) or (auth_id = (select auth.uid()))));
alter policy topic_gap_reports_venue_isolation on public.topic_gap_reports
  using ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = (select auth.uid())))))
  with check ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = (select auth.uid())))));
alter policy content_suggestions_venue_isolation on public.content_suggestions
  using ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = (select auth.uid())))))
  with check ((venue_id in (select app_users.venue_id from public.app_users where (app_users.auth_id = (select auth.uid())))));
alter policy station_faqs_venue_isolation on public.station_faqs
  using ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = (select auth.uid())))))
  with check ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = (select auth.uid())))));
alter policy station_troubleshooting_venue_isolation on public.station_troubleshooting_issues
  using ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = (select auth.uid())))))
  with check ((station_id in (select s.id from (public.stations s join public.app_users au on ((au.venue_id = s.venue_id))) where (au.auth_id = (select auth.uid())))));

drop policy check_questions_write_owner_manager on public.check_questions;
create policy check_questions_insert_owner_manager on public.check_questions for insert to public
  with check ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));
create policy check_questions_update_owner_manager on public.check_questions for update to public
  using ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))))
  with check ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));
create policy check_questions_delete_owner_manager on public.check_questions for delete to public
  using ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));

drop policy module_sections_write_owner_manager on public.module_sections;
create policy module_sections_insert_owner_manager on public.module_sections for insert to public
  with check ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));
create policy module_sections_update_owner_manager on public.module_sections for update to public
  using ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))))
  with check ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));
create policy module_sections_delete_owner_manager on public.module_sections for delete to public
  using ((private.auth_is_manager_tier() and (module_id in (select modules.id from public.modules where (modules.venue_id = private.auth_venue_id())))));

drop policy photo_library_owner_write on public.photo_library;
create policy photo_library_owner_insert on public.photo_library for insert to authenticated
  with check (((venue_id = private.auth_venue_id()) and (exists (select 1 from public.app_users au where ((au.auth_id = (select auth.uid())) and (au.role = any (array['owner'::text, 'manager'::text])))))));
create policy photo_library_owner_update on public.photo_library for update to authenticated
  using (((venue_id = private.auth_venue_id()) and (exists (select 1 from public.app_users au where ((au.auth_id = (select auth.uid())) and (au.role = any (array['owner'::text, 'manager'::text])))))))
  with check (((venue_id = private.auth_venue_id()) and (exists (select 1 from public.app_users au where ((au.auth_id = (select auth.uid())) and (au.role = any (array['owner'::text, 'manager'::text])))))));
create policy photo_library_owner_delete on public.photo_library for delete to authenticated
  using (((venue_id = private.auth_venue_id()) and (exists (select 1 from public.app_users au where ((au.auth_id = (select auth.uid())) and (au.role = any (array['owner'::text, 'manager'::text])))))));
commit;
```

Isolation test output on the current policies (after the index migration):

```
Test Files  1 passed (1)
     Tests  48 passed (48)
```

## Advisors now

- Performance: unindexed foreign keys 59 to 0, `auth_rls_initplan` 7 to 0, `multiple_permissive_policies` 11 to 0. Only "unused
  index" notices remain (27), which are mostly the new indexes not yet used; on tables this small Postgres may keep preferring a
  plain scan, which is fine.
- Security (all were already there; nothing new from this work): three tables with RLS on and no policy (service role only by
  design), `private.compliance_submission_immutable` without a fixed search_path, SECURITY DEFINER functions callable by signed in
  users (`venue_roster` also by anon; `match_knowledge_chunks` is the Ask Larder retrieval lock and was not touched), and leaked
  password protection off in Supabase Auth.

## Found along the way (not caused by this work)

- **Cert-expiry nudges are not being sent.** The `cert-nudge-daily` cron job "succeeds", but the Edge Function gateway answers 401
  and the function never runs (seen every day back to at least 3 Nov). Most likely the `anon_key` stored in the vault is no longer
  accepted for function calls. Needs a look at the vault secret and the function's JWT setting; not changed here.
- The `suggestion-pass-weekly` cron's last HTTP call recorded no status code (pg_net's 5 s timeout is shorter than the route takes).
  The route itself answers; whether the weekly pass completes was not checked.
- `npm run lint` was already failing on main (8 errors in remotion promo code plus local scratch and video folders). Fixed, so it
  can act as a merge gate.
- A local Turbopack `next build` fails on this Windows machine inside next/font Google fonts; Vercel's Turbopack build is fine and a
  local `next build --webpack` passes. Local builds used webpack.
- `tests/e2e/temperature-log.spec.ts`: three test bugs fixed (login before hydration, the stored audience order, the splash). Its
  staff walkthrough test still times out on main and on this branch alike: its plus or minus button sits in an animated cell that
  Playwright never sees as stable (the known floating cell gotcha).

## Checks run

Before each merge to main: 179 unit tests, `npm run lint` (0 errors), `next build` (webpack locally, Turbopack preview on Vercel
READY), the new hire walkthrough locally. Also: `npm run test:isolation` 48/48 (before Phase 1, after Phase 2, after Phase 4),
`tests/outstanding-acks.test.ts` 4/4, deactivation proof locally and in production, role guard, role change, hub and spoke,
compliance forms step, temperature log (apart from the known walkthrough test above), the skeleton screenshot spec, and after
every deploy: `tests/e2e/prod-smoke.spec.ts` (Ask Larder in scope answer, the supervisor fallback for the safe code, the
injection attempt refused, one Resend email delivered to Resend's test inbox, the cron route answering), Vercel runtime errors
(none on any new deployment), then the perf spec. The once a day Edge Function cron jobs run inside Supabase and are not affected by
the Vercel region.

The equivalence of the acknowledgements function was also checked against the old three query logic for all 60 users (identical),
and with a rolled back seeded case for the positive path.

## Commits and deploys

Branch `perf-dashboards`, merged into `main` four times (each merge deployed to production, region syd1). There is no GitHub CLI
on this machine, so these are local `--no-ff` merge commits pushed to main rather than pull requests:

| Merge on main | Production deployment | Contents |
|---|---|---|
| `5499885` | `dpl_65AevAUWejRPjYQtCQmQRmBm9Dh7` | Phase 0 and Phase 1 |
| `7c7f73a` | `dpl_8ZkRuyJ9zajYfXqdH1czmHgHLVVi` | Phase 2 |
| `2475aaf` | `dpl_9N6a93KvYXG7MByF7VkJxXxbrSbA` | Phase 3 and Phase 4 |
| `41be4b2` | `dpl_AkJjSnt9oXURK9Rq6g2Z8cejjzDF` | Phase 5 (spec and docs only, no app code change) |

Branch commits: `f71dd65` brand fonts config, `6c432ff` Phase 0, `4553f83` lint fixes, `7e88e21` Phase 1, `a82cb97` Phase 2 plan,
`3526685` acknowledgements function, `d78134e` session cache, embeds and getClaims, `23e9e16` staff home and dashboard batches,
`7a2a461` seven more pages, `40a9456` temperature log test fixes, `ee38811` skeletons, `fc7836a` owner forms refresh,
`355a0bc` Phase 4 indexes and pending RLS, `19bb149` Phase 5, `78b90d1` perf spec nav timer fix, plus this report.

Database changes applied to larder-dev: `20261109000000_outstanding_acknowledgements_fn` (new function),
`20261109010000_index_foreign_keys` (59 indexes) and, after approval, `20261109020000_rls_initplan_and_policy_merge` (policy
rewrite, no change to who can read or write what). No table or data changes.

## Test accounts

Every Playwright run ended with the global teardown check "counts unchanged: venues 16, records 21, logins 120, appUsers 60,
roles 51, ...", identical to before the work started. A final query on larder-dev found no perf-check app_users, logins or chat
messages and no test venues left, and coachmans-arms-wizard still has its 16 users.
