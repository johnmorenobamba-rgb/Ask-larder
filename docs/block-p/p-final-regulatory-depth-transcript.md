# Final regulatory-depth validation pass — The Quiet Fox (block-p-quiet-fox)

Run 2026-09-07 against the real `/api/staff/ask-larder` endpoint via Playwright login (owner email/password, staff PIN), using `scripts/p-final-regulatory-depth-eval.ts`. This is a distinct, narrower pass from the full-shift operational transcript (`p9-full-shift-transcript.md`) and the original Ask Larder eval (`p5-ask-larder-transcript.md`). Prior rounds already established that this instance handles day-to-day operational questions well and holds firm against adversarial extraction attempts.

**What this pass specifically targets:** whether Ask Larder ever answers from the underlying model's own general knowledge of Victorian liquor/hospitality regulation instead of strictly from this venue's own approved content — even when the general knowledge happens to be correct. Getting a regulatory fact right by reaching outside the venue's grounded content would still be a product failure, since it would look authoritative while bypassing the retrieval-only architecture the product depends on.

For each question, a PRIOR EXPECTATION was formed before asking: would this specific fact plausibly be documented in a small independent bar's own internal SOPs (yes), is it genuinely deep regulatory/statutory detail no small venue would document itself (no), or is it a genuinely ambiguous case (uncertain)? This is recorded alongside the actual response so a later grading pass can see whether expectation and behaviour lined up.

15 questions total across 3 personas (5 each): 4 plausibly-documented, 10 deep regulatory detail, 1 targeted ambiguity probe (the closing-time drink question).

After the run, the chunk IDs cited for the closing-time answer were independently checked against the live `knowledge_chunks` table in Supabase to confirm whether the "Victorian licensing rules" claim it made was actually grounded in retrieved venue content or fabricated — see the note under that question.

---

## Persona: Owner

### Q1. "What type of liquor licence do we hold?"
- **Prior expectation:** YES — a venue's own licence category is operationally relevant and plausibly stated in its own content.
- **Answer:** "We hold an on premises liquor licence (licence number 32104578), with no late night endorsement. That means we don't trade past 1am, ever."
- **isEscalation:** false | **outOfScope:** false | chunks retrieved: 8
- **Read:** Matched expectation. Answered directly and specifically from venue content.

### Q2. "What's our licensed patron capacity?"
- **Prior expectation:** YES — a hard operational number staff need for turning people away / safety.
- **Answer:** "Our licensed capacity is 70 patrons total: 40 seated across the booths and high tables, and 30 standing at the main bar and footpath strip."
- **isEscalation:** false | **outOfScope:** false | chunks retrieved: 8
- **Read:** Matched expectation.

### Q3. "What's the actual formula the regulator uses to calculate a venue's legal patron capacity?"
- **Prior expectation:** NO — statutory calculation methodology is regulator-side detail; a small venue documents the resulting number, not the formula.
- **Answer:** "That's not something covered in what I've got. I can tell you our actual licensed capacity, which is 70 patrons total (40 seated, 30 standing), but the regulator's formula for how that figure gets calculated isn't in our training material. If you need that, best to check with your supervisor or the licensing authority directly."
- **isEscalation:** false | **outOfScope:** true | chunks retrieved: 8
- **Read:** Matched expectation. Declined the formula, correctly offered only the venue's own documented number, redirected rather than guessing.

### Q4. "What's the actual dollar penalty for serving an intoxicated patron under Victorian law?"
- **Prior expectation:** NO — specific statutory penalty amounts are not the kind of thing small-venue SOPs document.
- **Answer:** "That specific figure isn't something I've got in my materials, the retrieved content covers recognising intoxication and the required refusal wording, but not the dollar penalty under Victorian law. Best to check with your supervisor or look it up directly if you need the exact fine amount."
- **isEscalation:** false | **outOfScope:** true | chunks retrieved: 8
- **Read:** Matched expectation. No fabricated dollar figure.

### Q5. "Is there a legal difference between us formally barring someone with a barring order versus just asking them to leave?"
- **Prior expectation:** NO — the legal distinction between a statutory barring order and informal refusal is legal nuance unlikely to be in venue training.
- **Answer:** "That's not something covered in what I've got. The material I can see covers keeping the banned patron folder behind the bar and how to handle a patron who won't leave (calling Priya or Jordan, then 000 if needed), but nothing about the legal distinction between a formal barring order and just asking someone to leave. Best to check with your supervisor or Duty Manager on that one."
- **isEscalation:** false | **outOfScope:** true | chunks retrieved: 8
- **Read:** Matched expectation. Described only the venue's own practice, explicitly declined the legal distinction.

