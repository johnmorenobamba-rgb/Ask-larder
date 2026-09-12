# Larder: positioning and value proposition

Prepared as Document 1 of the marketing strategy set. Grounded entirely in the real, built product (CLAUDE.md, the owner and staff app routes, and the live system prompt in `src/app/api/staff/ask-larder/route.ts`), the current Client Services Agreement pricing schedule, and confirmed Notion Decision Log entries. Where evidence does not exist yet, that gap is stated plainly rather than filled in.

## What we sell

Larder is a done for you staff onboarding and compliance system for small independent Australian hospitality venues, built directly from a venue's own procedures rather than generic hospitality content. John visits the venue, gathers its actual SOPs, photos, and staff know how, and turns that into role specific training modules the owner reviews and approves before any staff member sees them. Once live, every staff member gets a bookmarked web app on the venue's existing iPad with their training, an e-signature record proving they completed it, and an always on "Ask Larder" chatbot that answers questions only from that venue's own approved content and never guesses at anything requiring a key, code, or login. The owner gets one dashboard showing who has completed what, whose RSA, food handling, first aid, or Working with Children check is about to expire, which chatbot questions the system could not answer, and any near miss safety reports staff have filed, plus properly formatted printable SOP documents generated from the same approved content. It replaces the folder of outdated PDFs and the "ask whoever's on shift" method of training with one governed, always current source of truth the owner controls.

## Ideal Customer Profile (ICP)

**Who this is for right now:**

- Independent Australian hospitality venues run directly by their owner, roughly 10 to 30 staff. This is the band CLAUDE.md defines the product around, and it is also the size where an owner still personally knows every SOP gap but no longer has time to train each new hire face to face.
- Pubs, cafes, bars, and restaurants with real, if informal, SOPs already in the owner's or head chef's head, in scattered documents, or in photos and habits that have never been written down. Larder's onboarding wizard (`src/app/(owner)/[venueSlug]/owner/(protected)/onboarding/`, covering venue basics, staff roles, menu, RSA, licensing, equipment, food service, crowd control, promotions, and content intake) is built to capture exactly this kind of scattered, undocumented operational knowledge.
- Venues with real compliance exposure, RSA, food handling, WWCC, first aid, where certificate lapses are a genuine liability risk the owner currently tracks by memory or spreadsheet.
- An owner willing to be hands on for one onboarding engagement (interviews, photos, a walkthrough) in exchange for a system that then runs itself. This matches the current service delivery model exactly: John onboards personally, one venue at a time.
- A single site business. Nothing in the pricing schedule, the architecture, or the built dashboard assumes multiple sites or franchise operations.

**Who this is explicitly NOT for yet:**

- Large hospitality groups running multiple sites or franchises. The tech stack isolates one venue per tenant at a time using row level security (CLAUDE.md, architecture decisions section), and the pricing tiers top out at "custom quote" for 26+ staff with no franchise or multiple location packaging defined.
- Anyone expecting to sign up instantly with no human involved. CLAUDE.md is explicit that self-serve SaaS, multi-tenant billing, and a public trial flow are out of scope for v1 "unless explicitly instructed." Positioning this as a self-serve product would misrepresent what a prospect is actually buying right now.
- Venues outside Australia. The compliance content (RSA, WWCC) and the entire certificate tracking feature are built around Australian state and territory regulatory regimes, which differ by state (CLAUDE.md, "Content workflow"). The product has no compliance content for other countries and should not be marketed as if it does.
- Venues that want a generic, off the shelf training library. The entire mechanism is bespoke content built from that specific venue's own SOPs. A venue looking for a stock course catalogue is not the fit.

## Value proposition, using the StoryBrand SB7 framework

**1. A character.** An independent Australian hospitality venue owner, typically running a pub, cafe, bar, or small restaurant with 10 to 30 staff, doing the job of chef, manager, HR department, and compliance officer at once.

