# Landing page audit and recommendations

Scope: the public homepage at `/` (`src/app/page.tsx`) and every section, page, and link it renders or points to. Read in full for this audit: `src/app/page.tsx`, `src/components/marketing/MarketingHero.tsx`, `FeatureGuideStrip.tsx`, `ExplainerVideoSection.tsx`, `ProblemSolutionSection.tsx`, `ComplianceSection.tsx`, `HowItWorksSection.tsx`, `SiteFooter.tsx`, `ContactForm.tsx`, plus `src/app/contact/page.tsx`, `src/app/legal/page.tsx`, `src/app/privacy/page.tsx`, and the demo venue gateway at `src/app/[venueSlug]/page.tsx`.

No metrics, testimonials, or case studies appear anywhere below. None exist yet, and none should be invented. Where a recommendation would normally lean on social proof, it leans instead on the three honest, already true things Larder can point to today: the live Two Fires demo, the specific mechanism (venue isolated chatbot, owner approval gate), and the specific written guarantees (month to month, cancel with notice, full data export).

## Part 1: what is actually on the page today

Section order, top to bottom, with the real copy quoted verbatim.

### Header (sticky, `src/app/page.tsx`)
Logo mark plus wordmark "Larder." Two nav links: "See a live demo" (`/two-fires`) and "Contact us" (`/contact`).

### Hero (`MarketingHero.tsx`)
A scroll pinned, animated sequence. Eyebrow: "For independent hospitality venues." Four headline phrases crossfade in as the visitor scrolls: "Training." then "Onboarding." then "Repeat." then the payoff line "Ask Larder." (with "Larder" set in Preserve Red). Each phrase carries its own one line subhead:
- "The same training, every hire."
- "Modules, certs, and questions, all in one place."
- "New hire twelve gets what new hire one got."
- "Built from your venue's own way of doing things. Training your staff can actually use on shift."

Two buttons sit below the headline block throughout the whole sequence: "Get started" (jumps to the `#cta` anchor at the bottom of the page, it is not a signup flow) and "Learn more" (jumps to `#explainer-video`). Beside the text, an animated iPad mockup shows a splash screen settling into a bento style preview of the product.

### Feature strip (`FeatureGuideStrip.tsx`, id `feature-guide`)
Four cards, no heading of their own above them:
- "Built from your SOPs": "Not a generic course. Trained on how your venue actually runs."
- "Certs, tracked automatically": "RSA, food handling, first aid, and WWCC, all nudged before they lapse."
- "Your SOPs, always on shift": "Ask Larder only ever answers from your own approved content."
- "Owner visibility": "Completions, certificates, and escalations, all in one place."

### Explainer video (`ExplainerVideoSection.tsx`, id `explainer-video`)
Dark section. Eyebrow "See it in motion," heading "What your team actually sees." A square video, autoplaying muted on scroll into view with a visible unmute button in the corner. No caption or supporting copy beyond the heading.

### Problem and solution (`ProblemSolutionSection.tsx`)
Eyebrow "The real cost of training by memory," heading "Binders don't train anyone." Three problem cards:
- "Training lives in one manager's head, a binder nobody reads, or last week's group chat."
- "Every new hire learns a slightly different version of the same shift."
- "When someone experienced leaves, their knowledge leaves with them."

Closing line: "Ask Larder turns what your best staff already know into training every new hire gets the same way, built from your own venue, not a generic course."

### Compliance (`ComplianceSection.tsx`)
Dark section. Eyebrow "Compliance, built in," heading "Trained on your own way of doing things. Compliant with the rules that actually apply." Body: "Since December 2023, Standard 3.2.2A of the Food Standards Code has required a trained food safety supervisor and trained food handlers in every food business in Australia, enforced by your state and territory food authority. Ask Larder builds that training into the same modules your staff already use for everything else, so it happens as a normal part of onboarding, not a separate box to tick."

