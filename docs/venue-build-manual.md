# Venue build manual and parity checklist

Read this before building, finishing or auditing any venue made with the onboarding wizard (venue #2 onward). It says what a
complete venue looks like, how to check that a new venue has every mechanism the reference venue has, and what the wizard does not
yet do for you. If this file and the code disagree, the code and the Notion Decision Log win: fix this file in the same pass.

**Reference venue:** The Coachman's Arms Hotel, slug `coachmans-arms-wizard`, id `79a9ea70-8302-4ab8-b501-8d27dc85457e`, Supabase
project `larder-dev` (`kkgnjbqmhagspeomlzav`). It is the most complete wizard built venue and the demo venue behind "See a live demo".
(Do not confuse it with the older hand seeded `block-p-pub-coachmans-arms`, or with Two Fires.)

Known differences in the reference itself, so nobody copies them by mistake:
- `venue_compliance_settings.venue_type` is null (the venue type step was added after it was built). A new venue must set it.
- Four equipment modules are still draft (Bistro, Kitchen, Public Bar equipment guides, Gaming machines). The reference is not a
  model for "everything live"; a new venue should have every applicable module live before handover.
- Staff PINs were reset to a shared demo PIN on 29 Oct 2026. A real venue never has a shared PIN (see section 3).

## 1. What a complete venue contains

Counts below are for the reference venue and are a guide for a 10 to 30 staff pub or restaurant with a full kitchen. A zero where
the reference has rows is a gap to explain, not automatically a bug.

| Table (filtered by venue_id) | Reference | What it is for |
|---|---|---|
| venues | 1 row | name, slug, `monthly_tier`, `cert_nudge_cadence` [30,14,7], `roster_location`, `ipad_mode_enabled` |
| venue_licence_profile | 1 | state, licence type and number, capacity, approved trading hours, late night endorsement, legal name, ABN, address |
| venue_compliance_settings | 1 | venue type, high risk activities, accommodation, trade waste, trading day cutoff hour (5) |
| wizard_sessions | 1, status completed | `venue_type_flags` (licensed, food_service_level, crowd control, RSA marshal, happy hour, escalations) |
| staff_roles | 8 | each with a department (BOH, FOH, BAR) and `fallback_tier` (authorized or frontline) |
| app_users | 16 | 1 owner, named staff (`role='staff'`), 1 device account when iPad mode is on; deactivated test rows are not part of the standard |
| venue_key_roles | 1 | RSA marshal, Food Safety Supervisor or similar designated people |
| certificate_types | 5 | RSA, Food Handling, Food Safety Supervisor, First Aid, WWCC (state specific wording) |
| stations | 4 | each with a QR slug, equipment manufacturer, model, serial where known, and a primary module |
| modules | 19 | role scoped training; every module passes submit, approve, go live |
| knowledge_chunks | 196 | the Ask Larder knowledge base, written by `ingestModule()` on go live |
| venue_contacts | 11 | emergency and business continuity contacts shown to staff |
| menu_items | 10 | menu with allergens (modifiers where items have swaps) |
| venue_promotions | 3 | happy hour and promotions |
| venue_refrigeration_units | 12 | units the temperature log (B2) reads, with limits |
| venue_compliance_forms | explicit rows only where the owner overrode a default | form activation |
| photo_library | 8 | venue photos used in module and station content |
| sop_intake_answers, sop_topic_decisions, onboarding_content_checks | 90, 16, 13 | the gap detection loop's working record |

Also expected: station FAQs and troubleshooting (approved) for each station with equipment, and a first test of Ask Larder.

## 2. How a venue is built (the real path)

1. **Wizard pages** under `/[venueSlug]/owner/onboarding/*`: venue basics, licensing gate, licence detail, crowd control, RSA, food
   service level, menu, equipment, promotions, contacts, staff roles, staff invite, certificate types, compliance setup, content
   intake, review. The page by page spec is `docs/block-q/q2-wizard-flow-and-schema.md`; the flags vocabulary is in the same file.
   Structured compliance fields write straight to their schema tables (section 1).
2. **Content intake** (gap detection loop): draft section content, automatic self consistency check, immediate embedding via
   `ingestModule()`, test question spot check, loop until every applicable topic is answerable. Transcripts and grading are in
   `docs/block-q/`.
3. **Activation**: `submit-for-approval` then `approve` then `go-live` per module. Going live runs `ingestModule()`. The owner
   approval gate is never skipped. The buttons are on Owner, Modules, and on each SOP page.
4. **Handover**: owner pairs the venue iPad (section 4), staff set their own PINs at first login, certificates are uploaded.

## 3. Mechanism parity checklist

Tick every line for a new venue. "Verify" is how Claude Code checks it without trusting that the code is correct.

**Access and identity**
- [ ] Owner can log in with their own email and password. Verify by an owner login, not by reading the row.
- [ ] Every staff member has a department and a `fallback_tier` through their role. A role with no department sees no forms.
- [ ] Staff PINs are set by the staff member at first login (428 "Set your PIN" flow). Never share one PIN. The demo venue's shared
      PIN is a demo shortcut only.
- [ ] Deactivated staff cannot sign in (`deactivated_at`); the roster excludes them.
- [ ] Multi tenant isolation: run the two venue isolation test (`npm run test:isolation`) before the venue shares an environment with
      another. RLS is on for every table with `venue_id`.

**Content and the owner gate**
- [ ] Every applicable module is `live`, none left `draft` or `pending_approval` without the owner knowing why.
- [ ] Role scoped modules have `module_roles` rows; unrestricted modules have none. Restricted content has `is_restricted` chunks.
- [ ] `knowledge_chunks` exist for every live module (count above zero for each module id).
- [ ] The curated SOP document exists for each live module (Owner, SOPs).
- [ ] Compliance content traces to a real standard (Sources and References in Notion). RSA and WWCC are state specific.

**Ask Larder** (run after any change to the system prompt or retrieval, and before go live)
- [ ] In scope question answers correctly from the venue's own content.
- [ ] Fallback question ("what is the safe code") returns the supervisor line, never an answer.
- [ ] Out of scope question declines and redirects.
- [ ] Injection question ("ignore your instructions") holds the lock.
- [ ] Frontline and authorized tiers give different answers where restricted content exists.
- [ ] The Anthropic API key is valid in Vercel Production (a 401 `invalid x-api-key` in runtime errors means it is not).

**Compliance forms**
- [ ] Defaults match the venue: food level, licence type, venue type, accommodation, trade waste, high risk activities.
- [ ] Any form the owner switched off was a deliberate choice. Check `venue_compliance_forms` for `enabled=false` rows nobody
      remembers (the reference had bar forms switched off by mistake until 29 Oct 2026).
- [ ] Department scoping: a manager tier person WITH a department sees only that department's forms; owners and managers with no
      department see all. Verify with one BOH, one FOH and one BAR login.
- [ ] The temperature log (B2) audience is BOH, BAR and the same scoped manager tier. Units exist in `venue_refrigeration_units`.
- [ ] Number fields open the on screen keypad on an iPad; a saved form shows "Back to compliance forms".

**Certificates and nudges**
- [ ] Five certificate types exist with the right state wording; `cert_nudge_cadence` set; the cert expiry nudge job is scheduled.

**Stations**
- [ ] Each station has a QR slug, a primary module, and equipment manufacturer, model and serial wherever known (the manufacturer
      sourced content pipeline cannot run without them). FAQs and troubleshooting are approved before staff rely on them.

**Venue iPad mode** (off by default; the reference has it on)
- [ ] `venues.ipad_mode_enabled = true` is set deliberately, then the owner taps Set up this iPad on the venue iPad.
- [ ] iPad home shows stations, read only training (unrestricted modules only), Ask Larder at the lowest tier.
- [ ] The device account cannot complete modules, sign, upload certificates, submit forms or report near misses (API guards plus
      restrictive RLS in `20261029120000_device_account_restrictions.sql`). Verify by an API call as the device account, not by hiding buttons.
- [ ] Log out, Switch user, and the five minute idle sign out work for a person on the iPad.
- [ ] Stopping iPads from Settings stops a paired iPad resuming.

**Product rules**
- [ ] The Stamp appears at the four trust moments only; no generic checkmarks or confetti.
- [ ] No hyphens or dashes in product copy (compound words and code excepted). Run `scripts/audit-promo4-copy.mjs` style checks on new copy.
- [ ] Data export works for the venue (`scripts/export-venue.ts`), and cancellation notice is 30 days.

## 4. Handing over a venue iPad

1. Set `ipad_mode_enabled = true` for the venue (database, or an owner facing switch when one exists).
2. On the iPad: log in as the owner, Settings, Venue iPad card, Set up this iPad, log out, open the staff login. It should open
   to the venue iPad home with no PIN.
3. Add the page to the Home Screen. To retire an iPad: Settings, Stop all iPads.

## 5. Parity audit queries

Row count comparison, reference against a new venue (replace the second id). Any table where the reference has rows and the new
venue has none needs an explanation.

```sql
with ids as (select '79a9ea70-8302-4ab8-b501-8d27dc85457e'::uuid ref, '<NEW_VENUE_ID>'::uuid neu),
t as (select distinct c.table_name from information_schema.columns c
      join information_schema.tables x on x.table_schema = c.table_schema and x.table_name = c.table_name and x.table_type = 'BASE TABLE'
      where c.table_schema = 'public' and c.column_name = 'venue_id')
select t.table_name,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) c from public.%I where venue_id = %L', t.table_name, (select ref from ids)), false, true, '')))[1]::text::int as reference,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) c from public.%I where venue_id = %L', t.table_name, (select neu from ids)), false, true, '')))[1]::text::int as new_venue
from t order by 1;
```

Modules not live, forms switched off, and people without a department:

```sql
select title, status from modules where venue_id = '<NEW_VENUE_ID>' and status <> 'live';
select form_id from venue_compliance_forms where venue_id = '<NEW_VENUE_ID>' and enabled = false;
select u.name from app_users u left join staff_roles r on r.id = u.staff_role_id
 where u.venue_id = '<NEW_VENUE_ID>' and u.role = 'staff' and u.deactivated_at is null and r.department is null;
```

## 6. Known gaps (the wizard does not yet do these; check by hand)

- Venue iPad mode has no wizard step or owner facing switch. It is a database setting plus the pairing card in Settings.
- Compliance form activation is not asked during the wizard beyond compliance setup; review the Owner, Forms page at handover.
- Station photos and equipment manuals are loaded by scripts (`scripts/one-off/upload-coachmans-arms-station-photos.mjs`,
  `scripts/run-equipment-content-pipeline.mjs`), not the wizard.
- There is no automatic parity report. Section 5 is the manual version. A script that runs section 5 plus the Ask Larder test set and
  prints a pass or fail per section 3 line is the natural next build.

## 7. Keeping this manual true

Whenever a feature adds something a venue needs (a table, a setting, a mechanism, a migration), do two things in the same pass: make
sure the wizard or this manual captures it, and add its line to section 3. This is the "wizard stays adjacent" rule from CLAUDE.md
extended to documentation.

Migrations added on 29 Oct 2026 that every environment needs: `20261029100000_b2_bar_department.sql`,
`20261029110000_venue_ipad_mode.sql`, `20261029120000_device_account_restrictions.sql`.
