# Block Q synthesis report: Onboarding Wizard build + validation

**Status: the wizard is real, working software.** Two venues now exist that were created entirely through it, not a seed script — one throwaway fictional test venue (The Split Note) and one standing up already-validated Block P research (The Coachman's Arms Hotel, `coachmans-arms-wizard`). The second is now a genuinely live Ask Larder instance.

**Commit range:** `acc82ff..a8a4bb3` (8 commits, 7 Sep 2026 – 11 Sep 2026).

---

## 1. What this pass found, in one paragraph

Block Q turned Block P's repeatable-but-manual research→interview→author→validate process into real wizard software, and then used that software for real, twice. The build itself (Q1–Q5) came together cleanly against a well-specified catalog and locked hybrid design. The validation stages (Q6, Q7, Q9) are where the value actually showed up: three rounds of real bugs were found and fixed, each one a genuine defect that a "looks right" code review would not have caught — a compliance-critical field silently losing data behind a page-ordering trap, an overnight trading-hours string comparison that discarded every open night at a late-trading venue, a client/server field-name mismatch that discarded every menu allergen tag, and, most significantly, a gap that had been invisible through every single prior block of this project: **nothing anywhere in the codebase ever moved a module from `draft` to `pending_approval`**, meaning CLAUDE.md's non-negotiable owner-approval gate had never actually been exercised through the app itself — every "live" venue before this one only got there because a seed script wrote the status directly into Postgres. That gap is now fixed and independently re-verified against real venue data. The wizard's core mechanism — schema writes, branching, the gap-detection content-authoring loop, embedding, retrieval — behaved correctly and honestly throughout, including under a blind grading pass and a deliberately messy, contradiction-laden real interview transcript.

---

## 2. Q1 — Requirements catalog

`docs/block-q/q1-requirements-catalog.md`. Synthesized the bar/pub/cafe Block P passes into 34 structured/guaranteed fields (Part A), 16 SOP/content-authoring topics (Part B), an explicit out-of-scope list (Part C — EGM/gaming, non-Victoria states, banned-patron register), and a grading rubric (Part D) later verified word-for-word against the real Module Content & Assessment Standard fetched from Notion. Flagged five genuine open items for the orchestrator rather than silently resolving them, including a real, previously-uncaught gap: the bar pass's original "legal name" recommendation never actually made it into a schema column.

## 3. Q2 — Wizard flow & schema

`docs/block-q/q2-wizard-flow-and-schema.md` + migration `20260907120000_block_q_onboarding_wizard.sql`. Implemented the Decision Log's locked hybrid design: structured guaranteed-entry pages for every compliance field, a build-then-surface-gaps loop for content only. New tables `wizard_sessions`, `venue_key_roles`, `onboarding_content_checks`, `venue_promotions`; new columns `venue_licence_profile.legal_name`/`.licence_status`, `venues.roster_location`; a root licensing gate (a real, validated finding from the cafe pass that the bar/pub flows lacked) that always writes a minimal row so "not yet asked" and "confirmed unlicensed" are never ambiguous. 15 pages, every one of Q1's Part A fields mapped to a capturing page. Applied live to `larder-dev` with explicit user confirmation before the schema change.

## 4. Q3 — Micro-guides

`docs/block-q/q3-micro-guides.md`. Per-page interview guidance (what to ask, good vs. vague answers cited to real Block P findings, how to handle an unresolved answer without guessing) for all 22 pages/sub-pages. Caught a real gap in its own review: the LIC0 gate's "not sure yet" answer had no defined `licence_status` value, which would have recreated the exact null-is-ambiguous problem the enum existed to prevent — fixed same-session with a fifth enum value, `unconfirmed`.

## 5. Q4 — Frontend build

15 wizard pages, 22 components, 15 API routes, a Playwright E2E spec. Reused `ChitMark`/`LoadingOverlay` for every async wait (no new animation, no Remotion), `ElevatedCell` for the review hero moment, and left `Stamp` untouched (reserved for module completion/cert upload/e-signature only). Correctly identified and worked around a real ordering tension in Q2's own page order (RSA and Food Service, pages 5–7, need staff roles that don't exist until page 11) with a visible "add staff roles first" message and a step-nav that allows jumping out of order.

## 6. Q5 — Parsing & content-authoring pipeline

Claude-vision `parse-menu`/`parse-sop`/`parse-cert` endpoints (propose-only, human confirms before any write), plus the gap-detection loop's real backend: `module-sections` (save + immediate embed via the now-shared `ingestModule()`) and `test-question` (a new, narrowly-scoped retrieval function for draft content, since the production `match_knowledge_chunks` RPC is deliberately locked to `status='live'`). Also: the session's actual first commit extracted `scripts/ingest-module.ts`'s logic into a reusable `src/lib/ai/ingestModule.ts` and wired it into `go-live`/`publish-version` — without this, no wizard-produced venue could ever get real embeddings, seed-script or not.

