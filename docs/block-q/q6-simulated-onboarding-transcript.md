# Block Q6 — Simulated Onboarding Transcript

**Status: live test run + transcript only. No app code, migration, or other `docs/block-q/*.md` file was modified in producing this.**

**Role:** I played an onboarding specialist running the completed Block Q wizard end-to-end against a new fictional venue, deliberately varying answer quality (clean / vague / contradictory) the way a real interview actually goes, per the Decision Log's 6 Sep 2026 standing requirement. This is a genuine test, not a scripted happy path — bugs found are reported as found, not routed around.

**Dev server:** already configured via `.claude/launch.json` (`larder-dev`, Node 24 wrapper script). It was **not already running** — I started it myself with `preview_start`. I did not stop it; it is still running for Q7 and the orchestrator.

---

## 1. The fictional venue

**The Split Note** — a small licensed live-music venue at 88 Brunswick Street, Fortitude Valley, Queensland 4006. Trading name "The Split Note", legal entity "Split Note Live Pty Ltd", ABN 54 123 456 789 (fictional). Owner: Marcus Delaney (`marcus@thesplitnote.com.au`).

**Why this profile, and what it was chosen to stress-test:**

- **Not the bar, pub, cafe, or Coachman's Arms** — genuinely new venue type (live music venue with a bar and light snacks, not a full kitchen).
- **Queensland, not Victoria** — deliberately chosen to trigger the `founder_escalation: non_vic_state` branch *naturally*, per the task's own permission to use a real, natural trigger rather than forcing a nonsensical answer. This also exercises the WWCC state-naming lookup (QLD's actual equivalent is the **Blue Card**, a genuinely different name from Victoria's "Working with Children Check" — a sharper naming-divergence test than any Block P venue could provide, since all three were Victoria-based).
- **Full on-premises liquor licence, live-music-driven crowd control** — capacity ~400 on a big night, mandatory crowd controllers on gig nights. Tests the licensed path fully (licence detail, crowd control, RSA) with a different licence-type answer (On premises, not General/Club) than the prior passes likely used.
- **Bar snacks / packaged, low-risk food only** — no full kitchen, no Class 1/2 risk. This deliberately routes AWAY from the Food Safety Supervisor branch, which none of the three Block P passes tested as a genuine "not triggered" skip (bar and pub had full kitchens; cafe had a small but still Class 1/2 kitchen). This is real, fresh branch coverage: does FOOD0 "not triggered" cleanly skip FSS identity, FSS cert type creation, and Food Handling roles entirely? Confirmed yes (§3, Page 6/Food service).
- **Multiple key roles** — RSA marshal (Jodie Chen, Duty Manager) and a Sound Engineer role that doesn't cleanly map to FOH/BOH (parallel to Pub P3's Robbo dual-role cellarman case, tested honestly the same way: left as "no department" rather than forced into one).
- **No gaming/EGM** — a clean, realistic "No" (live-music venues in Queensland essentially never hold gaming entitlements; this was a deliberate, considered answer, not a default). Founder escalation is still exercised via the non-Victoria state, so I didn't force a second, implausible escalation just to test the mechanism twice.

**LIC0 root gate:** I did not reflexively pick "Full licence." Given the venue's actual profile (an on-premises live-music venue that sells alcohol as a core part of its business), "Full licence" is the genuinely correct answer, and I record here that I deliberately considered "Limited licence" and "Not sure yet" before selecting it, per the task's instruction to treat this as a real, not reflexive, choice.

**Final venue slug: `the-split-note`** (URL: `http://localhost:3000/the-split-note/owner/...`). Owner login: `marcus@thesplitnote.com.au` / `SplitNote2026!`.

---

## 2. Page-by-page log

Pages are numbered per the actual build's step list (1–15, shown in the wizard's own sidebar), which differs slightly from Q2's original numbering by including Equipment as a real numbered step (08) rather than a sub-page.

### Page 1 — Owner + venue creation
**Entered:** Venue name "The Split Note" (slug auto-filled correctly as `the-split-note`), owner name "Marcus Delaney", email `marcus@thesplitnote.com.au`, password. **Clean.** Venue and owner created successfully; landed on Venue basics with the full 15-step nav visible.

