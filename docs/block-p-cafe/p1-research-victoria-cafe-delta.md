# P1 Research — Victoria Cafe-Specific DELTA Coverage (DRAFT, for review)

**Status: RESEARCH ONLY — nothing here is final copy or module text.** Produced per Build Manual Block P1 (cafe pass), 7 Sep 2026. Sourcing discipline matches the bar and pub passes: real, cited, current, primary sources wherever possible; anything relying on a search-index summary rather than a verified direct fetch is labelled as such; genuine gaps are flagged honestly rather than filled with plausible-sounding guesses.

**This is a DELTA document.** It assumes both prior passes as baseline and does not repeat what they already cover:

- [`p1-research-victoria-bar-coverage.md`](../block-p/p1-research-victoria-bar-coverage.md) — liquor licence categories generally, RSA mechanics, patron capacity, crowd-controller licensing under the Private Security Act 2004, closing procedures, general cash handling, basic security/barring orders.
- [`p1-research-victoria-pub-delta.md`](../block-p-pub/p1-research-victoria-pub-delta.md) — full-kitchen food safety thresholds (Class 1/2/3A classification system, FSS/FSP mechanics, Standard 3.2.2A, the 2-hour/4-hour temperature danger zone rule), happy-hour/promotional pricing rules, and keg/cellar management at volume.

Where this document needs one of those, it links back rather than re-deriving it. Regulator naming follows the bar pass's finding: the current operating name is **Liquor Control Victoria (LCV)**, supported by the **Victorian Liquor Commission**; VCGLR is the legacy name.

**Scope.** Victoria (Australia) only, same standing rule as every prior pass in this series.

**The core generalisation challenge this document exists to test.** The bar and pub passes both assumed a venue that definitely holds a liquor licence and definitely runs at least a full-service bar. A Victorian cafe often does neither — many cafes trade on food and coffee alone, with no alcohol-specific compliance surface at all. This document does not assume a licence exists; it researches what licensing options genuinely exist for a small cafe, confirms what "unlicensed" actually permits, and treats the possible finding of "there is nothing here to research because this cafe has no alcohol compliance surface" as a legitimate, useful answer rather than a failure to find something.

---

# 1. Licensing reality check — what a Victorian cafe actually needs (or doesn't)

## 1.1 The default state: a coffee-and-food cafe needs no liquor licence at all

