# Block P4: Module Index (The Coachman's Arms Hotel)

Internal index only. Not part of the content handed to a new hire.

| # | Module | Roles it applies to | Sections |
|---|---|---|---|
| 01 | Welcome and how we work | Duty Manager, Bar Supervisor, Bartender, Floor Staff, Cellarman, Head Chef, Sous Chef, Kitchen Hand | 4 |
| 02 | Trading hours, licence and patron capacity | Duty Manager, Bar Supervisor, Bartender, Floor Staff, Cellarman | 4 |
| 03 | RSA and responsible service | Duty Manager, Bar Supervisor, Bartender, Floor Staff, Cellarman | 5 |
| 04 | Crowd control and door security | Duty Manager, Bar Supervisor, Bartender, Floor Staff | 4 |
| 05 | Happy hour and promotional pricing | Duty Manager, Bar Supervisor, Bartender, Floor Staff | 3 |
| 06 | Food safety fundamentals | Head Chef, Sous Chef, Kitchen Hand | 5 |
| 07 | Allergen awareness and cross contact | Head Chef, Sous Chef, Kitchen Hand, Bar Supervisor, Bartender, Floor Staff | 4 |
| 08 | Cellar and gas safety | Cellarman, Duty Manager, Bartender | 5 |
| 09 | Keg handling and tap lines | Cellarman, Bartender, Duty Manager | 4 |
| 10 | General workplace safety | Duty Manager, Bar Supervisor, Bartender, Floor Staff, Cellarman, Head Chef, Sous Chef, Kitchen Hand | 4 |
| 11 | Cash handling | Duty Manager, Bar Supervisor | 4 |
| 12 | Closing procedures and premises security | Duty Manager, Bar Supervisor | 4 |
| 13 | Business continuity and emergencies | Duty Manager, Bar Supervisor, Bartender, Floor Staff, Cellarman, Head Chef, Sous Chef, Kitchen Hand | 3 |
| 14 | Safe access procedures (restricted, authorized tier) | Duty Manager, Bar Supervisor | 1 |
| 15 | Alarm and premises access (restricted, authorized tier) | Duty Manager, Bar Supervisor | 1 |

## Role scope reasoning

- **All roles** get Welcome, General workplace safety, and Business continuity, because every role at this venue, kitchen included, needs the emergency basics, hazard reporting practice, and orientation content regardless of department.
- **FOH roles** (Duty Manager, Bar Supervisor, Bartender, Floor Staff) plus **Cellarman**, get trading hours/licence, RSA, and door security content, because Robbo pulls beers when the bar is flat out and needs the same patron facing grounding as the rest of the floor, even though his primary job is the cellar. This mirrors the prior bar pass's Glassie dual tag: a role that's mostly one department but genuinely crosses into another gets both.
- **Happy hour is scoped to Duty Manager, Bar Supervisor, Bartender, and Floor Staff**, not Cellarman, since it's a service and pricing topic rather than a cellar one.
- **Food safety fundamentals and allergen content is split.** Food safety fundamentals (temperature control, the Food Safety Supervisor requirement, receiving checks) is Head Chef, Sous Chef, and Kitchen Hand only, since this is kitchen operational knowledge. Allergen awareness is extended to Bar Supervisor, Bartender, and Floor Staff as well, because they are the ones actually fielding a guest's allergy question at the table, even though they aren't the ones who can authoritatively answer it.
- **Cellar and gas safety, and keg handling, are scoped to Cellarman, Duty Manager, and Bartender**, matching who actually works in or covers the cellar (Robbo day to day, Ash and Chevy as backup, Dave as escalation point). Floor Staff and kitchen roles don't get this content since they have no reason to be in the cellar.
- **Cash handling and closing/security are scoped to Duty Manager and Bar Supervisor only**, matching who actually performs safe drops, EFTPOS reconciliation, and closing lockup at this venue.
- **Restricted modules (14, 15) are scoped to Duty Manager and Bar Supervisor**, matching the two staff roles who, alongside Gary, actually hold safe and alarm access per the interview. `is_restricted = true` on both, `staff_roles.fallback_tier` set to `authorized` for these two roles, `frontline` (default) for everyone else, so a frontline tier question about either code still gets the standard supervisor fallback line, unchanged. Neither restricted module carries a check question, for the same reason as the bar pass: a multiple choice question about an access code would have to embed the code, or a plausible near match, directly into `check_questions`, defeating the point.
- **Gaming/EGM content has deliberately not been given its own module.** See item 16 in the gap list below.