### Page 2 — Venue basics
**Entered:** Legal name "Split Note Live Pty Ltd" (different from trading name — tests the legal-name distinction), state **Queensland**, address "88 Brunswick Street, Fortitude Valley QLD 4006", ABN "54123456789". **Clean, confident answers** (per Q3's guidance, this is the page where an owner "rattles off" these facts).

**Wizard behaviour:** the instant Queensland was selected, an inline **"FLAGGED FOR FOUNDER REVIEW — This venue is outside Victoria"** banner appeared, with copy stating Larder's licensing/food-safety taxonomy is calibrated for Victoria first and the founder will confirm before modules go live — and the wizard **did not block**, exactly matching Q2 §3's VICFLAG behaviour (continue, don't dead-end). This banner persisted, unprompted, all the way through to the final Review & activate page (§2, Page 15) — a genuine cross-page consistency win.

### Page 3 — LIC0 root licensing gate
Radio options rendered exactly as spec'd: No licence (fully dry) / No licence (BYO only) / Limited licence / Full licence / **Not sure yet** (the `unconfirmed` value from the Q2 orchestrator addendum, confirmed present in the DOM as `option value="unconfirmed"`).

**Answer:** Full licence — a deliberate, considered choice (see §1 above), not a reflex.

### Page 4 — Licence detail
**Entered:** Licence type "On premises", licence number "QLD-OL-88291" (fictional), **licensed capacity 400** (left the "sourced from the actual licence document" checkbox **unchecked** — deliberately unconfirmed, matching the messy-interview pattern), trading hours Wed–Sat 5pm–12am/1am/2am (Mon/Tue/Sun closed), late-night endorsement Yes, conditions noting an outdoor terrace curfew, gaming/EGM **No**.

**Wizard behaviour — worth flagging positively:** this page's own built-in copy already primes the specialist for exactly the contradiction pattern the task asked me to create: *"Unconfirmed for now. A real venue interview once gave three different capacity numbers across one conversation and none was ever reconciled, so treat this as a follow-up until the licence document itself confirms it."* This is a direct, load-bearing citation of the canonical Coachman's Arms case baked into the product UI itself.

**Deliberate contradiction planted (the task's primary required test):** I entered capacity **400** here, unconfirmed. Later, in the Business Continuity escalation-contact notes (§2, Page 10) and again in Sound Engineer/roster context, I had the specialist (me) reference **"over 350 through the door"** on a sold-out night — a different, unreconciled number, exactly the D.1.2 pattern. **The wizard did nothing to flag or reconcile this** — there is no cross-field consistency check between `venue_licence_profile.licensed_capacity` and freetext elsewhere. This is expected (Q2 never claims to build one — the reconciliation is meant to happen at the content-authoring/grading stage, not the intake stage), but it confirms the wizard will silently store two irreconcilable numbers without ever surfacing the conflict to the owner on Review & activate (see Page 15 below — the review page did not list this as an open item).

### Page 5 — Crowd control gate
**Answer:** "Yes, mandatory or elective" (realistic for a ~400-capacity live venue running weekend gigs).

**Page 5a/5b:** Security firm name entered as a **deliberately vague, two-candidate answer**: *"Ironbark Security, or maybe it's Ironclad, one of those two. Priya in the office deals with them directly and would have the actual contract."* Individual controller licence numbers left as: *"Not something Marcus had on hand during the interview. Follow up with Priya, who books the crowd controllers each week."* Both fields showed the **"NOT YET A STRUCTURED FIELD"** badge exactly as Q2 §3 specifies. This is a clean D.1.5 pass: freetext, visibly labeled as unstructured, not silently dropped, not stuffed into an unrelated column.

### Page 6a/6b — RSA
**6a (roles requiring RSA):** **This page has no home for its own data on first visit** — see Bug #1 below. Once staff roles existed, I selected Bar Supervisor, Bartender, Door/Floor Staff, and Duty Manager (not Kitchen Hand, not Sound Engineer) — a genuine role-by-role walkthrough, not a blanket "everyone."

**6b (marshal identity confusion — deliberate test):** Per the task's explicit instruction to reproduce Q3's "name someone, second-guess, confirm" pattern: I first typed **"Cameron"** into the marshal name field, then overwrote it with the actual final answer, **"Jodie Chen"** (Duty Manager), phone and email. The wizard displayed the required **"This person may not have a Larder login yet. Their name is saved now; link it to a login once they are invited under Staff"** note immediately on selecting "Yes" — satisfying Q1's D.1.4 requirement.

### Page 7 — Food service level
**Answer:** "Bar snacks or packaged, low risk food only" — a deliberate, realistic choice for a live-music venue whose food offering is toasted sandwiches and packaged snacks, and a genuinely new branch versus the three Block P passes (none tested the clean "not triggered" skip). Copy correctly framed this as risk-class, not kitchen-size ("A small prep area can land in the same risk class as a full kitchen").

**Result:** cleanly skipped straight to Menu — no FSS identity page, no FSS certificate-type creation, no Food Handling-roles page. Confirmed via the Certificate Types page later, which showed only RSA as "already configured" (§2, Page 14).

### Page 8a — Menu (manual grid, as instructed — did not use upload-parse)
Six items entered: Loaded Fries (food, gluten+dairy), Toasted Cheese & Pickle Sandwich (food, gluten+dairy — see typo note below), Mixed Nuts/packaged (food, nuts+peanuts), House Red/White by the glass (drink, no allergens), Tap Beer – Local Lager (drink, gluten), Espresso Martini (drink, no allergens).

**Typo note (mine, not the app's):** I typed the literal string `&amp;` instead of `&` in "Toasted Cheese &amp; Pickle Sandwich." The wizard stored and displayed it verbatim, exactly as typed — correct behaviour (it doesn't double-encode or mangle input), but it is a real cosmetic artifact now sitting in this venue's data that Q7 will see. Flagging so it isn't mistaken for something Q7 introduced.

### Page 8b — Modifier group (required test element)
Added a **modifier group + modifier** to Loaded Fries: group "Cheese choice", option "Vegan cheese (dairy free)", **removes: dairy**. Saved correctly and rendered back as "CHEESE CHOICE — Vegan cheese (dairy free) · removes dairy" — confirms `menu_item_modifier_groups`/`menu_item_modifiers` (migration `20260907110000`) working end-to-end through the actual UI.

### Page 8c — Equipment
Five stations created: **Bar**, **Cellar / Keg Store**, **FOH Sound Desk**, **Stage**, **Green Room / Servery**. Copy is generic ("Bar, cellar, or kitchen stations, whatever this venue actually has") with no venue-type-branched question set — see UX finding below. See Bug #2 (list doesn't refresh after create) and Bug #3 (Create station button silently disables under certain edit sequences) below — both hit and worked around during this step.

### Page 9 — Promotions / happy hour
**Answer:** Yes. Three entries added — Wed/Thu/Fri, 6–7pm, "$2 off tap beer and house wine." **Deliberate secondary inconsistency** (smaller than the capacity one, per the task's allowance for "mildly inconsistent" answers): the Friday entry's own discount-description text says *"Honestly Wednesday's dead most weeks, the real crowd is Thursday and Friday"* — directly undercutting the Wednesday promotion I'd just entered as a real recurring happy hour. The wizard stored this as-is; no contradiction flag (expected — this is freetext within a single field, not a structured cross-check).

### Page 10 — Business continuity
Six contacts entered: Electrician (clean), Plumber (clean), Locksmith (clean, minor `&amp;` typo again — same pattern as Page 8a), **Insurer (deliberately vague — placeholder-style answer: "Not sure of the broker's name off the top of my head", with notes "Marcus would have to dig out the actual policy paperwork... Follow up needed")**, **Escalation contact (Priya Osei, venue manager)** — this is where I planted the capacity contradiction: *"On a sold out night we've had over 350 through the door before the doors staff started turning people away"* vs. the 400 entered on Page 4. Fire/police non-emergency (clean).

### Page 11a — Staff roles
Roster location entered as a **deliberately vague, deferred answer**: *"Priya keeps it in some rostering app, Squarepeg maybe? Honestly I don't open it myself, that's her area."* — directly modelled on Pub P3's Gary/Dave/Deputy pattern but with different specifics, not copied. Six roles created: Duty Manager (FOH, **Authorized** — deliberate elevation, holds safe/alarm codes), Bar Supervisor (FOH, Frontline), Bartender (FOH, Frontline), Door/Floor Staff (FOH, Frontline), Kitchen Hand (BOH, Frontline), **Sound Engineer (No department, Frontline)** — a genuine dual/ambiguous role left honestly untagged, parallel to Pub P3's cellarman Robbo case.

### Page 11b — Invite staff
Four named individuals invited: **Jodie Chen** (Duty Manager — the RSA marshal, reinforcing the identity established on Page 6b), **Priya Osei** (Bar Supervisor — the escalation contact from Page 10), Theo Vukovic (Bartender), Ravi Fernando (Kitchen Hand). All showed "not yet logged in" status, consistent with the D.1.4 login-unresolved theme running through this venue's data.

### Page 12/13 — SOPs & training content (the gap-detection loop — required test element)
Authored **three** Part B topics in full, each through the real intake → author → self-consistency-test loop:

**1. Welcome & how we work** — 4 sections (welcome/orientation, roster location, offline fallback, escalation contact), 3 check questions. Ran the self-consistency test tool twice:
- *"Where do you check who's on shift?"* → **GAP.** The AI grader's verdict: *"The retrieved content doesn't give a firm, confirmed answer... 'understood to be Squarepeg, though that hasn't been confirmed in writing.'"* — **this is a significant, real finding, not a wizard malfunction: see Bug #4 below.**
- *"Who do you ask if you're unsure about an RSA question and the marshal isn't on shift?"* → **ANSWERED** correctly, citing the actual section text.
- Result: 1/2 checks pass, logged and visible in a "PAST CHECKS" list under the module.

**2. RSA & responsible service** — 4 sections (who needs RSA and why, refusal script, marshal escalation authority naming Jodie Chen by name, intoxication signs), 2 check questions, both **ANSWERED** (1/1 checks pass after I fixed a self-inflicted error — see below). Sample verified answer: *"Jodie Chen, the designated RSA marshal at The Split Note, has the final say... If Jodie isn't on shift, escalate to whoever is running the shift instead."*

**Self-caught authoring mistake:** while adding the intoxication-signs section, my click landed on the **"This section is a secret that should be tier-gated"** checkbox by accident, marking ordinary safety content as restricted. I caught this immediately by checking the DOM state and unchecked it before saving — exactly the kind of accidental-restriction risk Q1 row 54 and Q3's Page 12 guide flag as a real, unmitigated residual gap (nothing in the UI stops this from happening silently if the specialist doesn't check).

**3. Closing procedures & premises security** — 3 sections: (a) the closing sequence as a genuine **numbered step list** (explicitly permitted here per Q1's D.2.1 exception), (b) a section holding the safe/alarm code, **correctly marked restricted** (with an explicit `[Test/placeholder code for this onboarding session only: 4471 — not a real code, flagged here as a placeholder pending the real one]` disclosure, per D.2.4's placeholder-flagging requirement), (c) an explicit **reconciliation section** stating that only Jodie Chen or another Authorized-tier staff member can complete the safe-drop/alarm steps, and a Frontline-tier closer must be paired with a code-holder — directly implementing the bar-pass "alarm-code-vs-who-sets-it" fix pattern D.2.4 calls out. Two check questions, both **ANSWERED**, including the direct test: *"Can a Frontline-tier staff member close alone?"* → *"No... they must be paired with someone who holds the codes, or coverage should be confirmed with Marcus in advance."* Confirmed the restricted code section correctly received **no check question** (the UI's own copy — *"A section marked restricted never gets a check question attached, since one would have to embed the secret itself"* — held true in practice).

### Page 14 — Certificate types
"Already configured: RSA" only (correctly — Food Handling/FSS never triggered, per Page 7). **WWCC test (required test element):** the page showed **"FLAGGED FOR FOUNDER REVIEW — This state's WWCC naming isn't confirmed yet... Enter the correct local name if known, or leave this for the founder to confirm."** I entered the correct Queensland name, **"Blue Card (Working with Children Check, Queensland)"** — this is the sharper naming-divergence case Q3 flagged as untested by either Block P venue (both Victoria-based). Also added First Aid.

### Page 15 — Review & activate
Summary tiles: 4 staff invited, 6 roles, 3 modules, 0 pending approval, 3 certificate types, 6 menu items, 8 contacts. The founder-escalation banner (non-Victoria state) was still visible here, carried through consistently from Page 2. **Notably absent:** no consolidated list of the other open items I'd flagged along the way (the capacity contradiction, the vague insurer answer, the security-firm identity confusion) — only the state-escalation flag surfaces automatically; everything else would depend on the human specialist remembering to raise it verbally, per Q3's own guidance for this page ("walk through the specific open items logged across earlier pages one more time here" — that's specialist judgement, not a wizard feature).

Clicked **"Mark onboarding complete."** Confirmed via the page's own copy: *"Modules still go live one at a time from the Modules page, each with your explicit approval. Marking onboarding complete here does not skip that gate."* — CLAUDE.md's non-negotiable owner-approval-gate rule is respected; completing the wizard does not auto-publish anything.

---

## 3. Real bugs and gaps found (not routed around)

**Bug #1 — RSA page is a genuine dead end on first visit (real, reproducible, data-loss consequence).** Page 6a/6b (RSA) asks "which roles require RSA," but Staff Roles isn't captured until page 11 — so on first visit, the role list is empty and the page's **Continue button is disabled** (`<button disabled>`), with no visible error explaining why. Because I had already typed the RSA marshal's name, phone, and email into the same page before discovering this, **that data was silently lost** — Continue never fired, nothing was ever POSTed, and returning to the page later (after adding staff roles) showed the marshal fields completely empty. This is exactly the pattern the task asked me to test honestly rather than route around: I documented it, then used the fact that "every page is independently reachable" (confirmed true) to jump ahead to Staff Roles, then came back and re-entered the marshal identity, which then saved correctly (`POST /api/owner/onboarding/rsa → 200 OK`). **Impact:** a real specialist following the wizard's own page order top-to-bottom will hit this every single time on a licensed venue, and will lose any RSA-marshal identity data typed before discovering the block, since there is no autosave.

**Bug #2 — Equipment/station list does not refresh after a successful create.** Creating a station (`POST /api/owner/stations → 200 OK`) left the on-page list still showing "No stations yet." until a full page reload. The write itself was never lost (confirmed via reload), but the UI gives no positive feedback that the create worked, which would read as broken to a real specialist mid-interview.

**Bug #3 — the Equipment page's "Create station" button silently disables itself.** After using it successfully once, subsequent attempts sometimes left the button `disabled: true` with no visible reason, and clicks (including several tried at different exact coordinates) produced no network request at all. Retyping the field values with real keystrokes (not just setting `.value`) re-enabled it. I could not fully isolate the trigger, but this cost one full lost "Cellar / Keg Store" station creation on the first attempt (I had to redo it). Worth an engineer's attention — smells like a controlled-input state not always syncing with a programmatic value change, similar in kind to Bug #6 below.

**Bug #4 — the gap-detection self-consistency check appears to grade on "is the underlying fact certain" rather than "is the check-question answerable from this module's text alone."** Q2 §3 defines the loop's job as literally that second thing. When I ran *"Where do you check who's on shift?"* against Welcome & how we work, the module's own text gives a complete, honest, non-fabricated answer — *"check with Priya directly"* — which is squarely the D.2.2 gold-standard pattern (state the honest uncertainty about the app name, but give a real, actionable answer to the actual question asked). The tool nonetheless returned **GAP**, reasoning that the app name itself ("Squarepeg") isn't confirmed. If this generalizes, the loop will systematically flag well-authored, honest "ask X" content as gaps whenever any fact adjacent to the answer is uncertain — which is most of the time for a real venue — training specialists to over-fill/pad content just to clear the check, working against the exact principles-based, no-fabrication discipline the rest of the system is built to encourage. This is the single most consequential finding from this run and is worth an explicit design review, not a quick prompt tweak, before this loop is trusted for grading at scale.

**Bug #5 — a sidebar step-nav highlighting desync after completion.** Once `wizard_sessions.status` was set to `'completed'` (via "Mark onboarding complete" on Page 15), every subsequent page I navigated to directly by URL (e.g. Menu, page 07) showed **both** its own step *and* "15 Review & activate" highlighted red/active in the sidebar simultaneously, reproducible at both tablet and desktop widths. Purely visual — the underlying page content and data were always correct per `get_page_text`/DOM inspection — but confusing, since it suggests the nav no longer tracks "what page am I on" once onboarding is marked done.

**Minor / non-bugs worth recording:**
- Equipment's page copy claims the question set "branches by venue type" (Q2 §3), but the actual built page is one generic "station name / slug / module" form regardless of venue type — a live-music venue's PA/stage gear has no dedicated prompt, though the freetext name field accommodates it fine in practice. Documentation-vs-implementation gap, not a functional bug.
- My own two `&amp;` literal-string typos (Toasted Cheese sandwich name, Fortitude Locks & Security contact name) — the wizard stored and displayed them exactly as typed, which is correct, non-mangling behaviour, but they're now sitting in the venue's real data for Q7 to see. Flagged so they aren't mistaken for a Q6-introduced app bug.
- Dev-environment HMR WebSocket console errors throughout (`ws://localhost:3000/_next/hmr?...failed`) — consistent with the known Node 24 / dev-environment quirk already on file in project memory, not a real application defect.
- The Browser-pane tooling itself was frequently unreliable this session (blank/stale screenshots, `get_page_text` lagging one navigation behind the live DOM, occasional "outside viewport" ref errors, and `scroll` sometimes not moving the page). Where this happened I cross-checked with `get_page_text`, direct DOM `javascript_tool` queries, and `read_network_requests` rather than trusting a single screenshot — several of the findings above (Bug #1, the Menu/Equipment/Promotions page-skip near-miss, Bug #5) were only caught because of that cross-checking discipline. Flagging this explicitly so Q7 doesn't mistake pane flakiness for app behaviour, and doesn't assume every screenshot in a future pass is trustworthy on its own.

---

## 4. Multi-viewport findings (Menu page, including the modifier grid)

Tested `http://localhost:3000/the-split-note/owner/onboarding/menu` at mobile (375×812), tablet (768×1024), and a wide desktop (1440×900, since the Browser pane's own native width sits close to a layout breakpoint around ~780–800px and can misleadingly show the collapsed mobile nav even at "desktop").

- **Mobile (375×812):** Clean single-column stack. Sidebar collapses to a tappable "▶ All steps" accordion. Menu item cards stack vertically with "Add a swap or modifier" / "Delete" links wrapping naturally. The Loaded Fries modifier group ("CHEESE CHOICE — Vegan cheese (dairy free) · removes dairy") renders legibly with no truncation or overflow. No horizontal scroll.
- **Tablet (768×1024):** Full two-column layout (sidebar + content) appears, unlike the narrower "desktop" pane width — i.e. the breakpoint that switches from collapsed-accordion to full-sidebar sits somewhere between the native pane width and 768px, not at a conventional mobile/tablet boundary. Allergen checkbox row wraps cleanly into two rows (gluten/dairy/eggs/nuts/peanuts, then shellfish/fish/soy/sesame). No overlap or clipping.
- **Desktop (1440×900 emulated):** Same two-column layout as tablet, correctly using the extra width for wider form fields rather than stretching content awkwardly. This is where Bug #5 (nav highlight desync) was confirmed reproducible, not viewport-specific.

No layout breakage, illegible text, or touch-target sizing problems found at any of the three sizes. The one real cross-viewport-adjacent finding was Bug #5 (a data/state issue, not a responsive-CSS issue).

---

## 5. My own read before Q7's independent grading

**This looks like a genuinely successful, informative onboarding run**, in the sense that matters most for this exercise: it exercised real branches (non-Victoria escalation, the FSS "not triggered" skip, a modifier group, the restricted-content tiering checkbox including my own accidental misuse and correction, the numbered-list exception for closing procedures, the gap-detection loop with both a real PASS and a real, substantive GAP), planted the required capacity contradiction across two different pages, and surfaced five concrete, reproducible bugs/gaps rather than a clean bill of health.

Where I'd push back on my own work before calling it "done": the capacity contradiction (400 vs. "over 350") was successfully planted but **never surfaced anywhere the wizard itself would catch it** — not on Licence Detail, not on Business Continuity where the second number lives, not on the final Review & activate summary. That's expected given Q2's scope (the wizard doesn't claim to do cross-field reconciliation), but it means the burden is entirely on whoever grades this data downstream — Q7, and eventually the founder — to actually go looking for it rather than trusting the review page's summary tiles. I'd flag that as the single most important thing for the orchestrating session to confirm is genuinely being caught somewhere in the pipeline, since it's exactly the failure mode Q1's D.1.2 rubric exists to catch.

Bug #4 (the gap-detection loop's apparent over-strictness) is the finding I'd most want a second opinion on — it's a real, reproduced behaviour, but I only ran two test questions against it in this pass, and it's possible a larger sample would show it's better calibrated than these two data points suggest.
