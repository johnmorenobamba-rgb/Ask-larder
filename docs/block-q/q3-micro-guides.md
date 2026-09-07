# Block Q3 — Onboarding Specialist Micro-Guides

**Status: documentation only. No code, module content, or schema was written or modified in producing this.**

**Purpose.** One section per wizard page from `docs/block-q/q2-wizard-flow-and-schema.md` (22 sections: 14 numbered pages plus lettered sub-pages 5a/5b, 6a/6b, 7a/7b, 8a/8b/8c, 11a/11b). Each section gives the onboarding specialist the actual interview judgment the Block P passes needed on the fly — what to ask, what a real answer looks like versus a vague one, and what to do about it — taught up front instead of learned by making the same mistakes Block P found on three live venues.

**How to read "what a vague answer looks like."** Wherever possible these are drawn from, or modeled directly on, real findings in `docs/block-p-pub/p3-fictional-pub-seed-answers.md`, `docs/block-p-cafe/p3-fictional-cafe-seed-answers.md`, `docs/block-p-pub/p6-gap-analysis.md`, and `docs/block-p-cafe/p6-gap-analysis.md` — cited inline as "Pub P3" / "Cafe P3" / "Pub P6" / "Cafe P6." A small number of examples (noted where they occur) are constructed for a branch neither fictional venue actually took, and are flagged as illustrative rather than sourced.

**The canonical worked example, referenced throughout this doc.** The Coachman's Arms interview produced three different licensed-capacity figures in one conversation — "250" (recalled, with an explicit caveat to check the licence), "220" (restated later as "what we run on a normal big night"), and "300" (mentioned in passing re: Grand Final Day trade) — and nobody in the room flagged the contradiction (Pub P3, Venue basics + Licensing sections). Per Q1's D.1.2 grading bar, a compliance-critical field with two unresolved contradictory values must fail grading even if a value gets stored — guessing or averaging is worse than leaving it blank. Ask Larder's own handling of this exact gap (Pub P6, Q3) is the model to imitate: it never asserted a number, redirected to the actual licence document and to Dave (the person who'd have it), and the gap was surfaced as a genuine, flagged content gap rather than quietly resolved. **Do the same thing at the wizard stage, before it ever becomes a chatbot problem**: when a compliance-critical field gets two answers that don't reconcile, do not pick one. Log both, mark the field unresolved, and move on.

---

## Page 1 — Owner + venue creation

**What to ask.** The venue's trading name, and the owner's own name, email, and phone (this becomes their `app_users` login). "What's the name people know the place by, and what's the best email for your own Larder login?"

**What a good answer looks like.** A trading name given plainly, and an email/phone the owner actually checks (not a shared inbox nobody reads).

**What a vague answer looks like.** An owner giving a generic admin@ or info@ address they don't personally check, or naming the venue by a nickname that doesn't match any signage or paperwork — not vague in the Block P sense (this page is a fast bootstrap step, not an interview), but worth a light sanity check since every later page depends on this account existing correctly.

**What to do when vague or contradictory.** This page doesn't carry the compliance weight later pages do, so a light confirm-and-move-on is enough: "Just to confirm, is that the name on your signage, or a different trading name?" Don't over-interview here — Page 2 is where the legal-name distinction actually gets captured properly.

**Example phrasings.** "What's the name we should use for the venue in Larder, and what's your email so I can set up your owner login?"

---

## Page 2 — Venue basics

**What to ask.** "Is your trading name the same as your legal, registered business name, or are they different?" Then: full street address, ABN, and state/territory.

**What a good answer looks like.** ABN and address given confidently and without hesitation (per Pub P3, Gary "rattled off the address and ABN without needing to check anything") — these are facts an owner typically knows cold. The legal-name distinction sometimes needs a beat of explanation before it lands, which is normal and not a red flag by itself.

**What a vague answer looks like.** Someone who has to think about which name is "the real one" for more than a moment, or gives a business name that doesn't obviously match the ABN register — worth a quick cross-check rather than taking either name at face value. Pub P3's Gary needed the legal-vs-trading distinction explained once before he was confident; that's a normal one-time clarification, not a gap to log.