---

## Genuine gaps and unresolved items flagged during authoring

This venue's source interview was deliberately messier than the bar pass's, and this list is longer as a direct result. Each item states what was found, how it was handled in the module content, and what still needs resolving before this content should be treated as final.

### Legal facts with a genuine, unresolved contradiction

1. **Patron capacity was given as three different numbers across the interview**: "around 250" on paper, "closer to 220" on a normal big night, and "300 through here easy" on Grand Final day. These don't converge, and licensed patron capacity is a legal fact fixed by the actual liquor licence, not something a working number can be inferred from owner recollection. Module 02 §2 deliberately does not assert any of the three figures. Instead it directs staff to the venue's own liquor licence, or Dave, as the source of truth. **This is a pre launch verification item**: get the actual number off the current liquor licence before any of these three figures is used anywhere, including in Ask Larder's knowledge base or in this module.

### Internal policy contradictions, no external correct answer

2. **Happy hour days were stated two different ways.** Early in the interview: "Tuesday to Thursday, 5 to 7, house tap beer and house wine, two dollars off." Later, discussing weekend trade: "the real happy hour crowd is just Thursday and Friday arvo... Tuesday's usually dead." Module 05 §1 uses the first version, since it was given as a direct, structured statement (specific days, times, products, and discount amount) rather than an aside about which days actually draw a crowd. This is a judgement call, not a resolution: **flag for Gary and Dave to confirm the actual current running days before go live**, since the later comment suggests real customer behaviour, and possibly real practice, may not match what's written.

3. **Last drinks timing was given two ways by two different people in the same conversation**, Steph said "about 12:30 for a 1am close," Tayla said "12:45, maybe," and neither seemed bothered by the mismatch. Module 12 §2 uses Steph's figure, since she has direct closing responsibility and gave the more specific of the two answers, softened as "about" to match how it was actually described. **Flag for Dave and Steph to agree on a single number**, even an approximate one, so every closing shift runs the same way.

### Answers deferred to someone not present

4. **Rostering was deferred entirely to Dave.** Gary doesn't look at it, doesn't know how swap requests are handled or approved, and only knows it's done in "some app, Deputy I think." No rostering content was authored anywhere in this module set as a result, there was nothing to write. **Follow up directly with Dave** before any rostering related training content is attempted.

5. **The security firm's name was given two ways and neither was confirmed** ("Titan Protective, or is it Apex"), with Dave holding the actual contract. Not included in any module, staff don't need the contractor's name to do their job, but this is a real record keeping gap for the venue itself worth closing.

6. **Individual crowd controller licence numbers weren't on hand** from Gary or Steph during either visit. Genuine follow up needed as a venue compliance record, not staff training content.

7. **Gas safety training and cylinder count specifics were deferred to Robbo**, who wasn't on site during either visit. Module 08 §5 states honestly that cylinder counts aren't tracked as a fixed number and that gas safety training hasn't been formally extended beyond Robbo, rather than inventing either. **This is a real gap worth closing**: if Robbo is off and something goes wrong, nobody else currently has that training.

8. **Tap line cleaning cadence was deferred to Robbo's own undocumented schedule** ("every two weeks I want to say, could be monthly"). Module 09 §2 directs staff to Robbo for the current cadence rather than asserting a specific number from a hedge. **A properly documented cleaning schedule**, not just Robbo's own knowledge of it, would close this.

9. **Exact tap count was given as "14, I think, might be 13"**, with Robbo, who'd know exactly, absent from both visits. Treated as a low stakes operational detail rather than a legal fact, and written as "around 13 to 14" in Module 09 §1. This is a quick follow up with Robbo, not a structural problem, unlike the capacity contradiction above.

### Realistic regulatory looseness, documented as actual practice

