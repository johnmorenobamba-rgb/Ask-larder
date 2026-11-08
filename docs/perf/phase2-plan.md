# Phase 2 plan: cut serial round trips

Goal: every instrumented page waits on as few Supabase trips **one after another** as possible. Each trip costs about
10 to 20 ms from syd1 (Phase 1), about 200 ms from iad1. Counting "serial trips" below means the longest chain of
requests that each wait for the previous one, not the total number of requests.

Never touched: the owner approval gate, the Ask Larder venue_id retrieval lock, the supervisor fallback rule, device
account restrictions. Deactivation enforcement keeps working exactly as now (the `deactivated_at is null` filter on the
app_users lookup, every request) and gets a dedicated test.

## 1. One shared, cached session lookup

`getCurrentStaff()` (src/lib/auth/session.ts) becomes `cache(async () => ...)` from React, so the layout and the page of
one request share one result instead of each running auth plus app_users.

Its select grows from `*, staff_roles(fallback_tier)` to
`*, staff_roles(fallback_tier, department), venues(name, slug, ipad_mode_enabled, cert_nudge_cadence)`, and
`CurrentStaff` gains `department` and `venue` (`{ name, slug, ipadModeEnabled, certNudgeCadence }`). RLS still applies to
the embeds (the caller's own client), so nobody sees more than before. `isManagerTier` and `isDevice` are computed as now.

Then removed as redundant:
- staff layout: `getStaffDepartment` and the `venues` query;
- owner layout: the `venues` query (the slug match check stays, against `staff.venue.slug`);
- staff home: the `venues` query in its Promise.all and both `getStaffDepartment` calls;
- the other `getStaffDepartment(supabase, staff.staff_role_id)` callers (forms, forms/[formId], temperature pages, the B2
  and forms submit routes) read `staff.department` instead. `getStaffDepartment` stays exported for any caller that
  needs another person's department.

### auth.getClaims()

The project signs JWTs with ES256 (asymmetric, checked from the JWKS endpoint), and supabase-js caches the public key at
module level, so on a warm function `getClaims()` verifies the token locally and saves the auth server trip that
`getUser()` makes on every request.

Trade-off: `getUser()` asks the auth server, so a session that was signed out elsewhere, or a login that was deleted,
is rejected at once. `getClaims()` only checks the signature and expiry, so such a token keeps working until it expires
(the access token lifetime, one hour by default). Deactivation is NOT affected: it is enforced by the app_users lookup
with `deactivated_at is null`, which still runs on every request. A deactivated person is locked out on their next
request exactly as today. A test proves it (sign in, deactivate, the next page load lands on login and Ask Larder
returns 401).

## 2. Outstanding acknowledgements: one SQL function

`getOutstandingAcknowledgements` runs three queries one after another (progress, then versions, then acks). It becomes
one call to a new `public.outstanding_acknowledgements(p_user_id uuid)`, `security invoker`, `stable`,
`search_path = public`, so RLS applies exactly as for the three queries it replaces. Same rule as the TypeScript: latest
version per completed module, newer than the completion (by real timestamp comparison, where the old code compared
strings), not acknowledged yet. Execute granted to `authenticated` only.

Dry run first in a transaction on larder-dev that seeds a venue, a user, a module, two versions and an ack, checks the
result and rolls back (no Docker here, so no local Supabase stack). Then applied as a migration.

## 3. Flatten the staff home page

Today: auth, app_users, Promise.all, then sectionsCount, continuePhoto, its signed URL, activityPhoto, its signed URL,
department, b2Overview (two rounds), department again, loadHub (four rounds), each one after another.

After:
- One Promise.all with everything that only needs the staff row: modules (with `module_sections(count)` embedded, so
  no separate section count), progress, cert types, certs, stations, fallback count, suggestions, the venue's
  module-tagged photos and its general/hero photo (both photo queries by venue, so they no longer wait for the module
  list), and `loadHub`.
- Then one `createSignedUrls` call for the continue photo and the activity photo together.
- The temperature tile reads `hub.b2` (the hub already loads the B2 overview; the page was loading it a second time).
  A hub failure marks both tiles degraded, never a clean zero.

## 4. Flatten the shared loaders

- `loadB2Overview`: the "today's readings" query only depends on `now`, so it joins the first Promise.all (two rounds
  to one).
- `loadHub`: `compliance_latest_by_subject` does not depend on anything, so it joins the first Promise.all. The
  per-cadence record windows need the venue's state and cutoff hour, so they stay a second round (four rounds to two).
- `getStationsWithDisplay`: stations and their station-tagged photos are fetched in parallel (by venue), and all photo
  URLs are signed in one `createSignedUrls` call (three rounds to two).

## 5. Owner dashboard

`loadB2Overview` moves into the main Promise.all.

## 6. Sweep

The other staff and owner pages under (protected) are checked for awaits that do not depend on each other and run one
after another; any found are put into a Promise.all.

## Expected serial trips per request

| Request | Before | After |
|---|---|---|
| staff layout | 7 (auth, app_users, acks x3, department, venue) | 2 with getUser (auth, app_users) + 1 (acks function), shared with the page |
| staff home page | about 16 | auth + app_users (shared) + 2 (hub windows) + 1 (signed URLs) |
| staff modules page | 4 | auth + app_users (shared) + 2 |
| owner layout | 3 | auth + app_users (shared) |
| owner dashboard page | about 7 | auth + app_users (shared) + 2 |
| owner compliance page | 6 | auth + app_users (shared) + 2 |

With getClaims on a warm function, "auth" costs no trip at all.

## Checks before merge

Unit tests, `npm run lint`, `next build`, `npm run test:isolation`, the new-hire walkthrough (local), the deactivation
test, the production smoke spec, then the perf spec against production after deploy.