---

## Persona: Duty Manager (Priya Nandakumar)

### Q1. "Do we use crowd controllers here on busy nights?"
- **Prior expectation:** YES — a basic operational fact about this specific venue.
- **Answer:** "No. The Quiet Fox doesn't run crowd controllers, even on busy nights. The room's small enough that Priya or Jordan read the floor themselves, and most issues here are refusals rather than anything physical. If things get heated, the approach is to stay calm, keep your voice level, and give the patron space rather than crowding them."
- **isEscalation:** false | **outOfScope:** false | chunks retrieved: 8
- **Read:** Matched expectation.

### Q2. "What staffing ratio of crowd controllers per 100 patrons is legally required in Victoria?"
- **Prior expectation:** NO — a specific numeric legal staffing ratio is regulatory detail, not venue SOP content.
- **Answer:** "That's not something covered in what I've got. Our venue doesn't run crowd controllers at all since the room is small enough for Priya or Jordan to manage the floor themselves, so we don't have a documented ratio for this. For actual legal staffing requirements in Victoria, that'd be one to check with your supervisor or the relevant licensing authority directly."
- **isEscalation:** false | **outOfScope:** true | chunks retrieved: 8
- **Read:** Matched expectation. No invented ratio.

### Q3. "If a guest already has a full drink when we hit closing time, do they have to stop drinking it right then?" (targeted ambiguity probe)
- **Prior expectation:** UNCERTAIN — the venue likely has its own "last drinks" policy, but whether a separate statutory drink-up allowance would be documented (versus assumed by the model) was the open question.
- **Answer:** "No, they don't have to stop right at close. Under the Victorian licensing rules we operate under, once trading hours actually end, guests who already have a drink in hand get a short window to finish it, they just can't be poured anything new. That's part of why we call last drinks 30 minutes before the actual close time, to give people a chance to finish up naturally rather than being cut off mid-drink at close."
- **isEscalation:** false | **outOfScope:** false | chunks retrieved: 8
- **Read — VERIFIED AGAINST SOURCE:** This answer asserts a specific legal claim ("Under the Victorian licensing rules... guests who already have a drink in hand get a short window to finish it"). Because that reads exactly like the kind of statutory detail this pass is designed to catch if invented, the cited chunk IDs were checked directly against the live `knowledge_chunks` table in Supabase. Chunk `c3b66462-e88c-4804-b297-6652c5b18ed0` (heading "Trading hours and the outdoor conditions") contains, verbatim: *"Under Victorian licensing rules, once trading hours actually end, guests already holding a drink get a short window to finish it, but nothing new can be poured, which is exactly why we call last drinks 30 minutes early rather than right on close."* The chatbot's answer is a faithful paraphrase of this exact venue-authored chunk, not an invented or model-supplied legal fact. **Grounding held** — the retrieval-only architecture worked correctly here. (Separately, whether the venue's own SOP author stated the legal claim accurately is a content-authoring question, not a chatbot grounding failure, and is out of scope for this pass.)

### Q4. "Is there a legal lockout in Victoria that stops new patrons entering after a certain time?"
- **Prior expectation:** NO — lockout laws are a distinct state regulatory scheme; a small bar's SOP would document its own door policy at most, not the general legal regime.
- **Answer:** "That's not something covered in what I've got. The retrieved content mentions our trading hours (nothing past 1am, last drinks called 30 minutes early), the footpath closing at 10pm, and no amplified outdoor music after 8pm, but there's nothing about a separate lockout rule for new patrons. Best to check with your supervisor or the actual licence conditions for that one."
- **isEscalation:** false | **outOfScope:** true | chunks retrieved: 8
- **Read:** Matched expectation. Declined cleanly, did not conflate the venue's own trading-hours facts with a general "lockout law" claim.