**What to do when vague or contradictory.** Ask for the ABN first if there's any doubt — it's the one fact that resolves the legal-name question definitively, since the registered entity name sits behind it. If the owner genuinely doesn't have the ABN on hand, log the field as pending rather than guessing at a business name.

**Example phrasings.** "Is the business you trade under the same legal entity as your ABN, or is there a separate company name behind it, like a Pty Ltd?" / "What's your ABN — I'll use that to confirm the registered name matches what's on your signage."

---

## Page 3 — LIC0 root licensing gate

**What to ask.** "Does the venue hold, or plan to hold, any kind of liquor licence at all — including an informal setup where customers bring their own alcohol and you don't sell it?" This question must be asked plainly and early, before any licence-detail questions, because it decides whether the entire licensing/RSA/happy-hour subtree is even shown.

**What a good answer looks like.** One of three clean answers: (1) "Yes, we hold [licence type]" — routes to Page 4. (2) "No, and that's a deliberate, settled decision" — routes straight to Page 7 (food service level), skipping licence detail, crowd control, RSA, and happy hour entirely. Cafe P3 is the model here: Renata was unambiguous — "No, none of that... we looked into a limited licence when we opened and decided against it" — a genuinely settled "no," not a maybe. (3) A clear BYO-only answer — customers may bring alcohol, the venue holds no licence to sell it and does not want one modeled as a licence. (Neither fictional venue actually took this branch; this case is illustrative, built to match the concept Q1/Q2 describe for it, not sourced from a real P3 finding.)

**What a vague answer looks like.** "We're not sure yet" / "we've thought about getting one" / "it's complicated, ask my accountant." This is a genuinely different case from a settled "no" and must not be recorded as either "no licence" or forced into a licence-type answer.

**What to do when vague or contradictory.** Do not guess an enum value here. Probe once: "Is that a firm no for now, or something you're actively deciding on?" If it's still unresolved after one probe, this is exactly the "not sure yet" case Q2 routes to founder escalation rather than a guess — leave `licence_status` unset for this session, flag it for founder review, and do not let the specialist pick "none" just to move the wizard forward, since a wrong "none" here silently skips RSA/crowd-control/happy-hour pages that a soon-to-be-licensed venue will actually need.

**Example phrasings.** "Just so I ask you the right questions from here — does the venue have a liquor licence, plan to get one, or is it a BYO setup where you don't sell alcohol at all?" / "Just to be clear, is that a firm decision, or still up in the air?"

---

## Page 4 — Licence detail (licensed only)

**What to ask.** Licence type, licence number, licensed patron capacity, approved trading hours by day, late-night endorsement, and any conditions. Then, separately: "Does the venue hold a gaming machine entitlement?"

**What a good answer looks like.** Licence number read directly off the document or phone photo of it (Pub P3: Gary "had the licence number in his phone and read it out confidently"). **Licensed patron capacity must be sourced from the actual liquor licence document, not owner recollection** — this is the single most compliance-critical field in the whole wizard per Q1's D.1.2 bar. Trading hours given day-by-day, not as a vague range.

**What a vague answer looks like.** This is the canonical case (see intro): Pub P3 produced 250, then 220, then 300 for the same venue's capacity across one conversation, and nobody in the room flagged it. A "roughly 120, maybe 130 if we pack it in" style answer for a licensed number is also a vague answer — capacity is a fixed figure on the licence document, not a feel-based estimate.

**What to do when vague or contradictory.** Probe once with a specific ask: "Do you have the actual licence document, or a photo of it, on hand? That number is the one that needs to go in, not the number people usually run at." If the owner can't produce the document during the interview, do not record any of the numbers given — mark licensed capacity as unconfirmed/pending document, and note it as a follow-up item rather than storing a plausible guess. The wizard's own UI should be set to "unconfirmed, pending the actual document" for this field, per Q2 §3, Page 4.

**Example phrasings.** "What's the capacity figure written on the actual licence, not what you'd say you run at on a normal night?" / "I've got two different numbers here — can we settle this against the actual document rather than memory, even if that means I follow up with you once you've found it?"

---

## Page 5 — Crowd control gate (licensed only)

