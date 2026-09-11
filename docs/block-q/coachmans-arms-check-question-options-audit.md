# Coachman's Arms Hotel — check-question options audit and re-save

Closes the same gap the Split Note fix left open: `docs/block-q/split-note-validation-transcript.md`'s addendum fixed and re-verified The Split Note, but Coachman's Arms Hotel (the original Q9 wizard-built venue, `coachmans-arms-wizard`) was authored through the identical pre-fix `module-sections` route during Q9's real standup, so it was highly likely to carry the same `options=[]` signature. This closes that gap for real, not by inference.

Venue: The Coachman's Arms Hotel, venue_id `79a9ea70-8302-4ab8-b501-8d27dc85457e`, slug `coachmans-arms-wizard`. 14 modules, all `status='live'`.

---

## 1. Confirmed the bug was present

```sql
select m.title, cq.section_order, cq.question,
  jsonb_array_length(coalesce(cq.options,'[]'::jsonb)) as num_options
from check_questions cq join modules m on m.id = cq.module_id
where m.venue_id = '79a9ea70-8302-4ab8-b501-8d27dc85457e';
```

**Result: every one of the 46 `check_questions` rows across 13 of the venue's 14 modules had `num_options = 0`.** Same signature as the Split Note bug — zero answer buttons would render, permanently blocking Continue and module completion for every staff member at every module.

The 14th module, "Safe access and alarm/premises access (restricted)," correctly has no check questions at all — consistent with `module-sections/route.ts`'s server-enforced rule that a restricted section can never carry a check question. Not a gap; expected.

## 2. Re-saved all 13 affected modules through the real, fixed authoring route

Real multiple-choice options were constructed directly from each module's own already-authored section content (not re-authored from scratch), then POSTed to `/api/owner/onboarding/module-sections` via an authenticated owner session (`coachmans-arms-wizard-owner@example.com`), preserving each module's existing `moduleId`, `topicKey`, `title`, and section content exactly — an update, not a duplicate create. Script: `scratch/coachmans-arms-resave-options.mjs`. Raw results: `scratch/coachmans-arms-resave-results.json`.

| Module | Questions | Chunks before | Chunks after | HTTP | Status after |
|---|---|---|---|---|---|
| Allergen awareness and cross contact | 4 | 18 | 18 | 200 | live |
| Business continuity and emergencies | 3 | 10 | 10 | 200 | live |
| Cash handling | 4 | 13 | 13 | 200 | live |
| Cellar and gas safety, keg handling and tap lines | 7 | 30 | 30 | 200 | live |
| Closing procedures and premises security | 4 | 13 | 13 | 200 | live |
| Crowd control and door security | 4 | 14 | 14 | 200 | live |
| Food safety fundamentals | 5 | 20 | 20 | 200 | live |
| General equipment operating and cleaning | 1 | 7 | 7 | 200 | live |
| General workplace safety | 4 | 17 | 17 | 200 | live |
| Happy hour and promotional pricing | 3 | 12 | 12 | 200 | live |
| RSA and responsible service | 5 | 21 | 21 | 200 | live |
| Trading hours, licence and patron capacity | 4 | 16 | 16 | 200 | live |
| Welcome and how we work | 2 | 14 | 14 | 200 | live |

**All 13 chunk counts match exactly, before and after** — confirming no content was lost or duplicated by the re-save (`ingestModule` chunks by paragraph plus one chunk per question; since section content and question text were sent unchanged, an exact match was the expected, verifiable outcome, not a coincidence).

Confirmed via direct SQL after the run:

```sql
select m.title, m.status, count(cq.id) as num_questions,
  count(cq.id) filter (where jsonb_array_length(coalesce(cq.options,'[]'::jsonb)) >= 2) as questions_with_options,
  count(cq.id) filter (where cq.correct_option_index is null) as null_correct_index
from modules m join check_questions cq on cq.module_id = m.id
where m.venue_id = '79a9ea70-8302-4ab8-b501-8d27dc85457e'
group by m.title, m.status;
```