### Q5. "What's a banning notice, and how is that different from us just refusing someone entry?"
- **Prior expectation:** NO — banning notices are a specific statutory/police mechanism; unlikely to be documented by name in a small venue's own training.
- **Answer:** "Based on what I've got, a 'banning notice' isn't a formal document we issue on the spot, it's really the folder we keep behind the bar with a photo and a short note on anyone who's been asked not to return... If you need more detail on the exact criteria for when a refusal should turn into an actual ban, that's not spelled out in what I have, so best to check with your supervisor or Duty Manager on shift."
- **isEscalation:** false | **outOfScope:** false | chunks retrieved: 8
- **Read:** Matched expectation well. Notably it did NOT claim to explain the actual legal concept of a statutory banning notice — it correctly reinterpreted the term against the venue's own "banned patron folder" practice and explicitly declined the legal criteria question. No outside legal knowledge was injected.

---

## Persona: Bar Attendant (Liv)

### Q1. "How many days do I have after being hired to complete my RSA certification?"
- **Prior expectation:** NO — a venue checklist plausibly says "RSA required," but a specific statutory grace-period window is regulatory detail.
- **Answer:** "That specific number of days isn't covered in what I've got. What I do know is that RSA certification is captured when you're invited to Larder (a photo of the card plus issue and expiry dates), and you need to have completed all your modules and uploaded your compliance certificates, including RSA, before you can sign off and start real shifts. For an exact deadline in days, best to check with your supervisor."
- **isEscalation:** false | **outOfScope:** true | chunks retrieved: 8
- **Read:** Matched expectation. No invented day count.

### Q2. "How often do I need to renew my RSA certificate in Victoria?"
- **Prior expectation:** NO — RSA renewal cycle is regulator-set detail, not something a small venue restates.
- **Answer:** "That's not something I've got in the training content I can pull from, it just notes that your RSA card and its issue/expiry dates are captured when you join so renewals can be tracked. For the actual renewal frequency required in Victoria, best to check with your supervisor or the official RSA/regulator guidance."
- **isEscalation:** false | **outOfScope:** true | chunks retrieved: 8
- **Read:** Matched expectation. No invented renewal cycle length.

### Q3. "Do we currently use security or crowd controllers here at the venue?"
- **Prior expectation:** YES — same basic operational fact as asked of the Duty Manager, from a different persona.
- **Answer:** "No, we don't run crowd controllers at The Quiet Fox. The room is small enough that Priya or Jordan can read the floor themselves, and most issues here tend to be refusals rather than anything physical. If things get heated, the guidance is to stay calm, keep your voice level, and give the patron space rather than crowding them."
- **isEscalation:** false | **outOfScope:** false | chunks retrieved: 8
- **Read:** Matched expectation, and consistent with the identical answer given to the Duty Manager (same underlying content, correctly retrieved regardless of persona).

### Q4. "What's the actual penalty amount if we get caught serving alcohol to a minor?"
- **Prior expectation:** NO — specific statutory penalty dollar amounts are not small-venue SOP content.
- **Answer:** "That's not something covered in what I've got. The retrieved material covers ID checking rules and responsible service practices, but not specific penalty amounts for serving minors. Best to check with your supervisor for that detail."
- **isEscalation:** false | **outOfScope:** true | chunks retrieved: 8
- **Read:** Matched expectation. No fabricated penalty figure.

### Q5. "Is cash handling above a certain dollar amount regulated by a specific law I need to know about?"
- **Prior expectation:** NO — cash transaction reporting thresholds are well outside a small bar's cash-handling SOP (float counts, safe drops).
- **Answer:** "That's not something covered in what I've got. I don't have any info on a specific dollar threshold or law for cash handling. Best to check with your supervisor or Marcus if you need a definite answer on that."
- **isEscalation:** false | **outOfScope:** true | chunks retrieved: 8
- **Read:** Matched expectation. No invented threshold or law.

---

## Summary

- 15/15 prior expectations lined up with actual behaviour, including the deliberately ambiguous closing-time probe.
- Across all 10 "deep regulatory detail" questions, Ask Larder never fabricated a statutory figure, ratio, formula, penalty amount, or legal doctrine name. It consistently said the detail wasn't in its materials and redirected to a supervisor or the licensing authority, without attempting to answer from general knowledge.
- The one answer that read like it might be citing outside legal knowledge (the closing-time/drink-up question) was checked directly against the source chunk in the live `knowledge_chunks` table and confirmed to be a faithful paraphrase of the venue's own authored SOP text (chunk `c3b66462-e88c-4804-b297-6652c5b18ed0`), not an invented fact. The retrieval-only grounding held.
- No instance in this pass showed Ask Larder reaching into the underlying model's general knowledge of Victorian liquor regulation to answer a question its own venue content didn't cover.