## 7. Multi-tenant isolation

Extended `tests/isolation.test.ts` with 21 new tests covering every Block Q table, plus three Block P tables (`venue_licence_profile`, `venue_contacts`, the menu tables) that had schema and RLS but no test coverage until now. 41/41 passing against the live project throughout every subsequent stage.

## 8. Q6 — Simulated onboarding (The Split Note)

`docs/block-q/q6-simulated-onboarding-transcript.md`. A fresh fictional live-music venue (Fortitude Valley, QLD — deliberately non-Victoria, to test the founder-escalation path a Victoria-only Block P venue never could), messy/contradictory answers planted on purpose per the Decision Log's standing requirement. Found and led to fixing:
- **RSA/Food-Service data loss**: both pages atomically gated their own Continue button on staff roles existing, silently losing typed marshal/FSS identity — a compliance-critical field — with no error shown. Decoupled; role-linkage gaps now surface as an outstanding item on Review & activate instead.
- **Gap-detection over-strictness**: the self-consistency checker graded whether every fact adjacent to an answer was independently confirmed, rather than whether the question itself was answered — it flagged an honest "ask Priya, the app name isn't confirmed" answer as a gap. Rewrote the grading criterion to match the product's own no-fabrication principle.

## 9. Q7 — Blind grading (The Split Note)

`docs/block-q/q7-blind-grading-report.md`. Independent grading, blind to the wizard's internals, against Q1's rubric. Verdict: **FAIL** — expected and appropriate, since Q6 was only asked to author 2–3 content topics as a required test element, not full coverage, and the venue's `wizard_sessions.status` was `completed` while ~70% of applicable content topics had no module at all. The FAIL is a correct grade for that partial state, not a verdict on the wizard's mechanism, which Q7's own positive findings confirm works: correct branch-taking, honest no-fabrication content, the closing-procedure module correctly reconciling who performs a task against who holds the credential for it. Surfaced two further real bugs (both fixed): overnight trading hours silently discarded by a same-day string comparison, and menu allergen checkboxes never persisting due to a `base_allergens`/`baseAllergens` field-name mismatch. One flagged "security defect" (restricted content has no `module_roles` scoping) was a misdiagnosis from blind-grading's own methodology limits — the actual enforcement lives in `ask-larder/route.ts`'s independent `is_restricted`/`fallback_tier` filter, confirmed correct by reading that route, which a blind data-only grader had no way to see.

## 10. Q9 — Real standup (The Coachman's Arms Hotel)

`docs/block-q/q9-real-standup-transcript.md`. The Decision Log's mandatory capstone: the wizard, run for real, against the already-validated pub's actual P3 interview and P4 module content — not another research artifact. All 34 guaranteed fields transcribed faithfully from real source material; every compliance-critical contradiction (capacity given three ways, happy-hour days contradicted, FSS identity walked back twice) resolved the same way the original P4 pass resolved it — logged and flagged, never silently picked. All 14 applicable content topics (of 15; one, display-cabinet safety, is genuinely N/A for a pub and was logged as such) authored through the real gap-detection loop and independently self-consistency tested, 1/1 pass on every single one — including a cellar/gas-safety answer that reproduced the original hand-seeded venue's exemplary answer almost verbatim.

This run then hit the module go-live gap described in §1 — the single most significant finding of the entire Block Q pass, because it is not a Block Q bug. It is a latent defect in the core product that every prior block (C through P) never exercised, because every venue before this one was hand-seeded straight into Postgres. Fixed the same day: a new `POST /api/owner/modules/[moduleId]/submit-for-approval` route and button, exactly matching the existing `approve`/`go-live` convention. All 14 of this venue's modules were then run through the real pipeline (submit → approve → go-live, all 200 OK, no database shortcut) and re-verified live — the in-scope float question now returns the correct grounded answer, the authorized-tier safe-combination question now matches the original hand-seeded instance's answer exactly (`22-08-41`), and the same question as a frontline PIN-logged-in staff member still correctly refuses, confirming the restricted-content security boundary holds with live content actually in the retrieval set, not just when there was nothing to leak. Two further bugs this run found were also fixed: a decorative "sourced from licence document" checkbox that was never actually sent to the server, and an RSA marshal `false || null` state bug that silently collapsed a genuine saved "No" answer back to unanswered on revisit.

---

## 11. Pass/fail against Q1's catalog