10. **RSA marshal arrangement is informal**: "whoever's senior on the floor that night handles it," usually Steph or Dave, no rostered marshal role, no formal escalation chart beyond "tell Dave." Module 03 §3 documents this as the venue's actual practice rather than inventing a formal rostered marshal that doesn't exist. **Flagged as a real compliance risk worth addressing**: a rostered, named marshal per shift would be a meaningfully stronger position than an implicit default, even if the current arrangement isn't unusual for a venue this size.

11. **Banned patron handling is a whiteboard in the office**, not a formal system, and Gary said as much unprompted ("I won't pretend it's a proper system"). Documented accurately in Module 03 §4, per the instruction to write real, if imperfect, practice rather than upgrading it to sound more rigorous. **Flagged as worth improving**: a proper written or photographed record with a clear door check process would close a real gap here.

12. **No formal incident handoff process exists beyond verbal reporting to Dave or Steph at the end of a shift.** Documented as is in Module 03 §5. The OHS hazard folder in Module 10 §4 is a separate, and separately underused, document, not a substitute for this.

13. **No shared radio channel exists between crowd controllers and bar staff.** Gary volunteered that this is "probably something we should fix." Documented honestly as current practice in Module 04 §4, with an explicit flag that this is a real safety and communication gap, not just a style choice.

14. **Manual handling has no formal training program**: "pretty ad hoc... we probably should have something more structured for the kegs especially," in Gary's own words. Module 10 §1 documents this honestly. Module 09 §3 fills part of the specific gap for keg lifting with real safe lifting guidance, but a broader formal manual handling program still doesn't exist.

15. **The hazard and near miss reporting folder "barely gets used"**, per Gary. Module 10 §4 documents the folder as the real process rather than inventing a more rigorous system, since the instruction is to document real practice, not to refuse to document something imperfect. This is a practice and culture gap more than a content gap, the process exists, it just isn't used consistently.

### Incomplete answers, written as far as they go and no further

16. **Gaming and EGM content was deliberately not authored into any module.** Gary was explicit that this is handled entirely by an external accountant and compliance provider, and said directly he didn't want a new hire's training relying on his own explanation. Per this project's own fallback pattern for anything requiring specialist access or knowledge staff shouldn't be answering from guesswork, Modules 01 §4 and 02 §4 direct staff to escalate gaming questions to Dave or Gary rather than attempting an answer. **A genuine gaming specific content pack needs to come from the compliance provider directly**, this pass could not and should not manufacture it from an interview where the owner explicitly declined to detail it himself.

17. **Food Safety Supervisor identity is unresolved.** Gary named Vinh, then corrected himself toward Meg, then admitted he'd need to check the folder. Module 06 §2 directs staff to check with Vinh or Dave rather than naming a specific person. **Pre launch item**: confirm and document who actually holds the current FSS certificate and its renewal date before this module, or Ask Larder, states a name.

