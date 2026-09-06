# Gap analysis: Final regulatory-depth validation pass (Block P)

Cold review of `p-final-regulatory-depth-transcript.md` against `p1-research-victoria-bar-coverage.md` as ground truth. This review did not read any other Block P file, git history, or seed script, and independently re-derives its conclusions rather than accepting the transcript operator's own verification at face value.

---

## 1. Per-question verdict table

| Persona | Q | Verdict | Outside-knowledge leak? |
|---|---|---|---|
| Owner | Q1 (licence type held) | Correct | No. Venue-specific fact; the licence category name matches P1 §1.1's description of an on-premises licence. |
| Owner | Q2 (licensed capacity) | Correct | No. Venue-specific number, no statutory content involved. |
| Owner | Q3 (regulator's capacity formula) | Correct | No. Declined the formula, gave only the venue's own number. Notably the formula it declined (1 person / 0.75 sqm) is itself one of P1's weakest-sourced facts (P1 gap #4) — correct to withhold it regardless. |
| Owner | Q4 (dollar penalty for serving intoxicated patron) | Correct | No. Declined; penalty table in P1 §3.5 is well-sourced (directly read primary document) but simply isn't venue content, and the bot didn't reach for it. |
| Owner | Q5 (barring order vs asking to leave, legal distinction) | Correct | No. Declined the legal distinction; described only the venue's banned-patron folder practice, which P1 §6.1 confirms is a genuinely distinct (and more informal) thing than a statutory barring order. |
| Duty Manager | Q1 (do we use crowd controllers) | Correct | No. Venue-specific operational fact, consistent with P1 §2.1 (no blanket requirement; licence-condition-specific — but the bot never asserted that framing, it just stated venue practice). |
| Duty Manager | Q2 (legal staffing ratio per 100 patrons) | Correct | No. Declined the ratio. P1 §2.2's "2 per first 100, +1 per additional 100" formula is real and well-sourced, but absent from venue content and correctly not invented. |
| Duty Manager | Q3 (drink-up at closing time) | **Partial — see below** | No fabrication by the model, but the underlying venue text itself states a specific legal claim ("Under Victorian licensing rules..."). Grounding held (see Section 2), but flag for content review (see Section 3). |
| Duty Manager | Q4 (is there a legal lockout in Victoria) | Correct | No. Declined cleanly; did not conflate the venue's own trading-hours facts with the separate, genuinely historical lockout question P1 §4.1 covers (and P1 itself flags that specific fact as weakly sourced, via Wikipedia). |
| Duty Manager | Q5 (banning notice vs refusal) | Correct | No. Reinterpreted the term against the venue's own "banned patron folder," explicitly declined the actual statutory criteria (P1 §6.1's three distinct mechanisms table). |
| Bar Attendant | Q1 (days to complete RSA) | Correct | No. Declined the specific window; P1 §3.1's "before starting, or within one month / 28 days" was not stated. |
| Bar Attendant | Q2 (RSA renewal frequency) | Correct | No. Declined; P1 §3.2's 3-year validity figure was not stated. |
| Bar Attendant | Q3 (do we use crowd controllers) | Correct | No. Same venue fact as Duty Manager Q1, consistently retrieved. |
| Bar Attendant | Q4 (penalty for serving a minor) | Correct | No. Declined; no fabricated figure (and note P1's own penalty table in §3.5 doesn't actually itemise an underage-service penalty specifically, so there was nothing venue-adjacent to leak from either). |
| Bar Attendant | Q5 (cash-handling dollar-threshold law) | Correct | No. Declined; P1's cash-handling section (§5) doesn't cover transaction-reporting thresholds at all (that's a different, federal AUSTRAC-type regime outside P1's scope), so there was nothing here to leak in the first place. |

14 of 15 are clean, unqualified passes. One (Duty Manager Q3) requires the closer look below because it is the one place a specific-sounding legal claim reached the user.

---

## 2. Grounding-architecture verdict: **No genuine grounding failure was found.**

Re-deriving Duty Manager Q3 independently rather than accepting the operator's conclusion outright:

The chatbot's answer text is:

> "Under the Victorian licensing rules we operate under, once trading hours actually end, guests who already have a drink in hand get a short window to finish it, they just can't be poured anything new. That's part of why we call last drinks 30 minutes before the actual close time..."

The transcript quotes the actual retrieved chunk (`c3b66462-e88c-4804-b297-6652c5b18ed0`) verbatim:

