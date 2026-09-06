# P1 Research — Victoria Pub-Specific DELTA Coverage (DRAFT, for review)

**Status: RESEARCH ONLY — nothing here is final copy or module text.** Produced per Build Manual Block P1 (pub pass), 7 Sep 2026. Sourcing discipline matches the bar pass and B5: real, cited, current, primary sources wherever possible; anything relying on a search-index summary rather than a verified direct fetch is labelled as such; genuine gaps are flagged honestly rather than filled with plausible-sounding guesses.

**This is a DELTA document.** It assumes [`p1-research-victoria-bar-coverage.md`](../block-p/p1-research-victoria-bar-coverage.md) (the bar pass, compiled 6 Sep 2026) as baseline and does not repeat what it already covers: liquor licence categories generally, RSA mechanics (ID checking, age, refusal obligations, the legal definition of intoxication, penalties), patron capacity as a licence condition, crowd-controller licensing/ratios under the Private Security Act 2004, closing procedures, general cash handling, and basic security/barring-order mechanics. Where this document needs to reference one of those, it links back rather than re-deriving it. Regulator naming follows the bar pass's finding: the current operating name is **Liquor Control Victoria (LCV)**, supported by the **Victorian Liquor Commission**; VCGLR is the legacy name (see bar pass, top of document, for the full explanation).

**Scope.** Victoria (Australia) only, same standing rule as every prior pass in this series.

---

# 1. Fuller food menu / full kitchen operation

## 1.1 The core delta from the bar pass

The bar pass's venue ran cold snacks only and was Class 3 under Victoria's food business classification — no Food Safety Supervisor (FSS) and no Food Safety Program (FSP) required. A pub running a real kitchen (raw meat, poultry, seafood, hot food prep, multiple potentially-hazardous-food processes) sits at a materially higher risk tier, and that tier change is the single biggest food-safety difference between the two venue types.

## 1.2 Victoria's food business classification system

Under the **Food Act 1984 (Vic), s19C**, the Secretary declares food premises into **Class 1, Class 2, Class 3, Class 3A, and Class 4**, based on food-safety risk. In summary, corroborated across multiple local-council pages that describe the same state framework (Bass Coast Shire, Geelong, Latrobe City — via search-index summaries, not a single directly-fetched government page in this pass, see 1.6 below):