**What to ask.** "Do you use crowd controllers as a mandatory requirement of your licence, or do you bring them in electively — for certain nights, events, or just when it feels needed?"

**What a good answer looks like.** A clear yes/no with the pattern named — e.g. Pub P3: "Friday and Saturday nights, and Thursday if there's a band on." This page is always asked when licensed, regardless of the answer — it is not gated behind capacity or trading hours, so don't skip it because a venue seems small.

**What a vague answer looks like.** "Sometimes, depends" with no pattern at all is workable content (the pattern itself can be "elective, decided per event") but becomes a problem if the specialist can't get even a rough cadence — that's a sign to come back to it after Page 5a/5b rather than leave it fully blank.

**What to do when vague or contradictory.** A soft "sometimes" is fine to record as-is if a cadence follows (e.g. "weekends, plus big events"). Only escalate to a follow-up note if the owner genuinely can't characterize the pattern at all.

**Example phrasings.** "Is that a licence condition you have to meet, or your own call based on how busy a night's shaping up to be?"

---

### Page 5a — Security firm contact (crowd-control triggered)

**What to ask.** "What's the name of the security firm you use for crowd control, and who's the main contact?"

**What a good answer looks like.** A firm name given confidently, ideally cross-checked against an invoice or contract rather than memory.

**What a vague answer looks like.** Pub P3, verbatim: Gary got the firm's name wrong twice — "Titan Protective, or is it Apex, one of those two, Dave deals with them directly, he'd have the contract." This is a textbook vague answer: two plausible names, no confidence, a named person who'd actually know.

**What to do when vague or contradictory.** Don't record either guessed name as if it were confirmed. Note both candidate names, flag the field as unconfirmed, and record who actually holds the contract (in this case, Dave) as the follow-up contact — this is a `venue_contacts` freetext capture either way (Q1 flags this as **NO CURRENT COLUMN/TABLE**, gap #2), so there is no schema reason to force a premature answer.

**Example phrasings.** "No pressure if you're not sure of the exact name — who actually deals with them day to day? I can follow up with that person directly."

---

### Page 5b — Individual controller licence numbers (crowd-control triggered)

**What to ask.** "Do you have the individual licence numbers for the crowd controllers who work here regularly?"

**What a good answer looks like.** A list of names with licence numbers, sourced from the contractor's paperwork or the firm's compliance file.

**What a vague answer looks like.** Pub P3: not something Gary or Steph had on hand during either visit — a genuine, acknowledged follow-up, not evasiveness.

**What to do when vague or contradictory.** This field is explicitly not-yet-structured in the schema (freetext into `venue_contacts.notes` with a "not yet structured" badge per Q2 §3). Don't push hard for it in the interview — record what's known, note it as outstanding, and move on; this is exactly the kind of field where visibly logging "not captured yet, here's why" satisfies Q1's D.1.5 pass condition, rather than forcing an answer that doesn't exist yet.

**Example phrasings.** "If that's something the security firm holds rather than you, that's fine — I'll just note it as a follow-up rather than hold up the rest of the setup."

---

### Page 6a — RSA-required roles (licensed only)

**What to ask.** "Which staff roles need to hold a current RSA certificate here?"

**What a good answer looks like.** A clear list mapped to the roles already captured (e.g. all bar and floor staff, not kitchen). Pub P3: "all bar staff hold current RSA certificates, Steph confirmed she checks these when people start" — specific, verifiable, and tied to an actual verification habit.