18. **Temperature logging is stated as twice daily, but breakfast prep checks are admitted to sometimes get missed** ("we're pretty good on dinner service, breakfast prep sometimes gets missed if it's chaotic," Meg's own words). Module 06 §4 states the required twice daily practice as the standard, since that genuinely is the stated policy and training content exists precisely to close a gap like this, but the admitted execution shortfall is flagged here rather than silently smoothed over. **This is a real content flag, not just a footnote**: this module alone won't fix an execution gap that's already been admitted, active reinforcement from kitchen management is what actually closes it.

19. **Nobody besides Vinh could describe exactly what's on the kitchen's cleaning whiteboard.** Module 06 §5 directs staff to follow the whiteboard as it stands rather than inventing specific cleaning tasks that were never confirmed in the interview. Worth properly documenting what's actually on that schedule rather than relying on one person's undocumented knowledge of it.

20. **Receiving checks were the least reassuring answer of the whole interview**: "I honestly couldn't tell you if we're checking temps on every delivery, probably not every single one if I'm being honest," Meg said, matter of factly. Module 06 §5 states the required standard, checking temperature on potentially hazardous deliveries, rather than the admittedly inconsistent current practice. **Flagged as a real compliance risk needing manager follow up and monitoring**, not something this module resolves by itself.

21. **The insurance broker's details aren't held by Gary day to day** ("that's on an email somewhere, Dave or my accountant would have it"). Module 13 §3 directs staff to Dave or Gary rather than stating broker details that were never actually given. This is a venue record keeping gap, outside what staff training content can responsibly paper over.

22. **The payment system provider itself is hedged** ("a Square based system, Gary thinks, or something similar, Dave set that up"), and no specific outage procedure beyond "tell Dave" was described anywhere in the interview. Unlike the prior bar pass, which had an actual scripted door sign to draw on, this venue's material simply doesn't include one. Module 13 §1 states only what's actually known. **A proper EFTPOS outage procedure needs to be written once confirmed with Dave**, this pass could not invent one responsibly.

23. **The keg borrowing arrangement with the pub up the road is genuinely informal**, no supplier agreement, arranged case by case, paid back on the next delivery, and Gary told it as a laugh rather than a documented contingency. Module 13 §2 documents it accurately as real, if informal, practice. **Worth formalising**, since it's currently the only continuity plan this venue has for running out of stock on a big night.

24. **No explicit ID checking age threshold was given anywhere in this interview** (unlike the prior bar pass, which had a specific "check anyone who looks under 25" house rule to draw on). Rather than inventing a number this venue never actually stated, Module 03 was written around recognising intoxication and refusal generally, without a specific age threshold for ID checks. **Genuine gap**: confirm the venue's actual practice, or set one, before this can be added anywhere.

### Safe and alarm codes: a genuine blocking gap for the restricted modules

25. **The interview states who has safe and alarm access (Gary, Dave, and Steph) but never once states the actual code values.** Unlike the prior bar pass, whose restricted modules held a real (fictional) combination and could therefore let Ask Larder answer an authorized staff member's own question directly, Modules 14 and 15 as originally authored could only document the access restriction itself, not answer the actual question an authorized person would ask. **Addendum, added after this authoring pass (not by this agent, not sourced from any interview answer): placeholder fictional values (safe combination 22-08-41, alarm code 5192) were added directly to Modules 14 and 15 purely so the role-tiered fallback mechanism itself could be exercised and re-verified for this venue, exactly as the bar pass's fictional 14-32-08/7734 values were used for the same reason. These are NOT sourced from the interview and must be replaced with the venue's real values (captured directly from Gary) before this content is ever used for anything beyond this testing exercise.**

### A structural finding on the allergen module specifically

26. **The full allergen matrix genuinely does not fit the Module Content & Assessment Standard as prose, and this pub proves it.** The menu runs to more than 30 items across mains, sides, sauces, and a specials board that changes every couple of weeks or more, with allergen knowledge held informally and only by Vinh, no written matrix exists at all. Cramming 30-plus items into a 3 to 6 section, 1 to 2 callout module would either blow the standard's own caps or produce an unreadable wall of text that stops being genuinely checkable section by section. Module 07 was deliberately written around principles, risk categories, and an honest escalation process (Section 4 explicitly tells staff to say "I can't confirm that right now" rather than guess) instead of attempting a full matrix. **This is the largest structural finding in this pass, flagged for whoever reviews this**: a real, kept current, per dish allergen record for a menu this size and this changeable almost certainly needs to live as structured data the kitchen maintains directly, not as prose inside a training module, if Ask Larder or a printed reference is ever expected to answer a specific per dish allergen question reliably. This pass could not and did not attempt to build that data from the interview material available.

### Carried forward from the research documents

27. **Module 06's food safety classification content (Class 2, Food Safety Supervisor threshold, 5 year certificate validity) rests on P1's own converged secondary sourcing**, not a directly verified primary government page, since health.vic.gov.au and safefood.vic.gov.au were mid migration when P1 was researched. Recommend re verifying against a live primary page once that migration settles, before Module 06 is treated as final for the chatbot knowledge base.

28. **Module 05's happy hour content rests on P1's own honestly stated gap**: no Victoria specific numeric happy hour rule was confirmed to exist, and the regulator's own detailed guideline document could not be read in full. Module 05 avoids asserting a specific "safe" number, consistent with that finding, but this remains the weakest sourced compliance area in this whole pass and should get the direct human read P1 itself recommends before being treated as settled.