All 46 rows across all 13 modules now show `questions_with_options = num_questions` (every question has ≥2 real options) and `null_correct_index = 0` (every question has a valid correct answer). All 13 modules remained `status='live'` throughout — the update path never touches status, matching the Split Note precedent.

Section content was also confirmed unchanged: section counts and total content character counts per module after the re-save match what was read from the database before the re-save (4+3+4+7+4+4+5+1(→2, see note)+4+3+5+4+4 sections respectively), and the untouched 14th module ("Safe access…") was never called by the re-save script and is confirmed unaffected.

*Note on "General equipment operating and cleaning":* this module's `check_questions` table shows 1 question, but `module_sections` shows 2 sections — the second section (`section_order` 1, "Where the rest of our equipment content actually lives") has no attached check question. That's original, unrelated content structure (a cross-reference section, not a testable fact), not something this pass touched or needs to touch.

## 3. Re-ran the actual staff completion step live

Logged in as **Ash Thompson** (Bartender, `frontline`-tier, PIN `5678`) via a real Playwright browser session, through the actual staff login flow (`/coachmans-arms-wizard/login`), and opened **"Welcome and how we work"** — the module every new hire hits first. Before this session, `staff_module_progress` had zero rows for this venue at all, confirming no one had ever gotten past the bug to complete anything.

Script: `scratch/coachmans-arms-post-fix-walkthrough.mjs`. Screenshots: `scratch/ca-postfix-*.png`.

| Step | Result |
|---|---|
| Login as Ash Thompson, PIN `5678` | **Pass.** Redirected to `/coachmans-arms-wizard/welcome`. |
| Modules list | **Pass.** 0 of 14 complete, module rows listed as real links. |
| Open "Welcome and how we work" | **Pass.** |
| Click through sections 1 and 2 | **Pass.** |
| Check question: "Who runs the roster and most of the day to day at The Coachman's Arms?" | **UNBLOCKED — confirmed fixed.** 4 real answer options rendered (Dave Kowalski, Gary Pappas, Steph Vella, Robbo). Selecting one revealed the Continue button. Screenshots: `ca-postfix-checkq-1-options.png`, `ca-postfix-checkq-1-after-select.png`. |
| Click through remaining sections | **Pass.** |
| Check question: "If someone asks a detailed question about gaming machine rules, what should you do?" | **UNBLOCKED.** 4 real options rendered, same pattern. Screenshots: `ca-postfix-checkq-2-options.png`, `ca-postfix-checkq-2-after-select.png`. |
| Module completion | **Pass.** Reached the Stamp screen ("APPROVED", "Welcome and how we work completed", "Back to modules"). Screenshot: `ca-postfix-10-completed.png`. |

**The walkthrough completed end to end** — a real staff login, real PIN auth, real check questions with real rendered options, genuine module completion. This is not a database-level inference; it is the actual staff-facing product working for a real (fictional) staff member.

Confirmed via SQL: `staff_module_progress` now has completed rows for Ash Thompson on this module.

### Minor aside, not fixed (out of scope for this pass)

`staff_module_progress` picked up **4** rows for this single completion (same `user_id`/`module_id`, `status='completed'`, timestamps within ~150ms of each other), not 1. This looks like a client-side double/triple-submit on `finish()` in `ModuleRunner.tsx` (possibly a React re-render or the `force: true` Playwright click bypassing a disabled state faster than the UI can update) rather than anything to do with the options bug just fixed. It doesn't block completion and doesn't affect Ask Larder or module status, so it wasn't investigated further here — flagging it as a real, separate, low-severity finding worth a follow-up look at `finish()`'s idempotency.

## 4. Verdict

**Confirmed and fixed for real, not just inferred from the Split Note precedent.** All 46 check questions across Coachman's Arms Hotel's 13 content-bearing modules had the exact same `options=[]` defect as the Split Note bug — expected, since both venues were authored through the same pre-fix route. All 13 modules were re-saved through the real, fixed authoring path with genuine options grounded in each module's own content, content and chunk counts were confirmed unchanged before and after, and the previously-guaranteed-blocked completion step was re-run live as a real staff member and genuinely completed, not just verified in the database.

Coachman's Arms Hotel is now, like The Split Note, staff-usable end to end.