**What a vague answer looks like.** "Everyone, I guess" without actually thinking through which roles serve alcohol — often over-inclusive (kitchen staff who never touch the floor don't need RSA) or under-inclusive (casual floor staff forgotten).

**What to do when vague or contradictory.** Walk through the actual staff role list captured earlier (or being captured on Page 11a) and confirm role by role rather than accepting a blanket "everyone" or "the obvious ones."

**Example phrasings.** "Let's go through your roles one at a time — does [role] ever serve or sell alcohol directly?"

---

### Page 6b — RSA marshal gate (licensed only)

**What to ask.** "Do you have one specific person designated as your RSA marshal — the person responsible when there's an incident needing escalation?" If yes: "What's their name, and do they currently have a login to Larder, or will they need to be invited?"

**What a good answer looks like.** A named individual with a clear, standing responsibility, plus a definite answer on their Larder login status.

**What a vague answer looks like.** Pub P3, verbatim: "honestly whoever's senior on the floor that night handles it, we don't have one specific person assigned as marshal, it's whoever's running the shift." This is a real, valid answer — not every venue has a dedicated marshal — but it is a *different* answer from "yes, and it's [name]," and must not be forced into a name field.

**What to do when vague or contradictory.** If the answer is genuinely "whoever's senior that night," record that as the answer to the gate question itself (No — no dedicated marshal; standard RSA-trained-staff content only) rather than writing a placeholder name. If a name is given, **always ask the login question explicitly and log the answer** — this is not optional, since the identity captured here is very often not the person who ends up with a Larder account (this is a stated, real Q1 D.1.4 grading requirement, not a nicety). Never let a captured name go forward without this flag being visibly set one way or the other.

**Example phrasings.** "Is there one specific person who's the marshal, or does it rotate with whoever's running the shift?" / "And does [name] already have a Larder login, or is that someone we still need to invite?"

---

## Page 7 — Food service level gate (all venues)

**What to ask.** Ask about risk class directly, not kitchen size: "Do you handle temperature-controlled or higher-risk food — things like raw meat, dairy, or food that needs to be kept hot or cold — or is it packaged/low-risk items only, or no food service at all?"

**What a good answer looks like.** A clear answer that lets you place the venue correctly even when it's small. Cafe P3 is the model case here: a compact kitchen with eggs, dairy, and a hot line is squarely in the same risk class as a full pub kitchen, even though it would sound like "just a small cafe kitchen" if asked the wrong way.

**What a vague answer looks like.** An owner who describes the food offering only in terms of scale ("it's a small kitchen, nothing major") rather than risk — this can lead a specialist to under-classify a genuinely high-risk operation. Ask about the food itself, not the size of the space.

**What to do when vague or contradictory.** Don't accept "small" or "basic" as an answer on its own — follow up with what's actually served. If eggs, dairy, raw meat, or anything requiring temperature control is present, that's Class 1/2 risk regardless of kitchen size.

**Example phrasings.** "Regardless of how big the kitchen is — does anything you serve need to be kept refrigerated, cooked to temperature, or held hot? That's really what decides this, not the size of the space."

---

### Page 7a — Food Safety Supervisor identity (triggered only)

**What to ask.** "Who holds your Food Safety Supervisor certificate?" Then, unconditionally: "Does [name] currently have a login to Larder, or will they need to be invited?"

**What a good answer looks like.** A confident, single name, ideally with the certificate itself available to check the expiry date. Cafe P3's Priya case is close to ideal on identity (clearly named, clearly the right person) but still incomplete on the compliance-critical expiry date — see below.

**What a vague answer looks like.** This is the most cited finding across both Block P passes and deserves to be treated as the standard cautionary example for this page. Pub P3, verbatim: "actually hang on, I think Meg might have the more recent cert, we did a course last year and I can't remember who ended up with the current ticket, I'd need to check the folder." Two names given for the same role, unresolved. Cafe P3 is a milder version of the same pattern: Priya is confidently named, but "I want to say she did that course maybe two years ago? I'd have to check the folder for the actual expiry date" — the identity is solid, the expiry date is not.

**What to do when vague or contradictory.** Per D.1.2, this is a compliance-critical field: two contradictory names must not be resolved by picking one. Log both candidates, mark FSS identity unresolved, and set a concrete follow-up ("owner will check the folder and confirm by [date]") rather than defaulting to whichever name was said last. Even when the identity is clean (as with Priya), an unconfirmed expiry date is still a gap — log it as pending, don't leave it blank with no note. **Always ask the login question, every time, even when the identity itself was easy to get** — this is the Q1 D.1.4 requirement and it applies regardless of how confident the owner sounded on the name.

**Example phrasings.** "You mentioned two people there — rather than guess, can we mark this as unconfirmed and you check the folder, so we don't put the wrong name on record?" / "And does [name] have a Larder login yet, or do we need to send them an invite?"

---

### Page 7b — Food Handling-required roles (triggered only)

**What to ask.** "Which staff roles need a Food Handling certificate — everyone in the kitchen, or does it extend to floor staff too?"

**What a good answer looks like.** A role-by-role list, mirroring the same discipline as Page 6a for RSA.

**What a vague answer looks like.** A blanket "the kitchen people" without confirming whether kitchen hands, casuals, and any FOH staff who handle food (e.g. plating, garnish, display cabinet stock) are included.

**What to do when vague or contradictory.** Walk the actual staff role list, same approach as 6a — don't accept a category-level answer when a role-by-role one is available.

**Example phrasings.** "Does anyone on the floor side ever handle food directly — plating, garnish, restocking the display cabinet — or is it kitchen-only?"

---

### Page 8a — Menu items

**What to ask.** "Can I get your menu as a document or photo, or would you rather walk me through it item by item?" Then, for the item count: "Roughly how many items are we talking, including specials?"

**What a good answer looks like.** A menu document or clean upload the parser can work from, or — if manual — a confident, specific item count. Cafe P3: "fixed core menu is around 14 items" was solid; the specials-inclusive estimate ("maybe eighteen, twenty items if you count specials") was explicitly hedged, which is honest and fine to record as an estimate.

**What a vague answer looks like.** An item count that shifts with no anchor ("it changes all the time, hard to say") without at least a stable core-menu number underneath the variability.

**What to do when vague or contradictory.** Separate the fixed/core items (which should have a confident count) from the rotating/specials items (which can legitimately be approximate) — don't force a single precise number across both. If the venue's menu is large or complex (see Page 8b below for the threshold), start planning now for the principles-based content pattern rather than a full item-by-item script.

**Example phrasings.** "Do you have a menu file I could work from directly, or is it easier if I just ask about the core, non-changing items first and handle specials separately?"

---

### Page 8b — Modifier groups + modifiers (swap-based menus only)

**What to ask.** "Do any items have swap options — gluten-free bread, dairy-free milk, a vegan protein swap — and if so, which ones?" Then, critically: "Is there a written allergen record anywhere, or does that live in someone's head?"

**What a good answer looks like.** A specific, per-item list of swap options with their allergen effect (what's added, what's removed), ideally sourced from whoever actually built the menu.

**What a vague answer looks like.** This is the single clearest routing signal in the whole wizard, and both Block P passes hit it independently. Pub P3: roughly 34 items once specials are counted, changing "every couple of weeks," allergen info existing only as Vinh's "mental map," no written matrix — Gary himself said "that's probably something we should do properly rather than winging it." Cafe P3 is the sharper case because it's modifier-based rather than just large: "gluten free bread available on basically everything, oat milk and soy milk alongside dairy, a vegan option on about half the brunch menu... there is no written allergen matrix... Priya knows all of it in her head." Renata could name the obvious allergens but "couldn't speak with confidence to cross contamination practices... or whether the fryer is shared."

**What to do when vague or contradictory.** **Recognize this as a routing decision, not a data-collection failure.** A 30+ item flat menu with no written record, or any modifier-based menu where swaps multiply the number of item-allergen combinations, is too large and too changeable to script item-by-item in prose — attempting it violates the content standard's section caps by construction and is a fail on its own per Q1's D.2.4. The correct move is to (a) capture only the confirmed, stable facts (e.g. "granola and banana bread both contain walnuts" — both venues had this much confidently), (b) get the actual menu-builder/kitchen person's direct input rather than the owner's secondhand account wherever the owner defers, and (c) flag this topic for the principles-based content pattern (confirmed facts stated plainly, an honest "not recorded" for the rest, and an explicit escalation script telling staff to ask the kitchen) rather than trying to force a full matrix. Log "needs Priya/Vinh's direct input" (or equivalent) as an open item rather than proceeding on the owner's account alone.

**Example phrasings.** "Given how many swap combinations there are, I don't think we should try to write out every single one — is that a fair call? I'd rather get the confirmed facts right and be upfront about what isn't nailed down than guess at the rest." / "Is [kitchen person] someone I should talk to directly for this part, rather than relying on what you can tell me secondhand?"

---

### Page 8c — Equipment/station inventory

**What to ask.** Branch by venue type — bar/cellar questions for a bar or pub (tap count, keg/gas setup), espresso/food-prep/display questions for a cafe. "How many tap lines do you run, and who actually knows the gas/CO2 setup in detail?" or "Walk me through your main equipment — espresso machine, prep gear, display cabinet."

**What a good answer looks like.** Specific counts and a named person responsible for technical upkeep. Cafe P3: "three group La Marzocco, Jack's domain... backflush done daily at close, that one I'm confident on" — precise and attributable.

**What a vague answer looks like.** Pub P3: "14, I think, might be 13, Robbo would know exactly" for tap count, with Robbo unavailable during either visit. Cafe P3's descaling cadence is a milder version: "there's a reminder in Jack's phone, I want to say it's every few months but I couldn't tell you the exact interval."

**What to do when vague or contradictory.** Record the estimate as given but flag it as needing confirmation from the named person who actually knows (Robbo, Jack), rather than treating the owner's guess as final. This table has no detail columns for tap/cylinder counts today (Q1 explicitly flags this as low-priority, no column exists) — so the goal here is getting the equipment list itself right for `stations`, not chasing exact counts that don't have anywhere to be stored yet.

**Example phrasings.** "That's fine as a rough figure for now — is [name] someone I should follow up with directly to lock in the exact number?"

---

## Page 9 — Happy hour (licensed + confirmed only)

**What to ask.** "Do you run happy hour or any regular discounted pricing? If so, which days, what hours, and what's actually discounted?" This page is never shown at all on the no-licence path — don't ask it if Page 3 routed the venue away from licensing.

**What a good answer looks like.** A single, consistent answer for days/hours/products/discount, ideally matching what's posted publicly (a sign, a website, a social post) rather than only spoken recollection.

**What a vague answer looks like.** Pub P3 is the canonical case: Gary first said "Tuesday to Thursday, 5 to 7, house tap beer and house wine, two dollars off," then later, unprompted and without seeming to notice the conflict, said "the real happy hour crowd is just Thursday and Friday arvo... Tuesday's usually dead so I don't know why we even bother" — two genuinely different day patterns for the same policy, both stated with confidence.

**What to do when vague or contradictory.** Don't silently pick the version that sounds more "official" or the one given first. Point out the discrepancy directly and ask which one reflects current practice versus what might be written down somewhere but not actually followed: "on paper" and "in practice" can legitimately differ, and if they do, record both with a note on which is which, or mark it unresolved if the owner can't say which is current.

**Example phrasings.** "I've got two slightly different versions of this from what you've said — is there a difference between what's officially set and what actually happens on the floor, or should I go with one over the other?"

---

## Page 10 — Emergency/business-continuity contacts

**What to ask.** Walk through the standard contact set one at a time rather than asking generally: electrician, plumber, locksmith, insurer/insurance broker, security firm (if not already captured on Page 5a), regulator, an escalation contact, and fire/police non-emergency numbers.

**What a good answer looks like.** A name and number for each, ideally cross-checked against an actual contact list or phone rather than pure recall.

**What a vague answer looks like.** Insurance details are the recurring soft spot in both venues. Pub P3: "that's on an email somewhere, Dave or my accountant would have it, I don't carry that number around." Cafe P3, even more open-ended: "I'd have to dig out the actual policy paperwork, I don't have the numbers in my head" — trailed off without a firm answer on coverage at all.

**What to do when vague or contradictory.** Don't press for exact policy numbers or coverage limits during the interview — that's genuinely not something most owners carry in their head, and both venues showed the same pattern independently. Instead, capture whoever the owner would actually go to (the accountant, the broker's name, an email thread) as the functional contact, and log the specific policy detail as a follow-up to be supplied later rather than a blocking gap.

**Example phrasings.** "That's really common, don't worry about having exact numbers — who would you actually call or email if something happened, even if it's 'my accountant has it'?"

---

### Page 11a — Staff roles setup

**What to ask.** Role names, FOH/BOH department, fallback tier (frontline vs. authorized — "does this role need access to things like the safe code or alarm code, or is that handled by someone else?"), and roster location: "Where do staff actually check who's on shift — a physical board, an app, a shared document?"

**What a good answer looks like.** A clean role list with department tags, a deliberate (not default) authorized-tier decision for any role that genuinely needs restricted access, and a specific, named roster system. Cafe P3: "done by Renata in a shared Google Sheet, published about a week ahead" — specific and answerable.

**What a vague answer looks like.** A role that's genuinely hard to categorize as FOH or BOH — Pub P3's cellarman Robbo ("kind of both, he pulls beers too when it's flat out") is a legitimate dual-role case, not a data-quality problem. Roster location itself is a known, recurring gap: Pub P3's Gary deferred it entirely ("that's all Dave, he does it in some app, Deputy I think, I genuinely don't look at it").

**What to do when vague or contradictory.** For a genuinely dual-role position, tag it with both departments rather than forcing a single choice — that's the honest answer, not a gap. For fallback tier specifically, **never default a role to "authorized" without a deliberate reason** — frontline is the safe default, and elevation must be a conscious choice tied to an actual need (handles cash, holds a code, opens/closes). If the roster location is genuinely unknown to the person being interviewed, get the name of who does know (as Gary did with Dave) and log a direct follow-up with that person rather than leaving the field blank with no lead.

**Example phrasings.** "Does this role ever need the safe code or alarm code directly, or would they always go through someone else for that? I want to make sure we're not over-granting access by default." / "If a new hire needed to check who's on shift tonight, where would they actually look?"

---

### Page 11b — Named staff for invite

**What to ask.** For each staff member: name, and email or phone (at least one required) for their Larder invite.

**What a good answer looks like.** A complete list with a working contact method for each person, matched to the role captured on Page 11a.

**What a vague answer looks like.** Casual pool sizing is the soft spot here rather than named individuals — Pub P3: "22, maybe 25 people on the books count everyone, but on any given week you'd see maybe 14 to 16 actually rostered." This is a legitimate range to record, not a failure to resolve, since casual headcount genuinely fluctuates.

**What to do when vague or contradictory.** For named, ongoing staff, insist on a real contact method before moving on — an invite can't go out without one. For casual/rotating pool sizing, record the range as given rather than forcing a single number; that's honest variability, not an unresolved contradiction like the capacity example.

**Example phrasings.** "For the core team we'll need an actual email or number for each person so I can send the invite — for the casual pool, a rough range is totally fine."

---

## Page 12 — SOP/content intake hub (gap-detection loop)

**What to ask.** Per Part B topic: "Can you give me the source material for this — written SOPs, photos, or should we just talk it through?" And, before authoring **any** content that touches physical or system access: **"Is this something that should only be visible to authorized staff — a code, a key location, an alarm sequence?"** This question must be asked explicitly every time restricted-adjacent content comes up; nothing else in the flow forces it.

**What a good answer looks like.** Source material that lets the specialist write confidently, with the owner clear on which topics are safety-critical, which are sequences (closing procedures, for instance, are the one place a numbered step list is actually appropriate), and which touch restricted access.

**What a vague answer looks like.** Both venues gave the safe code and alarm code freely during the interview because they were talking to a person, not filling out a form — Pub P3: "safe code itself is restricted to Gary, Dave, and Steph"; Cafe P3: "safe code known to Renata, Priya, and Jack only." The risk isn't that the owner won't say the code — it's that if the specialist doesn't stop and ask the tiering question explicitly, that code can end up typed into an ordinary, non-restricted module section by accident. That's the exact residual gap Q1 row 54 flags: nothing today stops this happening except a deliberate prompt at intake.

**What to do when vague or contradictory.** Treat the tiering question as mandatory, not optional, every single time physical/system access comes up — don't rely on judgment call or "it seemed obviously sensitive." If the answer is yes, confirm which roles are actually authorized (matching Page 11a's fallback-tier settings) before any content is drafted, and confirm no check-question will ever be attached to that section (a multiple-choice question about a secret would have to embed it or a near-match). If a topic is too large/complex for prose (see Page 8b's allergen-matrix guidance — the same principle applies to any Part B topic, not just allergens), route it to the principles-based pattern rather than forcing a full script.

**Example phrasings.** "Before I write this part up — is this something every staff member should be able to see, or is this one of the things that should only go to owners and managers, like a code or an access point?" / "This part's getting pretty long and detailed — should we simplify it to the key principles and flag the rest as 'ask your supervisor,' rather than try to script every single case?"

---

## Page 13 — Certificate types setup

**What to ask.** Confirm the auto-created certificate types (RSA, Food Handling, Food Safety Supervisor if applicable), then: "Does your state's Working with Children Check go by a different name than 'WWCC'? What's it actually called on the certificate itself?" Add First Aid.

**What a good answer looks like.** The certificate type name matching exactly what's printed on the real state-issued document.

**What a vague answer looks like.** Assuming "Working with Children Check" is the universal name — it isn't; the name and issuing regulator vary by state. Neither Block P venue's material tests this directly (both are Victoria-based), so treat this as a standing rule rather than a documented finding: never hardcode the Victorian name for a non-Victorian venue.

**What to do when vague or contradictory.** Cross-check against the state captured on Page 2. If the venue's state isn't in the Victoria-first lookup table the wizard ships with, use the generic freetext prompt and add a founder-escalation note rather than guessing at a name.

**Example phrasings.** "What does the actual certificate say at the top — sometimes this has a different name depending on the state."

---

## Page 14 — Review & activate

**What to ask.** Walk the owner through everything captured, module by module, and ask explicitly: "Are you happy for this content to go live for your staff as it stands?"

**What a good answer looks like.** A clear, informed yes after the owner has actually reviewed the content — not a rushed sign-off to finish the session. Liability for what goes live sits with the venue, not Larder, so this approval has to be real, not a formality.

**What a vague answer looks like.** An owner who says "looks fine, whatever you think" without actually reading through flagged gaps or unresolved items (the capacity contradiction, an unresolved FSS identity, a deferred allergen matrix) — this defeats the purpose of the approval gate.

**What to do when vague or contradictory.** Don't let approval proceed past a genuinely unreviewed state. Walk through the specific open items logged across earlier pages one more time here — this is the last checkpoint before content goes live, and CLAUDE.md's owner-approval-gate rule exists precisely so nothing skips this step. If the owner wants to approve everything except one flagged section, that's a legitimate partial approval — defer just that section, don't force an all-or-nothing choice.

**Example phrasings.** "Before we go live, I want to specifically flag the items we left open today — [list them] — are you comfortable launching with those still pending, or would you rather hold off on just those sections?"

---

## Judgment calls made in producing this guide

1. **Page 1 (owner + venue creation) has a thin micro-guide** relative to the others. It's an account-bootstrap step, not an interview page in the Block P sense — there's no real analog to "vague vs. good" in the way the later pages have it. I kept its section short rather than manufacturing a vague-answer example that doesn't reflect how this page actually works.
2. **The BYO-only example on Page 3 (LIC0 gate) is illustrative, not sourced.** Neither Pub P3 nor Cafe P3 is a BYO-only venue — Pub P3 is fully licensed, Cafe P3 is fully dry. I built the BYO example to match the concept Q1/Q2 describe for it (a venue that never sells alcohol but allows customers to bring their own) rather than pulling it from a real interview finding, and flagged this inline in that section.
3. **Page 8c (equipment/station inventory) follows Q2's own placement**, grouped with the menu-intake cluster, since Q2 itself flags this page as not being in the task brief's original 14-page numbering and names its placement as a judgment call for the orchestrator to confirm. I did not re-litigate that placement here — the micro-guide follows wherever Q2 put it.
4. **A "not sure yet" answer on Page 3's LIC0 gate has no defined `licence_status` enum value** in Q1's schema (the enum is `none` / `byo_unlicensed` / `limited` / `full` — no "unsure" option). I treated this case as routing to founder escalation with the field left genuinely unset for that session, on the reasoning that forcing a guess into one of the four enum values would violate the same no-fabrication principle the rest of this guide is built around, even though Q1/Q2 don't spell out this exact sub-case explicitly. Worth the orchestrator's confirmation that this is the intended handling.