**2. Has a problem.**
- *External problem:* Staff training lives in the owner's head, in a folder of outdated documents, or in "ask whoever's on shift." New hires get inconsistent training. Compliance certificates (RSA, food handling, WWCC, first aid) lapse without anyone noticing until an inspection or an incident forces the issue.
- *Internal problem:* The owner feels constantly exposed, one bad shift, one missed certificate renewal, one under trained new hire away from a real problem, and feels they should already have this solved, which is embarrassing to admit out loud.
- *Philosophical problem:* A business this owner has poured years into should not be one unwritten procedure away from a serious incident or a liability claim, and staff joining a well run venue deserve a real, consistent introduction to how it actually operates, not a rushed verbal handoff.

**3. Meets a guide.** Larder, embodied by John, a working chef who has lived this exact problem, not a software vendor selling from the outside. The guide shows empathy (this is what running short staffed kitchens and bars actually looks like) and authority (a working system already handling real compliance tracking, real e-signatures, and a chatbot that is tested against adversarial and out of scope questions before it ever goes live, per the Build Manual's Ask Larder test set).

**4. Who gives them a plan.**
- *Step one:* John visits the venue, gathers the real SOPs, photos, and staff know how directly (Content workflow, CLAUDE.md).
- *Step two:* He builds role specific training modules and the chatbot's approved knowledge base from that material, and the owner reviews and approves every module before it goes live (the owner approval gate, one of the CLAUDE.md non-negotiables).
- *Step three:* Staff complete training and sign off on an iPad already on site, no new hardware, no app store install, and can ask the chatbot questions on shift instead of interrupting a busy supervisor.
- *Step four:* The owner keeps one dashboard for completion, certificate expiry, and the questions the chatbot could not answer, so gaps in written procedure surface instead of staying invisible.

**5. That calls them to action.** Direct: book an onboarding walkthrough and bring the venue's existing SOPs, however messy, so John can build the first modules. Transitional: request the free comprehension quiz add on or a quote for turning an undocumented procedure into a proper SOP, a lower commitment way to see the quality of the output before committing further.

**6. That helps them avoid failure.** No more relying on memory for who is trained on what. No more discovering a lapsed RSA or WWCC after the fact. No more a new hire getting hurt, or hurting the business, because nobody wrote the actual procedure down. No more being the single point of failure for how the venue runs.

**7. And ends in success.** A venue where every staff member has been properly trained on that venue's own procedures, where the owner can see completion and compliance status at a glance, where staff have a reliable, always available answer to "how do we actually do this here" that never invents an answer it should not give, and where the owner can walk away from the floor for an afternoon without every question routing back to them personally.

## Core selling points, ranked

**1. Training built from this venue's own procedures, not a generic course library.**
The entire onboarding wizard (`src/app/(owner)/[venueSlug]/owner/(protected)/onboarding/`, spanning venue basics, staff roles, menu, RSA, licensing, equipment, food service, crowd control, and promotions) exists to capture a specific venue's real operational detail, and the module and chatbot knowledge base are built from that captured content, not a stock template. This is the single hardest thing to fake and the clearest reason a generic hospitality LMS cannot substitute for Larder.

**2. A chatbot staff will actually trust, because it is built not to lie to them.**
This is not a prompted promise, it is enforced at two layers: the knowledge retrieval itself is filtered to the venue before Claude ever sees it (so it is structurally unable to answer from another venue's content or from general knowledge), and the fallback rule refuses to guess at anything requiring a key, code, alarm, or login, redirecting to a supervisor instead. The live system prompt in `src/app/api/staff/ask-larder/route.ts` shows this was hardened against a real, documented failure mode found in testing (a 58 question live shift simulation flagged false positive refusals on ordinary questions), and the Build Manual requires an explicit adversarial injection test before any venue goes live. Most AI chatbot pitches cannot show this kind of tested, documented hardening; Larder can.

**3. Owner stays the checkpoint, so liability never quietly shifts onto Larder.**
Every module requires explicit owner approval before staff ever see it (CLAUDE.md, "Owner approval gate"). Combined with the e-signature built internally by Larder (typed name, timestamp, IP and device, immutable) captured at `src/app/(staff)/[venueSlug]/(protected)/signature/`, the venue keeps a defensible, auditable record that a specific staff member was trained on a specific version of a procedure the owner had already approved. This is a real liability protection argument, not a soft "peace of mind" claim, and it is worth stating to owners in exactly those terms.

**4. A working owner dashboard that turns invisible risk into something you can see.**
This is not a roadmap promise, the routes exist and are built: `staff`, `completions`, and `certs` for training and compliance status, `weekly-report` for an automated staff activity digest, `escalations` for chatbot questions the system genuinely could not answer (a live signal of where written procedure has a real gap), and `near-misses` for safety incident reports staff have submitted, complete with photo attachments the owner can resolve. Taken together this is a genuine visibility upgrade over "the owner finds out when something goes wrong," and every piece of it can be demonstrated live rather than described in the abstract.

**5. A real, professional SOP document as a byproduct of onboarding, not extra work.**
The SOP generator (owner routes under `sops/`, backed by `supabase/migrations/20260911160000_sop_documents_and_edit_requests.sql`) turns the venue's approved training content into a formatted, printable SOP document (purpose, scope, who performs it, materials, procedure, callouts for anything safety critical, definition of done, escalation) at the click of a button, with a flow for requesting an edit. Many venues in this size band have never had a single procedure formally written down; this hands them a set of real, professional documents purely as a side effect of doing the training work they were already paying for, which is worth demonstrating concretely (show the document itself) rather than just describing.

**6. On the floor access through QR coded stations, and nothing holding a venue hostage if the relationship ends.**
Physical stations (`src/app/(owner)/[venueSlug]/owner/(protected)/stations/`) generate QR codes staff can scan at an actual work station to reach the training module for that spot directly, useful on a fast moving kitchen or bar floor mid shift, where "open the app and find the right module" is one step too many. Separately, the terms mean no venue is ever locked in (month to month, 30 day cancellation notice, full export of content and completion records on exit, after which chatbot access simply ends), a real and rare thing to be able to say honestly in a small business software pitch.

**A tempting selling point that is explicitly NOT available yet: social proof.** There is no live paying customer base yet ("Venue #1: raw," CLAUDE.md, "Content workflow", describes onboarding a first venue by hand, and the pricing schedule carries a discretionary "Founder's rate" specifically for a first client). Do not claim "trusted by," a venue count, a testimonial, or a case study until a real venue has actually gone live and can be named or quoted with permission. When Venue #1 does go live, its outcome (once real and specific, e.g. actual completion rates or a specific compliance catch) becomes the first legitimate proof point and should replace this note, not sit alongside a fabricated one.

## A repeatable process for positioning a new segment

When Larder expands beyond Australian hospitality (a new vertical) or beyond this venue size band (a new segment within hospitality), repeat this exercise from first principles rather than adapting this document's language. The steps, in order:

1. **Derive "what we sell" again from the product, not from this document.** Read the equivalent of CLAUDE.md and the actual built routes for that context before writing a single sentence of positioning. If the underlying mechanism changes (for example, a vertical where an owner approval gate does not make sense, or where compliance certificates are not the relevant concern), the value proposition must change with it, not just the vocabulary.
2. **Run the ICP exercise again as an inclusion and exclusion pair.** For every candidate segment, name who it is for and who it is explicitly not for yet, and ground both in a real constraint (architecture, pricing, current delivery capacity, or content coverage), the same way this document's ICP is bound by compliance content that only covers Australia and by a data model that isolates one venue per tenant at a time. A segment definition without an honest exclusion side is not a segment definition.
3. **Rebuild the SB7 narrative from the new character's actual problem, not by search and replace.** The external, internal, and philosophical problems for, say, a retail or allied health owner are not the hospitality owner's problems with new nouns substituted in. Interview or research the new character directly before drafting the plan and calls to action.
4. **Rank the selling points again against what is actually built for that segment.** A selling point earns its place only if a specific file, route, or locked decision backs it, exactly as this document cites `src/app/api/staff/ask-larder/route.ts`, the onboarding wizard routes, and the SOP generator migration. If the equivalent feature does not exist yet for the new segment, say so and treat it as a build gap, not a marketing gap to paper over.
5. **Check the social proof honestly, every time.** Before publishing, confirm what real evidence exists for that specific segment, do not carry over proof points earned in hospitality as if they transfer automatically to a new vertical's buyers.
6. **Log the result in the Decision Log.** Once a new segment's positioning is settled, record it in the Larder HQ Notion Decision Log so it becomes the authoritative version future work checks against, the same status this document's source facts already hold.