- **Class 1** — premises serving vulnerable populations specifically (hospitals, aged care, childcare, Meals-on-Wheels-style home delivery to people who can't prepare their own food). Highest risk tier, regardless of the food itself.
- **Class 2** — premises that handle potentially hazardous food (raw meat, poultry, seafood, dairy, cooked rice, etc.) as part of normal operation. **A standard pub kitchen doing a la carte cooking from raw ingredients falls here** — this is the class that actually changes for a pub versus the bar pass's Class 3 cold-snacks venue.
- **Class 3** — predominantly low-risk food or pre-packaged potentially-hazardous food (this was the bar pass's classification).
- **Class 3A** — a specific intermediate tier (referenced in the FSS trigger rule below; the precise defining criterion for 3A specifically was not independently pinned down in this pass — flagged as a gap).
- **Class 4** — lowest risk (e.g. packaged/shelf-stable goods only).

Source: converged search-index summaries of Bass Coast Shire, Geelong, and Latrobe City council pages, all describing the same statutory Victorian classification system. **Caveat:** the direct government pages that should carry this most authoritatively — `health.vic.gov.au/food-safety/food-business-classifications` and the equivalent `safefood.vic.gov.au` page — returned HTTP 404 or a redirect-then-404 on every direct-fetch attempt in this pass, suggesting the Victorian Department of Health has recently restructured this part of its site (food safety regulatory content appears to be migrating from `health.vic.gov.au` to the newer `safefood.vic.gov.au` domain, and the migration is incomplete or the URL structure changed). This is a genuine sourcing weak point — see Section 5.

## 1.3 When a Food Safety Supervisor becomes mandatory

Under **s19C/s19G of the Food Act 1984**, **Class 1, most of Class 2, and Class 3A** food premises must nominate a Food Safety Supervisor. Class 2 community groups (trading no more than two consecutive days, predominantly volunteer-staffed) are exempted; **Class 3 and Class 4 are not required to have an FSS at all** — this is exactly the exemption the bar pass's venue relied on, and exactly the line a pub's real kitchen crosses.

- The FSS must hold a **Statement of Attainment issued by a Registered Training Organisation (RTO)**, covering minimum competencies for their specific food sector.
- The certificate is valid for **5 years** from issue and must be renewed by that point — this is a relatively recent change (certificates previously did not expire under the older Victorian rule).
- Class 3 and Class 4 businesses don't need a nominated FSS, but staff must still have adequate skills/knowledge to handle food safely — a lower, non-certified bar.

Source: converged search-index summaries citing s19C/s19G of the Food Act 1984 directly (via austlii.edu.au section listings — the sections were found and named, e.g. "FOOD ACT 1984 - SECT 19G Food safety supervisors" — but the full statutory text of 19G was not independently fetched and read in this pass), corroborated by multiple secondary sources (Sprintlaw, foodsafety.com.au, melbtech.edu.au training-provider pages) all stating the same Class 1/2/3A threshold and 5-year validity figure consistently. **This is a converged-secondary-source finding, not a single directly-fetched primary read** — flagged accordingly.

## 1.4 Food Safety Program (FSP) obligations — the HACCP-adjacent layer

This is materially different from the bar pass, which never needed to touch FSPs:

- **Class 1 businesses and Class 2 manufacturers** must lodge an **independent, externally-audited Food Safety Program** with their council, written to cover all of the business's food processes — assessed by a registered food safety auditor.
- **Class 2 non-manufacturers** (the category a pub kitchen doing on-site cooking from raw ingredients would typically sit in) are **not required to have a full audited FSP** unless doing specific higher-risk processes: sous vide cooking (below 75°C in sealed packages), raw-egg preparations, rare/minced-meat dishes served undercooked, or off-site catering. Outside those specific processes, **Standard 3.2.2A instead requires the business to keep evidence/records substantiating its food safety controls** (see 1.5) rather than a full external FSP.
- A free **"FoodSmart" template** exists specifically for Class 2 retail/food-service businesses covering common high-risk processes — a genuinely useful practical note for a real venue, though this document does not verify the FoodSmart template's current content in detail.
- **Class 3 businesses** (like the bar pass's venue) are only recommended, not required, to keep temperature records, plus a basic traceability/recall protocol.

Source: converged search-index summaries of Geelong, Latrobe City, and Golden Plains Shire council food-safety pages, all describing the same state framework consistently (not independently verified against a single primary state-government page — same 404/migration issue noted in 1.2).

## 1.5 Standard 3.2.2A — the national food safety management tools layer

**Standard 3.2.2A (Food Safety Management Tools)** is a Food Standards Australia New Zealand (FSANZ) national standard that sits alongside — and can create genuine confusion against — Victoria's own class system. It defines three tools: (1) Food Safety Supervisor, (2) food handler training, and (3) substantiation of critical food safety controls (record-keeping proving temperature control, cleaning, etc. actually happen).

- Victoria implements this via its own class labels (1, 2, 3A, 3, 4) rather than the national standard's own category numbers — and a business can genuinely be "Category One" under the national standard while being "Class Three" under Victoria's own state law, which is a real, sourced point of confusion, not a simplification error on this document's part.
- **Class 1 and Class 2 businesses with an existing Food Safety Program are exempted from Tool 3 specifically** (substantiation of critical controls) — because an audited FSP already requires equivalent record-keeping, so Standard 3.2.2A doesn't double up.
- **This is the standard that ties directly to a full kitchen's day-to-day temperature control practice** — the nationally-applicable **2-hour/4-hour rule** governs any potentially hazardous food taken out of temperature control (5°C–60°C is the "temperature danger zone"): under 2 hours cumulative time out of control, the food can be refrigerated or used immediately; 2–4 hours, it must be used immediately and not returned to the fridge; over 4 hours cumulative, it must be discarded. The standard cooling curve is 60°C→21°C within 2 hours, then 21°C→5°C within a further 4 hours. This rule is legally required under the **Food Standards Code (FSANZ) Standard 3.2.2** nationally, and applies identically in Victoria — it isn't Victoria-specific, but it is squarely the kind of obligation a pub's real kitchen has to operationalise daily that the bar pass's cold-snacks venue never had to.

Source: [foodsafety.org.au — How does Standard 3.2.2A work in my state or territory?](https://www.foodsafety.org.au/info/how-does-food-safety-standard-3.2.2a-work-in-my-state-or-territory) (fetched directly, 7 Sep 2026) for the Victoria-vs-national-category confusion point; the 2-hour/4-hour rule content is a converged, multiply-corroborated search-index summary (melbtech.edu.au, cft.edu.au, multiple NSW council fact sheets) describing the same national FSANZ rule — not itself a Victoria-specific document, cited here because the rule is genuinely national and the bar research's own house style (per its intro) says to state explicitly when something is national rather than Victoria-only.

## 1.6 What this section could not pin down directly

The most authoritative primary sources for 1.2–1.4 — `health.vic.gov.au`'s food safety pages — appear to be mid-migration: `health.vic.gov.au/food-safety/food-safety-supervisors` returned a 301 redirect to `safefood.vic.gov.au` (the site root, not a working equivalent page), and `health.vic.gov.au/food-safety/food-business-classifications` returned a bare 404. Every specific number and threshold in Sections 1.2–1.4 is corroborated across at least two or three independent secondary sources (local council pages, training-provider pages) describing the same underlying state law consistently, which gives reasonable confidence in the substance — but none of it was verified against a single, current, directly-fetched Victorian government page in this pass. **Recommend a follow-up pass once the health.vic.gov.au / safefood.vic.gov.au migration settles**, to re-confirm Sections 1.2–1.4 against a live primary page before this becomes chatbot-source content.

---

# 2. Heavier and more varied alcohol service — what actually scales with volume

## 2.1 What does NOT scale, per this pass's research

This section's honest headline finding is a **negative**: **no distinct, named Victorian regulatory rule was found that scales RSA or service obligations specifically with the volume or variety of alcohol served** (e.g. there is no "high-volume venue" RSA tier, no extra staff-to-volume ratio, no separate keg/tap-count trigger). RSA obligations (Section 3 of the bar pass) apply identically to a bartender pulling four taps and a bartender pulling fourteen. What actually scales with a pub's larger, more varied operation are things already partly covered in the bar pass, extended here:

## 2.2 What DOES scale — patron capacity and the licence risk model

- The bar pass already established (§1.5) that **application fees scale with declared patron capacity**. A pub, being typically larger-format than a narrow bar, sits in a higher capacity/fee tier as a direct consequence of size, not of alcohol variety per se.
- Separately, **Liquor Control Victoria (as VCGLR, pre-2022 rebrand) expanded its licensing risk-assessment model from two factors to five**: trading hours, patron capacity, licence category, venue compliance history, and venue "suitability." Four of these five factors are drawn from independent data sources rather than self-reported by the applicant. These risk factors are explicitly designed to track real community harms (risky drinking, minors accessing alcohol, antisocial behaviour, amenity impact) — a pub with a broader, higher-volume trading pattern will generally sit at a higher point on this composite risk score than a narrow cocktail bar, which in practice can mean more scrutiny (inspection targeting) and a higher compliance-history risk fee if things go wrong, but this is a composite regulatory posture, not a single numeric "more alcohol = more RSA" rule. Source: [Victorian Auditor-General's Office — Follow up of Regulating Gambling and Liquor](https://www.audit.vic.gov.au/report/follow-regulating-gambling-and-liquor) (fetched directly, 7 Sep 2026) — this is an audit office report describing VCGLR's own methodology, not VCGLR's own primary published model document, which was not separately located in this pass.
- **Late-night advanced RSA** (already sourced in the bar pass, §1.4) remains the one genuinely mandatory *training* escalation tied to trading pattern — a pub trading later or with a late-night licence variation would trigger it exactly as a bar would; this isn't a new pub-specific finding, just confirmation that it applies identically.

## 2.3 Bottle shop / packaged liquor — a genuinely separate licence, not an extension of the General licence

A pub with an attached bottle shop needs to check licence scope carefully:

- The bar pass already noted (§1.1) that a **General licence** covers on-premises consumption *and* some takeaway sales — this is the correct licence for a standard pub's own limited bottle-o-style takeaway sales of beer/wine/spirits sold alongside on-premises trade.
- A **dedicated retail bottle shop operation** (its own trading identity, potentially separate trading hours, larger-scale packaged sales) requires its own **Packaged Liquor Licence** — this is legally distinct from the General licence's takeaway allowance, not just a bigger version of it. Source: [vic.gov.au — Packaged liquor licence](https://www.vic.gov.au/apply-packaged-liquor-licence) (via search-index summary — not independently direct-fetched and read in full in this pass) and [ablis.business.gov.au — Packaged Liquor Licence, Victoria](https://ablis.business.gov.au/service/vic/packaged-liquor-licence/24005).
- Practical implication for a pub operator: if the pub's bottle shop is genuinely a separate retail operation (own storefront, own till, sold as a going concern in its own right) rather than incidental takeaway sales under the General licence's own allowance, it likely needs its own licence application, its own RSA-holding staff rostered specifically to it, and its own compliance obligations layered on top of the pub's General licence — this is a real operational distinction a pub owner needs to get right, not a bar-relevant question at all.

## 2.4 What this section could not pin down directly

No genuine Victorian "scaling" rule for RSA/service obligations by volume/variety was found — Section 2.1 states that as a real finding, not a gap, but it's worth being explicit: this document did not simply fail to find such a rule, it looked specifically and the absence appears genuine, corroborated by the general licensee-obligations page (`vic.gov.au/liquor-licensee-obligations`, fetched directly) not mentioning any such tier either.

---

# 3. Happy hour pricing and timing rules

## 3.1 The headline finding: Victoria has no named "happy hour law" — it regulates via a general irresponsible-promotion prohibition

This is a genuinely new topic versus the bar pass, and the most important thing to get right here is **not inventing a specific numeric rule that doesn't exist**. Directly fetched from [vic.gov.au — Responsible alcohol advertising and promotions](https://www.vic.gov.au/responsible-alcohol-advertising-and-promotions) (fetched directly, 7 Sep 2026):

- Advertising/promotions must not **"promote excessive or irresponsible drinking," "encourage or make it easier for minors to access alcohol,"** or **"display offensive language or imagery."**
- The **Victorian Liquor Commission can prohibit** promotions that: appeal to minors, encourage rapid or unsafe drinking, encourage or condone violence or anti-social behaviour, or are sexually explicit/degrading/sexist.
- Rather than publishing a bright-line numeric rule, the page works by **named case examples of promotions that were actually banned**, e.g. *"2 for 1 Cocktails, All Day Sunday"* (Asian Beer Cafe, 2015) and *"2 for 1, all drinks, all day"* on various days (The Hawthorn, 2014) — both **all-day, unlimited-repeat discount promotions**, which is the pattern the Commission has actually acted against, rather than a time-boxed "happy hour" as commonly understood.
- Static advertising (billboards, banners, A-frame signs) is prohibited within **150 metres of schools** — venue-based signage itself is exempt from this specific rule.
- Enforcement: the Commission can ban the advertising/promotion outright, or **vary, suspend, or cancel the liquor licence** for non-compliance.

## 3.2 A supporting primary-adjacent document exists but could not be read in full

Liquor Control Victoria (as its predecessor VCGLR) has published a document titled **"Responsible Liquor Advertising and Promotion Guidelines"** — this is the real, named regulator guideline document referenced by the vic.gov.au page above, hosted at [liqcon.com.au/uploads/223/118/Responsible_liquor_advertising_and_promotion_guidelines.pdf](https://www.liqcon.com.au/uploads/223/118/Responsible_liquor_advertising_and_promotion_guidelines.pdf) (same hosting pattern as the breaches fact sheet the bar pass verified was genuine government content mirrored on a private training provider's site). **This PDF could not be parsed as readable text in this pass** — both a direct WebFetch and a locally-saved copy returned only compressed/binary PDF stream data, the same technical failure mode the bar pass hit on the maximum-patron-capacity PDF. This means the guideline document's own detailed principles, risk-assessment framework, and any worked examples beyond the two named cases above were not independently read — **this is the weakest-sourced point in this whole delta document** and should be a priority for a direct human read before any pub-specific happy-hour guidance is authored into a module or the chatbot's knowledge base.

## 3.3 An important negative finding: do not import other states' numeric happy-hour rules into Victoria

Initial searching surfaced confident-sounding numeric claims — "happy hours are unacceptable if they run more than 60 minutes, occur more than twice per day, or run after 7pm," and a "no more than 50% off" discount cap — attributed in low-quality secondary summaries to Victoria. **On closer verification, tracing these claims back, the specific 50%-discount-cap and 2-hour-duration-limit figures are stated by New South Wales's liquor promotion guidelines** (confirmed via a direct fetch of the source article, which explicitly and exclusively discusses "NSW (New South Wales) regulations" and "NSW laws and rules" despite initially surfacing in a Victoria-focused search) **— not Victoria's**. No Victoria-specific numeric duration, frequency, or discount-percentage threshold was found anywhere in this pass, from any source that could be confirmed as actually describing Victoria rather than NSW, Tasmania, or another jurisdiction. **This is exactly the kind of cross-jurisdiction contamination the task brief warned against, and it is flagged here explicitly rather than silently carried through.** If a specific Victorian numeric happy-hour rule genuinely exists, it was not found in this pass and would need to come from a direct read of the PDF in 3.2 or a direct enquiry to Liquor Control Victoria (1300 182 457).

## 3.4 Practical implication for a pub, honestly stated

A pub running a genuine happy hour should treat it as a **case-by-case irresponsible-promotion risk assessment** against the principles in 3.1, not as compliance against a specific numeric rule, because no such rule was confirmed to exist in Victoria in this pass. The clearest red flags from the two real, named enforcement examples above are: **unlimited repetition across an entire trading day**, and **"2 for 1" / buy-one-get-one style structures that function as an incentive to drink more, faster** — a genuinely time-boxed, modestly-discounted happy hour (e.g. a defined window, a flat percentage or dollar reduction rather than a 2-for-1 structure) sits further from the pattern the Commission has actually acted against, but this document cannot and does not assert a specific "safe" number.

---

# 4. Keg management at real volume

## 4.1 Beer line cleaning — no Victorian/Australian legislated frequency exists

Searched specifically for this because the bar pass never needed it (a 4–6 line bar has a materially different maintenance burden than a 10+ tap pub). Finding: **there is no specific Australian or Victorian legislated cleaning-frequency requirement for beer dispense lines.** The only applicable regulatory hook is the general **Food Standards Code (FSANZ)** requirement that food-contact equipment be kept clean and sanitised as necessary to prevent contamination — this is a general obligation, not a numeric schedule. The **"every 2 weeks, weekly for high-volume venues"** figures that circulate are industry practice/manufacturer recommendation (cited by commercial cleaning and line-cleaning service providers), not a legislated Victorian standard. A pub with 10+ taps and materially higher throughput than a bar's narrow list should treat more frequent cleaning as risk management and product-quality practice, not as a specific compliance deadline this document can cite to a regulator. Source: converged search-index summary across multiple Australian cleaning-service and brewing-industry pages, explicitly including one that states the point directly — "Australian food safety regulations... don't specify an exact frequency requirement" — none of these are primary regulator documents, all are industry/service-provider commentary; no primary source contradicts or confirms a specific number.

## 4.2 Cellar and gas cylinder safety — a genuinely new hazard category the bar pass didn't need

This is the strongest-sourced part of this whole document, and the most safety-critical genuinely new topic. Directly fetched and read in full from **[WorkSafe Victoria — Cellar and cool rooms: Beverage gas safety](https://www.worksafe.vic.gov.au/cellar-and-cool-rooms-beverage-gas-safety)** (fetched directly, 7 Sep 2026):

- **The hazard:** CO2 and nitrogen, used to carbonate and dispense beer and soft drink, are **odourless, colourless asphyxiant gases**. In an enclosed, poorly-ventilated cellar or cool room, a leaking cylinder or line can displace breathable oxygen; a person entering can be **overcome without warning and suffocate within minutes**. WorkSafe Victoria's own page states plainly that **hotel staff have died in Victorian cellars** from exactly this cause — this is not a hypothetical hazard for a real pub-format venue with a proper cellar, in a way the bar pass's smaller-format setup may never have needed to document at this level of severity.
- **Required/recommended controls, directly from the source:**
  - Install **gas monitoring and alarm systems** matched to the specific gas supply in use — CO2 monitor for CO2-only systems, O2 monitor for nitrogen systems, both for premixed or mixing systems (WorkSafe gives this as an explicit table). Alarms must be **audible and visible both inside the cellar/cool room and at entry points**.
  - **Weekly leak tests** of cylinders and lines using bubble solution.
  - **6-monthly and 12-monthly maintenance inspections** of the monitoring system and dispensing equipment.
  - **New O-rings/sealing washers fitted, and connections leak-tested, at every cylinder change.**
  - Warning/emergency-response signage at cellar entry points; **restrict routine access to trained personnel only**.
  - Keep minimal gas stock on hand; store cylinders **upright and secured with chains**.
  - Adequate lighting; slip/trip hazards removed.
  - Staff must be trained in what to do if an alarm activates, **including a protocol that prevents a second person entering to "rescue" a collapsed colleague without breathing apparatus** (a well-known, tragic failure mode in confined-space asphyxiation incidents generally, and implicit in WorkSafe's access-restriction and alarm-response framing here, though this document is inferring that specific rescue-protocol emphasis from the general guidance rather than quoting it verbatim — flagged as a light synthesis, not a direct quote).
  - **AS 5034-2005** (Installation and use of inert gases for beverage dispensing) is the referenced Australian Standard governing ventilation adequacy for these systems.

This is a directly-fetched, full primary-source read — the strongest sourcing in this entire document — and should be treated as close to ground-truth for any pub module or chatbot content on cellar/gas safety.

## 4.3 Manual handling of kegs at higher throughput

Also directly fetched from WorkSafe Victoria: **[Injury hotspots — Hospitality: Waiters and bar attendants](https://www.worksafe.vic.gov.au/injury-hotspots-hospitality-waiters-and-bar-attendants)** and **[Hospitality | WorkSafe Victoria](https://www.worksafe.vic.gov.au/hospitality)** (both fetched directly, 7 Sep 2026):

- Injury distribution for this worker category: **hands/fingers 22%, back 16%, forearm/wrist 10%, shoulder 10%, knee 8%, leg 6%, foot/toes 5%, psychological 8%** — back injury is the single largest musculoskeletal category, consistent with a keg-handling risk profile.
- WorkSafe Victoria's own recommended controls: **"mechanical aids and equipment (eg trolleys, height adjustable keg lifting devices, trolleys to move kegs)"** for heavy stock; training staff in **safe lifting technique (work between shoulder and mid-thigh height)**; **job rotation** to avoid repetitive strain; ordering stock in smaller, easier-to-lift containers where practical.
- **Cellar access specifically:** WorkSafe recommends using **an appropriate ladder when accessing cellars, maintaining three points of contact at all times** — a distinct physical-access hazard a pub's below-grade or stepped cellar is more likely to actually have than a bar's simpler storage.
- **Cool room hazards** (adjacent to cellar work): two-way door catches and an alarm to prevent staff becoming trapped inside, plus (again) systems to control CO2 exposure — this cross-references 4.2 directly, since a beverage cool room and a gas-dispensing cellar are often the same or adjacent physical space in a pub-scale venue.

## 4.4 The commonly-cited "62kg keg" figure — corroborated but not sourced to WorkSafe Victoria specifically

A widely-repeated industry figure states that a full 50-litre keg weighs approximately **62kg**, and that lifting/carrying/lowering it manually (alone or in a two-person lift) is high-risk due to weight and awkward posture. This figure and framing recur consistently across WorkSafe Western Australia, Ontario (Canada), and US brewing-industry sources — but **this specific number was not found stated on a WorkSafe Victoria page directly fetched in this pass**. Treat the 62kg figure as a genuine, physically-accurate, and industry-standard fact (keg weights are a fixed physical property, not a jurisdiction-specific regulatory number), but do not attribute it to WorkSafe Victoria specifically as a quoted source — attribute the *control measures* (4.3) to WorkSafe Victoria, and the *keg weight fact* to general industry sourcing.

---

# Gaps and weakest-sourced items — flagged honestly

1. **Victoria's food business classification pages on health.vic.gov.au / safefood.vic.gov.au appear to be mid-migration.** Every direct-fetch attempt at the primary government pages for food business classes (1, 2, 3A, 3, 4), FSS thresholds, and FSP requirements returned either a 301-to-unhelpful-page or a bare 404. Sections 1.2–1.4 rest on converged secondary sources (multiple local council pages describing the same state law) rather than a single primary read. **Highest-priority item to re-verify** once the site migration settles, given how central the FSS/FSP threshold is to this whole section's argument.
2. **The Responsible Liquor Advertising and Promotion Guidelines PDF (Section 3.2)** — the actual named regulator guideline document exists and was located, but could not be parsed as readable text (same binary/compressed-stream failure mode the bar pass hit on its patron-capacity PDF). This document's own detailed risk-assessment principles beyond the two named case examples were not independently read. Second-highest-priority item to re-verify with a direct human read, since happy-hour guidance is genuinely new ground for this project and easy to get wrong.
3. **No Victoria-specific numeric happy-hour rule was found** (duration, frequency, time-of-day cutoff, or discount percentage cap). This is reported as a likely-genuine gap (Victoria appears to regulate via general "irresponsible promotion" prohibition plus case-by-case enforcement, not a named bright-line rule), but it rests on the absence of evidence in this pass rather than a definitive government statement that no such rule exists — a direct call to Liquor Control Victoria (1300 182 457) would close this out properly.
4. **Cross-jurisdiction contamination risk, explicitly caught and corrected in this pass (Section 3.3):** initial search results attributed NSW-specific numeric happy-hour figures (50% discount cap, 2-hour duration limit) to Victoria. Verified against source and corrected. Flagging this prominently because it demonstrates the exact failure mode the task brief warned against, and because a future pass (or a chatbot drawing on lower-quality secondary sources) could make the same mistake without the verification step taken here.
5. **Beer line cleaning has no legislated frequency in Australia** — confirmed as a genuine absence, not a gap in this research, but flagged so nobody later assumes a "2-week rule" is a compliance requirement rather than an industry norm.
6. **The Food Act 1984 s19C/s19G primary statutory text** was not independently fetched and read (same austlii access pattern seen in the bar pass) — the Class 1/2/3A FSS-trigger rule and 5-year certificate validity rest on converged secondary sources, not a primary legislative read.
7. **The "62kg keg" figure and the two-person-lift risk framing (Section 4.4)** are well-corroborated industry facts but not confirmed as appearing on a WorkSafe Victoria page directly — the control measures in 4.3 are properly Victoria-sourced, the specific weight figure is not.
8. **Whether a pub's "advanced RSA" obligation (already flagged as a gap in the bar pass) changes at all with a fuller/more varied drink menu** — not resolved in this pass either; Section 2 concludes no such scaling exists, but this is a repeat of the bar pass's own unresolved "what makes RSA 'advanced'" gap, now also confirmed not to vary by venue type.

---

*Compiled 7 Sep 2026 per Build Manual Block P1 (pub pass). Research only — no module or SOP text has been authored against this. This document is intended, alongside the bar pass, as a ground-truth baseline for checking a chatbot's answers against, per the task brief — review with John before it is used that way, given the sourcing caveats above (items 1, 2, and 3 in particular, since they touch the two genuinely new regulatory areas — full-kitchen food safety and happy-hour promotions — where this project has no prior research to fall back on).*