| Dimension | Verdict |
|---|---|
| Structured/guaranteed fields (Part A) captured faithfully from real source material | **Pass** (Q9) |
| Compliance-critical contradictions handled per D.1.2 (logged/flagged, never silently picked) | **Pass** (Q6, Q9) |
| SOP/content-authoring topics (Part B) authored through the real gap-detection loop | **Pass, full coverage** (Q9: 14/14 applicable) |
| Content quality: no-fabrication, self-consistency | **Pass** (Q6, Q7, Q9 — every self-consistency check run, passed) |
| Data sufficient to stand up a working Ask Larder instance | **Pass, as of the go-live fix** — 211 knowledge chunks live, retrieval and the fallback rule both independently re-verified correct |
| Multi-tenant isolation | **Pass** — 41/41, including every Block Q table |
| Owner-approval gate actually reachable through the product | **Was a hard Fail, now Pass** — the defining finding of this validation pass |

---

## 12. Fix-priority list

**Already fixed and verified in this session** (not a backlog — listed for the record):
1. Ingestion never wired into `go-live`/`publish-version` (blocking prerequisite, fixed before Q1 started).
2. LIC0 "not sure yet" had no schema value (Q3 finding).
3. RSA/Food-Service marshal-identity data loss (Q6 finding).
4. Gap-detection loop over-strict grading (Q6 finding).
5. Overnight trading hours silently discarded (Q7 finding).
6. Menu allergen field-name mismatch (Q7 finding).
7. **Module `draft → pending_approval` transition missing app-wide** (Q9 finding — the headline item).
8. Licence-detail "sourced from document" state never persisted (Q9 finding).
9. RSA marshal `false || null` state bug (Q9 finding).

**Open, deliberately not fixed in this pass — for the founder's attention:**
1. **Coachman's Arms Hotel (wizard-built)'s compliance-critical gaps are real and still open**, by design (they're supposed to be — this is what "log, don't guess" looks like): licence number never given in the source interview (placeholder flag text in its place), licensed capacity forced to a UI-required value (250) with the contradiction and unconfirmed status flagged on Review & activate, Food Safety Supervisor identity unresolved between two named people, security firm name unresolved between two names, three business-continuity contact types never captured (no source material existed for them). None of these should be silently closed — they need the actual venue owner's follow-up, which is exactly the point of surfacing them this clearly instead of guessing.
2. **Two hand-seeded venues now exist alongside their wizard-built counterparts** (`block-p-pub-coachmans-arms` and `coachmans-arms-wizard`). The synthesis recommendation from Q9 stands: decide whether to deprecate the hand-seeded original now that a wizard-produced, fully live equivalent exists, or keep both — this is a product decision, not a technical one, and deliberately left to the founder.
3. **Equipment/station inventory copy claims venue-type branching that the built page doesn't actually have** (documentation-vs-implementation drift, cosmetic, not a data-loss bug).
4. **Two lower-severity UI findings from Q6** (equipment list not refreshing after create, a create-station button that intermittently self-disables) were left unfixed because they touch the shared, already-working `CreateStationForm` component used elsewhere in the app, and Q6's own report flagged the session's Browser-pane tooling as unreliable enough that a same-session diagnosis risked conflating tooling flakiness with a real bug. Worth a dedicated look with fresh tooling.
5. **The Ask Larder test-set discipline should be run on The Split Note too** — Q6 authored content and ran the internal gap-detection test-question tool, but never actually exercised the real staff-facing `/api/staff/ask-larder` chat the way Q9 did. Cheap to close, not done in this pass.

---

## 13. Screenshots

Captured across Q6 (every wizard page, multi-viewport on the menu/modifier page) and Q9 (review/activate, content-authoring flow, the modules list before and after the go-live fix, staff PIN-login views, Ask Larder test transcripts) — referenced inline in `q6-simulated-onboarding-transcript.md` and `q9-real-standup-transcript.md` respectively rather than duplicated here.

---

## 14. Overall verdict

**Yes — Block Q is a successful onboarding wizard, and its second real product (The Coachman's Arms Hotel, `coachmans-arms-wizard`) is now a genuine, independently-verified live Ask Larder instance**, satisfying the Decision Log's 6 September 2026 requirement. The wizard's mechanism — structured guaranteed-field capture, the hybrid gap-detection content loop, real embedding, real retrieval, real tier-gated fallback enforcement — is sound and was proven so under three independent kinds of pressure: a deliberately messy fictional interview (Q6), a blind grader with no knowledge of the implementation (Q7), and a real, already-researched venue's full compliance and content load (Q9). The single most valuable outcome of this entire pass was not a feature — it was finding, on the very first venue ever built without a seed script, that the product's own non-negotiable approval gate had no way to actually be reached. That is precisely the kind of gap hand-seeding can hide indefinitely and real software use cannot, and it is now closed and re-verified against real data, not just patched and assumed fixed.