### How it works (`HowItWorksSection.tsx`)
Eyebrow "How it works," heading "A done for you service, not a shelf of settings," subhead "You don't build modules yourself. We do, starting with one visit to your venue." Four genuinely sequential numbered steps (01 through 04, a real sequence, so the numbering matches the brand kit's own carve out): Walkthrough, Build, Approve, Live, each with a full description.

### Final CTA (`src/app/page.tsx`, id `cta`)
"Want to see it on your own venue?" / "Book a walkthrough. We'll bring your own SOPs into it." One button: "Book a walkthrough" to `/contact`. No supporting copy of any kind beside the button.

### Footer (`SiteFooter.tsx`)
Address ("157 Fitzroy Street, Saint Kilda VIC 3182"), tagline, and links: Features, See it in motion, Book a walkthrough, See a live demo, Legal, Privacy Policy.

### Linked pages
- `/contact`: heading "Book a walkthrough," subhead "Tell us about your venue. We'll bring your own SOPs into it," then the real form (`ContactForm.tsx` posts to `/api/contact`, which sends through Resend).
- `/legal`: "Privacy Policy and Terms," last updated 6 September 2026, marked in its own code comment as reviewed and passed by a commercial lawyer.
- `/privacy`: "Privacy & AI Use Policy," last updated 11 September 2026, marked in its own code comment as pulled verbatim from the finalised Notion source of truth and described there as the actual finalised policy for the domain.
- `/two-fires`: the demo venue gateway, served by the same dynamic `src/app/[venueSlug]/page.tsx` route every real venue uses, backed by a real seeded venue (`scripts/seed-block-o-two-fires.mjs`, `src/data/two-fires-demo.json`). Session memory confirms this venue was built and functionally tested on 4 September 2026 with a strong pass. This CTA target is real and safe to keep recommending.

### Copy compliance check (no dashes rule)
Every visible string in every component above was checked for hyphens, en dashes, and em dashes used as punctuation. None were found. All em dashes in these files live only inside code comments (developer documentation, exempt under the rule). The only hyphenated visible strings anywhere are genuine compound words already used correctly (for example "month to month," written with no hyphen at all, appears in `/legal` and `/privacy`). This page is currently clean on this rule. Keep checking it this way after every copy change, since the rule is easy to violate by accident and is treated as absolute.

## Part 2: framework evaluation

Evaluated against the standard SaaS landing page conversion checklist: five second above the fold clarity, a single clear primary call to action repeated at sane intervals, objection handling before the ask, risk reversal, honest proof, and a logical scroll narrative.

**Five second above the fold clarity: partial fail.** The very first paint of the hero, before any scroll or interaction, shows only the eyebrow line and the single word "Training." with a short subhead. The full statement of what Larder is, who it is for, and the payoff line "Ask Larder" only appears three animation beats later, after the visitor scrolls through the pinned sequence. A visitor who glances and leaves without scrolling sees a bare word, not a value statement. Visitors with reduced motion enabled get the final phrase directly, so the gap only affects the default, most common case.

**Single clear primary call to action, repeated at sane intervals: fail.** Two real destinations exist on this whole site, `/contact` and `/two-fires`, but five different labels point at them: "Get started," "Learn more," "Book a walkthrough," "Contact us," and "See a live demo." "Get started" in particular reads as a self serve signup phrase for a product that is explicitly not self serve. The two places that do repeat consistent language ("Book a walkthrough" on the final CTA and on `/contact` itself) are a genuine strength, worth extending everywhere else rather than leaving as an island.

**Objection handling before the ask: fail.** The three concrete, honest facts most likely to overcome hesitation for a first time venue owner (month to month billing, thirty days notice to cancel, full data export on cancellation) exist only inside `/legal` and `/privacy`, pages a prospect is unlikely to read before deciding whether to book a call. None of it appears anywhere in the scrolling homepage itself.

**Risk reversal: fail, same root cause as above.** The guarantees exist and are real, they are simply not placed at the point of the ask.

**Honest proof: pass, with one placement gap.** The page correctly contains no fabricated testimonials, logos, or numbers. The one honest proof point that does exist, the live interactive Two Fires demo, is only reachable from the header and footer chrome. It never appears inside the body content itself as an offered next step alongside the main ask.

**Logical scroll narrative: mixed.** The order is Hero, Features, Video, Problem and Solution, Compliance, How it works, CTA. This shows the solution (Features) and a demonstration (Video) before the Problem and Solution section ever names what is broken today. That sequencing is a deliberate, documented decision (see the code comments in `FeatureGuideStrip.tsx` and `ProblemSolutionSection.tsx`), not an oversight, and it can work for a well informed visitor who already knows they have a training problem. It is a real inversion of the classic want building order (problem first, then solution), and is worth treating as a testable hypothesis rather than a settled choice.

## Part 3: concrete recommendations

Each one names the exact file to change.

1. **Add the real guarantees to the final CTA, `src/app/page.tsx` (the `id="cta"` block, lines 49 to 58).** This is the single highest leverage fix on the page. Add one short line above or below the "Book a walkthrough" button stating the three real, already written facts from `/legal`: month to month billing, thirty days notice to cancel, full data export kept on cancellation. This takes true objection handling that currently only exists on a page almost nobody reads and puts it exactly where the ask happens.

2. **Rename the hero's "Get started" button, `src/components/marketing/MarketingHero.tsx` (around line 255).** Change its label to "Book a walkthrough" so it matches its real destination in wording, matches the language already used identically on `/contact` and the final CTA, and drops the self serve connotation that does not match a hand delivered service.

3. **Standardise call to action wording site wide.** Across `src/app/page.tsx` (header nav), `MarketingHero.tsx`, and `SiteFooter.tsx`, settle on exactly two labels used consistently everywhere: "Book a walkthrough" for every link to `/contact`, and "See a live demo" for every link to `/two-fires`. Retire "Contact us," "Get started," and "Learn more" as separate labels for the same destinations (the video anchor can keep a distinct label, since it is a distinct destination, but it should not share the confusion budget with the two real conversion paths).

4. **Resolve the two competing legal pages, `src/app/legal/page.tsx` and `src/app/privacy/page.tsx`.** Both are live, both are linked from `SiteFooter.tsx` under different labels ("Legal" and "Privacy Policy"), both describe themselves as authoritative, they carry different last updated dates (6 September vs 11 September 2026), and they do not say exactly the same thing. A prospect or a regulator could reasonably read either one as the operative policy. This needs a real decision from John, not a copy edit: either retire `/legal` and repoint its footer link to `/privacy`, or merge the two into one canonical page. Flagging this as a real bug, not a style note.

5. **Broaden the compliance section's scope, `src/components/marketing/ComplianceSection.tsx`.** It currently names only FSANZ Standard 3.2.2A (food safety), while `FeatureGuideStrip.tsx` a few sections earlier already promises tracking for "RSA, food handling, first aid, and WWCC." A pub or bar owner who reads only the Compliance section could conclude Larder is food service specific. Keep the FSANZ citation as the credible, named, verifiable anchor example, but add one sentence naming the fuller certificate set already promised elsewhere so bar and pub prospects see themselves in it too.

6. **Offer the low commitment path inside the final CTA, `src/app/page.tsx` (the `id="cta"` block).** Add "See a live demo" as a secondary link next to "Book a walkthrough" at the exact moment a visitor is deciding whether to commit to a call. Right now the demo is only reachable from the header and footer, never from inside the content flow itself.

7. **Consider a short pricing transparency line near the final CTA, `src/app/page.tsx`.** Real pricing already exists (a setup fee that varies by venue size, plus a monthly plan). The page currently states no pricing information anywhere, which is a reasonable choice for a quoted, hand delivered service, but a single sentence such as "Setup is a one time fee based on your venue's size, plus a monthly plan you can cancel anytime" would remove a real, common objection (a prospect who avoids booking a call because they fear an unknown, possibly large number) without disclosing exact figures or the discretionary early client rate. This is a judgement call for John, not something to add unilaterally, since it touches how sales conversations open.

8. **Consider a concrete response time in `ContactForm.tsx`.** The sent state currently reads "Message sent. We'll be in touch soon." Once John has a real typical turnaround, replacing "soon" with a specific commitment (for example "within one business day") closes a small, final moment objection. Do not add a number that is not true yet.

## Part 4: how to re run this audit after the next round of changes

A lightweight checklist a marketer (or Claude) can run through again without redoing the full research pass:

1. Re read `src/app/page.tsx` top to bottom and list the sections in their current order. Confirm the order still matches what is documented here, or note the new order and ask whether it was deliberate.
2. Re read every component `page.tsx` imports, in full, and copy out the current real headline, subhead, and CTA label for each section, the same way Part 1 above does. Do not paraphrase, quote the literal strings.
3. Grep the marketing components and every page they link to for `—`, `–`, and any hyphen used as punctuation rather than inside a genuine compound word, a URL, or a code comment. Confirm the result is still clean.
4. Count every distinct call to action label used across the whole page (header, hero, body sections, final CTA, footer) and confirm they still map to only two real destinations with consistent wording, per Recommendation 3 above.
5. Confirm `/legal` and `/privacy` still exist as they do today, or confirm Recommendation 4 was actioned and only one canonical legal page remains, and that the footer points to it.
6. Click through to `/two-fires` (or check for a current seed script or fixture backing it) before recommending it again as a CTA target, since a demo venue can go stale or get removed in a later refactor.
7. Re apply the six point SaaS checklist from Part 2 fresh: five second clarity, single CTA repeated, objection handling before the ask, risk reversal, honest proof, logical scroll narrative. Write one line per point, pass or fail, with the reason.
8. Only propose recommendations tied to an exact file and line reference, the same way Part 3 does, and never propose or accept a testimonial, logo, or number that is not independently verifiable at the time of the audit.