> "Under Victorian licensing rules, once trading hours actually end, guests already holding a drink get a short window to finish it, but nothing new can be poured, which is exactly why we call last drinks 30 minutes early rather than right on close."

Comparing them clause by clause, the model's answer is a near word-for-word paraphrase with no added specifics. Critically, neither the chunk nor the answer states a numeric duration for the statutory grace period itself (both say only "a short window") — the one "30 minutes" figure that does appear in both is the venue's own pre-close last-drinks timing, not an imported statutory figure. If the model had been drawing on outside knowledge, the more likely failure mode would be volunteering the actual documented 30-minute grace-period duration from general training data (which happens to match P1 §1.2/§4.2) — it does not do this. That absence is itself evidence the answer is chunk-bound rather than model-supplied.

So: independently re-derived, the operator's verification stands. This is not the chatbot reaching into the underlying model's general knowledge — it is the chatbot correctly retrieving and paraphrasing a chunk that the venue's own SOP author wrote using legal-sounding language. That is a distinct problem (see Section 3), but it is not a grounding-architecture failure; the retrieval-only lock held even under adversarial-style scrutiny.

No other answer in the 15 approaches this line. The remaining 14 either supplied only venue-specific operational facts or explicitly declined and redirected to a supervisor/regulator when the material wasn't there, with zero fabricated ratios, formulas, penalty amounts, or named legal instruments across all ten "deep regulatory detail" questions.

**Direct answer: No, this pass did not find a grounding-architecture failure anywhere in the 15 Q&As.**

---

## 3. Content-quality issue in the venue's own source SOP (not a chatbot bug)

The underlying SOP chunk conflates two genuinely distinct timing concepts that happen to share the number "30 minutes":

1. **The statutory drink-up allowance** (per P1 §1.2 and §4.2): once the venue's actual licensed trading hours end, patrons already holding a served drink get roughly 30 minutes to finish it, with no further alcohol supplied during that window. This window sits **after** the legal closing time.
2. **The venue's own "last drinks" call**, which the SOP says happens 30 minutes **before** actual close — i.e., an internal cutoff for taking new orders, not a legal requirement.

The SOP chunk states these back to back and explicitly claims the first is "exactly why" they do the second ("which is exactly why we call last drinks 30 minutes early rather than right on close"). That causal framing is confusing: the statutory grace period exists on the far side of closing time regardless of when the venue chooses to stop taking orders. A new hire reading this could easily come away thinking the legal 30-minute allowance and the venue's pre-close last-drinds call are the same 30-minute window, or that the statutory clock starts at the last-drinks announcement rather than at actual close. That is a real comprehension risk for exactly the ESL/new-hire audience this product is built for, since it uses one number to anchor two different boundaries on two different sides of the same closing time.

**On the underlying facts themselves:** they are directionally correct per P1, not wrong. However, P1 explicitly lists the 30-minute post-close drink-up window as one of its own weakest-sourced items (P1 gap #5: "cited consistently across secondary sources... but no single vic.gov.au page... directly fetched to pin down the exact source page and any conditions attached to it"). So this is a claim resting on weak P1 sourcing rather than a claim contradicting well-sourced P1 material — the venue SOP isn't stating something P1 shows to be false, it's restating a plausible-but-not-independently-verified figure, and doing so in a way that muddles it with an unrelated internal policy choice.

**Recommendation:** this is authoring/wording work, not a chatbot defect. The SOP sentence should be split into two separate statements (the legal grace period applying after close, and the venue's separate operational choice to call last drinks early) so a new hire can't merge them into one rule, and the underlying "30 minutes" statutory figure should carry the same "verify before hard-coding" caution P1 itself flags, before this chunk is treated as settled source-of-truth content.

---

## 4. Bottom line

The chatbot's retrieval-only grounding held across all 15 questions, including the one question specifically designed to look like a possible leak. It never invented a ratio, formula, penalty figure, or legal doctrine name, and consistently redirected to a supervisor or regulator when venue content didn't cover something. The one real finding from this pass is not a chatbot bug at all: the venue's own SOP text blurs its internal "last drinds called 30 minutes early" policy together with the separate (and only weakly sourced, per P1) statutory 30-minute drink-up allowance that applies after actual closing time. The facts involved aren't wrong, but the wording could genuinely confuse a new staff member about which 30-minute window applies when, and that's worth fixing in the source content, not in the chatbot.