Confirmed directly from [vic.gov.au — Do you need a liquor licence?](https://www.vic.gov.au/do-you-need-liquor-licence) (fetched directly, 7 Sep 2026): a licence is only required once alcohol enters a transaction — selling it, including it in a price, accepting any form of payment or exchange for it (including an honesty box), or serving/mixing alcohol a customer brought in. A cafe that sells only coffee and food, with no alcohol anywhere in its operation, **requires no liquor licence, no permit, and has no alcohol-specific compliance surface whatsoever.** This is the plain, correct generalisation finding for this venue type: unlike the bar and pub passes, this document cannot assume alcohol compliance is even a live topic for a given cafe — it depends entirely on what that specific venue actually does.

## 1.2 If the cafe wants to allow BYO but not sell alcohol: a BYO permit, not a licence

Confirmed directly from [vic.gov.au — BYO permit](https://www.vic.gov.au/apply-byo-liquor-permit) (fetched directly, 7 Sep 2026):

- A cafe that does **not** already hold a General, Restaurant and Cafe, On-premises, full club, or restricted club licence must apply for a **BYO liquor permit** if it wants to let customers bring their own alcohol to drink on the premises.
- The permit only covers customer-supplied alcohol. **A BYO permit does not allow the venue to sell alcohol itself** — that is a separate, later step (1.3) if the cafe ever wants to build a small list.
- If the cafe already holds any of the licences above, BYO is automatically allowed as part of that licence and no separate permit is needed.
- Requires supplying trading hours and, for most venues, a red line plan showing where consumption is allowed.

**Operational reality if a cafe skips the permit entirely and just lets people bring wine informally:** per a converged search-index summary citing **s113(1B) of the Liquor Control Reform Act 1998 (Vic)**, it is an offence to permit or allow liquor to be consumed or supplied on unlicensed premises, and this extends to letting customers BYO at an unlicensed restaurant or cafe without the appropriate permit. **This specific section citation was not independently verified by a direct austlii fetch in this pass** (the same HTTP 403 pattern the bar pass hit on every direct LCRA section fetch) — flagged as a priority item to verify given the real compliance weight (Section 5, gap 4), but the underlying practical rule — "no licence and no permit means the venue genuinely cannot lawfully wave BYO through" — is corroborated consistently across the vic.gov.au consumer-facing pages fetched directly in 1.1 and 1.2, which both state a licence or permit is needed for an unlicensed cafe to allow BYO, no exceptions given.

## 1.3 If the cafe wants to actually sell alcohol: the Restaurant and Cafe licence (s9A)

The bar pass named this licence only in passing, for contrast, without detail ("not the typical bar category, included for contrast only"). For a cafe, this is the **primary relevant licence category** if it wants a small wine/beer list alongside meals — and it is genuinely distinct from the General and On-premises licences the bar pass covered in depth. Confirmed directly from [vic.gov.au — Restaurant and cafe liquor licence](https://www.vic.gov.au/apply-restaurant-and-cafe-liquor-licence) (fetched directly, 7 Sep 2026):

- **What it permits:** sell alcohol for on-site consumption, plus a limited amount of packaged alcohol with takeaway or home-delivered meals.
- **Trading hours** (identical structure to the bar pass's General licence table): Mon–Sat 7am–1am, Sunday 10am–1am, ANZAC Day/Good Friday 12pm–1am. Outdoor dining alcohol service is permitted until 11pm with council approval.
- **The defining condition that makes this licence category different from a bar's General/On-premises licence:** the venue's **main activity must remain meal preparation and service at all times**, and **tables and chairs must be set up so at least 75% of customers can be seated** — a bar has no equivalent seating-ratio condition.
- **No loud music (live or recorded) after 11pm** — again, a condition specific to this licence category, not found on the General/On-premises licences the bar pass researched.
- **Takeaway packaged alcohol is capped**, unlike a General licence's broader takeaway allowance: **one bottle of wine, or a 6-pack of beer/cider/pre-mixed spirits**, only with a meal, only until 11pm.
- **BYO is automatically allowed** on this licence — no separate permit needed (cross-reference 1.2).
- **The same 30-minute drink-up period after close** applies as on a General licence (consistent with the bar pass's finding).
- **Application fees scale by declared patron capacity**, same structure as the bar pass found for General licences: 0–200 patrons $518.10, 201–400 patrons $759.90, 401+ patrons $1,036.20 (non-refundable).
- **Training must be completed before applying**, and **applications need at least 11 weeks** lead time.

## 1.4 The licensing-reality finding, stated plainly

A Victorian cafe's alcohol compliance surface is genuinely variable and should never be assumed to look like the bar or pub baseline:

- **No alcohol at all** → zero licence, zero permit, zero ongoing alcohol-specific compliance obligation.
- **BYO only, no sales** → a BYO permit (unless the cafe happens to already hold a fuller licence), with the s113(1B)-sourced but not-yet-primary-verified rule that skipping this is a genuine offence, not just a grey area.
- **A small wine/beer list with meals** → the Restaurant and Cafe licence (s9A), a licence category the bar pass deliberately did not detail, with its own distinct conditions (75% seating rule, capped takeaway, no BYO-permit-needed) that do not carry over from the General/On-premises licences a bar or pub would hold.

Do not assume a Victorian cafe holds a full liquor licence, and do not default to bar/pub-style RSA and crowd-control obligations (already covered in the bar pass, Sections 2–3) unless the specific venue actually sells alcohol under one of the above licences — for a genuinely coffee-and-food cafe, none of that applies at all, and saying so is the correct, complete answer rather than an evasion.

---

# 2. Food Safety Supervisor and Food Safety Program weight for a cafe

## 2.1 Classification: a typical cafe is Class 2, not Class 3 (bar) or the pub pass's Class 2 full-kitchen case

Directly fetched from **[safefood.vic.gov.au — Classifications for food businesses](https://www.safefood.vic.gov.au/classifications-food-businesses)** (fetched directly and successfully parsed, 7 Sep 2026 — this resolves the pub pass's flagged health.vic.gov.au/safefood.vic.gov.au migration gap for this specific page):

- **Class 2** is defined by the handling of **unpackaged, potentially hazardous food** — the page's own worked example states plainly that "restaurants, cafes, and takeaways" involving potentially hazardous food "processed on-site from raw... with time delay before serving" are Class 2.
- **A typical cafe selling coffee, light meals, counter food, and a display cabinet of pre-made items lands in Class 2** — the same class the pub pass's full-kitchen venue occupies, and a materially higher tier than the bar pass's Class 3 (cold-snacks-only) venue.
- This is the single most important classification finding for this document: **a cafe does not get the bar's Class 3 "no FSS required" exemption just because it isn't running a full a la carte kitchen.** Serving unpackaged hot food, sandwiches, or a display cabinet of pre-made salads/slices from a counter is enough on its own to trigger Class 2, regardless of kitchen scale.

## 2.2 Food Safety Supervisor — mandatory for a cafe, with real training specificity

Directly fetched from **[safefood.vic.gov.au — Food safety supervisor](https://www.safefood.vic.gov.au/food-safety-supervisor)** (fetched directly, 7 Sep 2026):

- **Class 1, most Class 2, and Class 3A** food premises must nominate an FSS — this explicitly includes cafes as Class 2 hospitality businesses.
- The only Class 2 carve-out is **community groups trading no more than 2 consecutive days, predominantly volunteer-run** — not relevant to a real, ongoing cafe.
- **Class 3 and Class 4 businesses are exempt** from needing a nominated FSS (staff must still have adequate food-handling knowledge, but no certified supervisor is required) — this is the exemption the bar pass's venue relied on, and the line a real cafe crosses the moment it serves unpackaged hot food or holds a display cabinet of prepared items.
- **RTO training unit codes, genuinely new detail this pass located and the prior two passes did not:** FSS candidates in the hospitality sector complete **SITXFSA005** and **SITXFSA006** through a registered training organisation. (Retail-sector FSS uses SIRRFSA001; food processing uses FBPFSY2002 — noted for completeness, not cafe-relevant.)
- The source page notes RTOs periodically change unit codes and that certificates issued under superseded codes remain valid.

**Certificate validity — 5 years, with a transition date:** the safefood.vic.gov.au FSS page itself did not state a validity period in what was fetched, so this figure rests on **converged secondary/training-provider sources** (melbtech.edu.au, eot.edu.au, cht.edu.au — all describing the same rule consistently): FSS certificates are valid for **5 years**; a rule change from **8 December 2023** means certificates issued before that date remain valid only until **8 December 2028**, after which renewal via an RTO refresher is required regardless of original issue date. This matches the pub pass's own "5 years" finding but adds the specific transition mechanics — **flagged as secondary-sourced, not independently confirmed against a single primary page in this pass** (Section 5, gap 3).

## 2.3 Food Safety Program — a cafe is very likely exempt from the full audited version, same logic as the pub pass's non-manufacturer finding

Directly fetched from **[safefood.vic.gov.au — Food safety programs](https://www.safefood.vic.gov.au/food-safety-program)** (fetched directly, 7 Sep 2026):

- **Class 1 businesses and Class 2 manufacturers** must lodge a full, independently audited Food Safety Program.
- **Class 2 retail and food service businesses — the category a cafe sits in — are only required to have a full audited FSP if they perform specific high-risk processes:** sous vide cooking below 75°C in sealed packages, raw or rare/undercooked meat or poultry preparation, ready-to-eat dishes using unpasteurised/raw egg, or off-site catering with potentially hazardous food. **A standard cafe doing coffee, sandwiches, toasties, and a display cabinet of pre-made salads or slices, with no raw-egg mayonnaise-style prep, no sous vide, and no off-site catering, does not need a full audited FSP.**
- Outside those specific processes, the obligation is lighter: keep **records substantiating food safety controls actually happening** (temperature logs, cleaning records) — this is the national Standard 3.2.2A "Tool 3" layer the pub pass already researched in depth (see pub pass §1.5), not re-derived here.
- A free **FoodSmart template** exists specifically for Class 2 retail/food-service businesses covering the common high-risk processes listed above — genuinely useful if a cafe's menu does include one of them (e.g. house-made mayonnaise with raw egg, or a rare-beef sandwich) — **this document did not verify the FoodSmart template's actual content in detail**, same caveat the pub pass flagged.

## 2.4 The proportionality finding this section exists to test

For a bar, food safety is a minor, often-exempt side concern (Class 3, no FSS, no FSP) sitting underneath a heavy alcohol-compliance load (RSA, patron capacity, crowd control, closing procedures). For a pub, food safety becomes a major, genuinely heavy obligation (Class 2, mandatory FSS, conditional FSP) **on top of** the bar's existing alcohol-compliance load. **For a cafe, the alcohol side very often disappears almost entirely (Section 1), while the food safety side lands at exactly the same Class 2/mandatory-FSS tier as a pub's kitchen** — meaning food safety is not just heavier in absolute terms, it can be functionally the *entire* regulatory compliance surface for a venue that serves no alcohol at all. This is a genuine, sourced structural difference, not a restatement of the pub pass's finding: the pub pass reached Class 2 through kitchen scale; a cafe reaches the identical class and identical FSS obligation through a much smaller operation (a counter, a display cabinet, a sandwich press), and does so while typically carrying none of the offsetting alcohol-compliance weight a pub or bar has to manage in parallel.

## 2.5 Registration vs notification — a genuinely lighter path exists, but a real cafe doesn't qualify for it

Converged from multiple council pages plus a direct fetch confirming the underlying state framework (Section 4.1 has full sourcing) — worth flagging here because it bears directly on the "is there a lighter compliance path" question: **Class 1, 2, and 3 premises must register with council (and pay a fee); only Class 4 premises can instead simply notify council, for free.** Since a cafe serving coffee and any unpackaged food is Class 2 (2.1), it sits in the register-and-pay tier, not the free-notify tier — the lighter path genuinely exists in Victorian law, but it is reserved for businesses selling only shelf-stable pre-packaged items (the classic milk-bar/newsagent case), not for anything a person would ordinarily call a cafe.

---

# 3. Equipment-specific hazards genuinely new to this venue type

## 3.1 Espresso machines — steam/burn risk

A specific, named WorkSafe Victoria resource appears to exist: **"Brewing coffee safely"** (dated February 2024, hosted at `content-v2.api.worksafe.vic.gov.au/sites/default/files/2024-02/kitchen-sink-coffee-safety-2024-02.pdf`, per its title as returned by search). **This document could not be read in this pass** — every direct WebFetch attempt returned either an HTTP 404 or, for a structurally similar WorkSafe PDF fetched as a control check, unparseable binary/compressed PDF stream data, the same technical failure mode both the bar and pub passes hit on their own PDF sources. This is the single weakest-sourced item in this document (Section 5, gap 1) and should be a priority for a direct human read, since it is the one document that would speak specifically to espresso machines rather than hospitality burns in general.

What **was** directly fetched and confirmed, from **[WorkSafe Victoria — Food and beverage production](https://www.worksafe.vic.gov.au/food-and-beverage-production)** and **[WorkSafe Victoria — Hospitality](https://www.worksafe.vic.gov.au/hospitality)** (both fetched directly, 7 Sep 2026):

- **Burns** are a named hazard category covering steam, splashing/spilling hot liquid, and contact with hot surfaces — general controls given are splatter guards around hot equipment, appropriate protective clothing for staff working near heat sources, and letting equipment cool before maintenance.
- **Operating espresso machines is separately named as an example of repetitive/manual-task work** (not primarily a burns example) on the Hospitality page, with recommended controls of job rotation, task variation, sit-stand stools, and anti-fatigue mats — a genuinely different framing (repetitive strain, not scalding) than what a plain-language reading of "espresso machine hazard" might assume, and worth getting right rather than assuming steam/burns is the only or primary risk WorkSafe itself foregrounds.
- **No cafe/espresso-specific numeric guidance (e.g. minimum PPE spec, required machine interlocks) was found** in the pages directly fetched — general hospitality burns and manual-task controls are what is confirmed to apply.

## 3.2 Descaling and cleaning chemicals

No cafe- or espresso-machine-specific WorkSafe guidance on descaling chemicals was found in this pass. What applies is WorkSafe Victoria's **general hazardous-substances guidance**, confirmed directly on the Food and beverage production page: review the safety data sheet (SDS) or product label before use, prefer a safer substance where one exists, design the work area to minimise contact, and provide appropriate PPE (gloves, and eye protection where splash risk exists). Descaling agents used in espresso machines are typically citric-acid-based or, in stronger commercial products, contain sulfamic, hydrochloric, or phosphoric acid — this specific chemistry point is **general industry knowledge, not sourced to a Victorian regulator**, and is included only as context for why the general hazardous-substances SDS/PPE guidance is the correct thing to point staff to, not a Victoria-specific descaling rule (none was found to exist).

## 3.3 Food prep equipment — slicers, mixers

Directly fetched from WorkSafe Victoria's Hospitality and Food and beverage production pages, plus two dedicated WorkSafe Victoria pages located and confirmed to exist by title: **[Safe use of metal cutting guillotines](https://www.worksafe.vic.gov.au/safe-use-metal-cutting-guillotines)** and **[Prevent injuries from bread-slicing machines](https://www.worksafe.vic.gov.au/prevent-injuries-bread-slicing-machines)** (these two were located via search index with confirmed titles on the worksafe.vic.gov.au domain; not independently re-fetched and read in full text in this pass — flagged as such). From the pages that were directly fetched and read:

- Powered slicers, mincers, and graters should have **fixed or interlocked guards** preventing access to blades while operating.
- **Pre-sliced, pre-peeled, or pre-cut food is a named risk-reduction control** — buying in pre-prepared ingredients reduces exposure to slicer/mincer use altogether.
- **Steel mesh gloves** are recommended PPE for tasks involving knives or cleaning sharp equipment.
- Equipment must be **de-energised (unplugged/isolated) before cleaning or maintenance**.
- **Young and new workers require specific training and supervision** around machinery and blades — named explicitly as a control on the Hospitality page.

## 3.4 Display cabinet / bain-marie temperature control — the genuinely new, well-sourced cafe topic

This is the strongest-sourced part of this document and the most operationally central hazard for a cafe's typical grab-and-go/counter-service model. Directly fetched from **DoFoodSafely** (`dofoodsafely.health.vic.gov.au`), a genuine Victorian Department of Health interactive food-safety training resource — both pages fetched directly and successfully parsed, 7 Sep 2026:

- **[Pie warmers and bain-maries](https://dofoodsafely.health.vic.gov.au/index.php/en/component/topics/section/reheating-food-safely):**
  - Preheat the unit before use, and set/maintain it at **60°C or hotter**.
  - **A bain-marie or pie warmer must never be used to reheat cold food** — it holds hot food hot, it does not safely bring cold food up to temperature ("it takes too long and harmful bacteria will grow quickly," in the source's own words).
  - Food must be rapidly reheated to at least 60°C using an oven, stove, or microwave **first**, then transferred into the bain-marie/pie warmer for holding and display.
  - Leftover reheated food should not be carried over — remove it at the end of trading.

- **[Rules for self-service foods](https://dofoodsafely.health.vic.gov.au/index.php/en/component/topics/?view=section&id=41):**
  - Displayed food must stay **under 5°C or above 60°C** — the same temperature-danger-zone boundary the pub pass already sourced nationally (Standard 3.2.2, cross-reference pub pass §1.5), now confirmed as directly applied to a self-service/display counter context.
  - Use a clean, sanitised thermometer at the centre of the food to check.
  - **Supervise the display while customers are accessing it**, remove any visibly contaminated food immediately, and **refresh with a completely fresh batch** (in a clean container) rather than topping up — self-service food is never reused.
  - Provide **separate serving utensils per food item**, positioned so utensil handles don't touch the food.
  - **Single-use items** (gloves, straws, paper towels, cups, plates) are discarded after one use, not reused.
  - The fetched page did not contain specific guidance on sneeze guards or display labelling requirements — **flagged as not found in this pass, not confirmed absent** (Section 5, gap 5).

This DoFoodSafely sourcing is directly relevant to the exact cafe scenario the task brief describes (grab-and-go, counter service, a display cabinet of pre-made items) and should be treated as close to ground-truth for that specific topic.

---

# 4. Victoria-specific cafe/food rules the bar and pub passes had no reason to touch

## 4.1 Registration vs notification — a real procedural fork the bar/pub passes never needed

Converged across multiple Victorian council pages describing the same state framework consistently (Casey, Corangamite, Whittlesea — search-index summaries, not a single primary page independently fetched and read in full for this specific point, though it is corroborated by the directly-fetched safefood.vic.gov.au classification page's own class definitions in Section 2.1):

- **Class 1, 2, and 3 food premises must register with their local council** (this carries an application fee, which varies by council).
- **Class 4 premises only need to notify council — and notification is free.**
- A cafe serving coffee and any unpackaged food (2.1) is Class 2, and therefore sits in the register-and-pay tier — this is not a new burden versus the pub pass's finding, but it is a genuinely new topic the bar pass (Class 3, and mostly focused on liquor licensing rather than food registration at all) had no occasion to mention.

## 4.2 FoodTrader (formerly Streatrader) — relevant only if the cafe ever trades as a market stall, pop-up, or van

Per multiple council pages and the `foodtrader.vic.gov.au` platform itself (via search index, not independently fetched and read in full in this pass): Victoria runs a single statewide online registration and notification tool, **FoodTrader** (the current name; **Streatrader** is the platform's former/legacy name, worth flagging by the same logic as the bar pass's VCGLR-to-LCV naming finding, since "Streatrader" still circulates informally). Temporary and mobile food businesses (vans, market stalls, pop-ups) must lodge a **"statement of trade"** through FoodTrader each time they trade, notifying the relevant council of where and when. **This is only relevant to a cafe if it also runs a market stall, food van, or pop-up presence** — a fixed-premises cafe registers once with its home council (4.1) and does not need FoodTrader for its everyday fixed-site trading.

## 4.3 The 2-hour/4-hour rule is the cafe's single most operationally central daily obligation

Already fully sourced nationally by the pub pass (§1.5) as Standard 3.2.2 (FSANZ) — not re-derived here, only re-emphasised because of how central it is to this specific venue type: a cafe's entire grab-and-go/counter/display-cabinet trading model exists inside the temperature-danger-zone rule (5°C–60°C, under 2 hours cumulative time out of control is fine, 2–4 hours must be used immediately and not returned to the fridge, over 4 hours must be discarded). Where a pub's kitchen touches this rule mainly around hot cooking and cooling curves, a cafe's display cabinet and bain-marie (Section 3.4) put this rule into practice continuously, all day, on food that is visibly on show to customers — making it the practical backbone of this venue type's food safety obligations in a way that is worth stating plainly rather than assuming it's obviously implied by the national standard already being on file.

---

# Gaps and weakest-sourced items — flagged honestly

1. **WorkSafe Victoria's "Brewing coffee safely" PDF (Feb 2024)** — a genuinely cafe/espresso-specific document appears to exist by title, located via search index at `content-v2.api.worksafe.vic.gov.au/sites/default/files/2024-02/kitchen-sink-coffee-safety-2024-02.pdf`, but could not be read in this pass: direct WebFetch returned HTTP 404, and a structurally similar WorkSafe PDF fetched as a control check returned unparseable binary/compressed stream data — the same PDF-parsing failure mode both the bar pass (patron capacity PDF) and pub pass (advertising guidelines PDF) hit. **Highest-priority item to re-verify with a direct human read**, since it's the one source that would confirm or correct this document's Section 3.1 (which currently rests on general hospitality-wide WorkSafe pages, not an espresso-specific document).
2. **Two named WorkSafe Victoria pages on slicer/guillotine safety** (Section 3.3) were located and confirmed to exist by title via search index but not independently re-fetched and read in full text in this pass — the summarised content in 3.3 comes from the general Hospitality/Food and beverage production pages that were directly fetched, corroborated by these titles rather than a direct read of the dedicated pages themselves.
3. **FSS certificate 5-year validity and the 8 December 2023/2028 transition dates** (Section 2.2) — the safefood.vic.gov.au FSS page itself, as fetched, did not state a validity period; this figure rests on three converged training-provider secondary sources describing the same rule consistently, not an independent primary-page confirmation. Worth a targeted follow-up fetch of whatever primary page actually carries this figure (likely a Victorian Government Gazette notice or a specific safefood.vic.gov.au sub-page not located in this pass).
4. **Section 113(1B) of the Liquor Control Reform Act 1998 (Vic)** — cited in Section 1.2 as the offence provision for an unlicensed cafe permitting BYO without a permit, sourced via search-index summary, not a direct austlii fetch (the same HTTP 403 pattern the bar pass hit on every direct LCRA section attempt). This is the highest-compliance-weight unverified citation in this document, since it underpins the "zero licence + zero permit genuinely cannot allow BYO" finding in Section 1.4 — recommend direct verification before this becomes chatbot-source content.
5. **DoFoodSafely's self-service food page did not mention sneeze guards or display labelling requirements** (Section 3.4) — reported as not found in this pass, not confirmed as genuinely absent from Victorian requirements; a separate targeted search specifically for sneeze-guard/display-shielding requirements was not run and would be a reasonable next step.
6. **The registration-vs-notification fee amounts** (Section 4.1, 4.2) — the register/notify structural split itself is corroborated across multiple council pages describing the same state law, but this document did not independently verify actual fee figures (these vary by council in any case, so a single Victoria-wide number would not exist to cite even with better sourcing).
7. **FoodSmart template content** (Section 2.3) — the template's existence and target audience (Class 2 retail/food-service businesses, high-risk processes) is confirmed, but its actual content was not reviewed in this pass, same caveat the pub pass flagged for the same template.
8. **Whether an "advanced RSA" style escalation could ever apply to a cafe holding a Restaurant and Cafe licence** — this is the bar pass's own still-unresolved "what makes RSA advanced" gap; this pass did not find any cafe-specific variant of it, and it is very unlikely to be relevant to a venue trading under a 1am-cutoff licence with no late-night variation, but this document does not assert that with full certainty.

---

*Compiled 7 Sep 2026 per Build Manual Block P1 (cafe pass). Research only — no module or SOP text has been authored against this. This document is intended, alongside the bar and pub passes, as a ground-truth baseline for checking a chatbot's answers against, per the task brief — review with John before it is used that way, given the sourcing caveats above (items 1, 3, and 4 in particular, since items 1 and 4 touch this document's two most safety/compliance-critical and least-verified specific claims).*
