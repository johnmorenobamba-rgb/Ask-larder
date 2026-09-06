# P1 Research — Victoria Bar-Specific Coverage (DRAFT, for review)

**Status: RESEARCH ONLY — nothing here is final copy or module text.** Produced per Build Manual Block P1 (added 6 Sep 2026). Sourcing discipline matches B5: real, cited, current, primary sources wherever possible; anything relying on a search-index summary rather than a verified direct fetch is labelled as such; genuine gaps are flagged honestly rather than filled with plausible-sounding guesses.

**Scope.** Victoria (Australia) only. Where a rule is genuinely national, that is stated explicitly with the source that makes it national — otherwise assume Victoria-only and confirm per venue's actual state before reuse elsewhere (same standing rule as B5 and this project's Sources & References doc).

**Relationship to B5.** B5 (`Larder HQ / Sources of Truth / B5 Research`) covers the general hospitality SOP baseline and Business Continuity — food safety, WHS hazard categories, utility outages, security incidents (break-in/robbery, generic), severe weather, and reopening after closure. B5 touches alcohol service only once, in passing (§1.3): RSA is required and is state-administered, with no Victoria-specific detail researched. This document does not repeat B5's food-safety, WHS, or generic-continuity content — it adds the bar-specific layer B5 explicitly did not cover: liquor licensing, patron capacity/crowd control, RSA mechanics, closing procedures, cash handling, and crowd-controller/security licensing. Where a topic overlaps with B5's generic security-incident content (§3.7 of B5), this document extends it with the alcohol/crowd-specific pieces (barring orders, liquor accords) rather than re-deriving the 000/evidence-preservation basics B5 already sourced.

**A note on the regulator's name, since the task brief names it as VCGLR.** The Victorian Commission for Gambling and Liquor Regulation (VCGLR) was split from 1 July 2022: gambling/casino regulation went to the Victorian Gambling and Casino Control Commission (VGCCC), and liquor regulation went to the **Victorian Liquor Commission** (the decision-making/disciplinary body) supported by **Liquor Control Victoria (LCV)**, the operational regulator brand (renamed from an interim VGCCC liquor arm on 31 January 2023). In current practice, "Liquor Control Victoria" or "LCV" is the name used on vic.gov.au and on official documents (e.g. the current breaches/penalties fact sheet is titled "Liquor Control Victoria"). VCGLR is the correct historical name and still appears as the issuer on some older documents and cached pages, but it is not the current operating name. Source: [vic.gov.au — About Liquor Control Victoria](https://www.vic.gov.au/about-liquor-control-victoria) (fetched directly, 6 Sep 2026); corroborated by [Drinks Trade — Victoria's liquor & gaming regulator changes its name](https://www.drinkstrade.com.au/news/victorias-liquor-gaming-regulator-changes-its-name/) and [CFT — VGCCC rebranded to LCV, Jan 2023](https://cft.edu.au/vgccc-rebranded-to-lcv/) (both via search index, not directly fetched). **Flagging this explicitly as a conflict with the task brief's own framing**, per this project's standing instruction to flag rather than silently pick a side — for any content going into modules or the chatbot knowledge base, "Liquor Control Victoria (LCV)" / "the Victorian Liquor Commission" should be the primary name used, with VCGLR mentioned only as historical/legacy context. The underlying Act is unaffected: it is still the **Liquor Control Reform Act 1998 (Vic)**.

---

# 1. Liquor licensing specifics for a bar in Victoria

## 1.1 Licence categories relevant to a bar

Under the Liquor Control Reform Act 1998 (Vic), the licence categories most relevant to a standalone bar are:

- **General licence** — sells alcohol for on-site consumption and takeaway; suits pubs, hotels, wine bars. Source: [vic.gov.au — General liquor licence](https://www.vic.gov.au/apply-general-liquor-licence) (fetched directly, 6 Sep 2026).
- **On-premises licence** — sells alcohol for consumption at the venue only (no takeaway); suits bars, restaurants, function centres. Source: [LIQUOR CONTROL REFORM ACT 1998 — SECT 9 On-premises licence](https://classic.austlii.edu.au/au/legis/vic/consol_act/lcra1998266/s9.html) (via search index only — direct WebFetch returned HTTP 403 on this austlii page in this pass; the section number and title are corroborated by [vic.gov.au's own on-premises licence guide](https://www.vic.gov.au/sites/default/files/2023-01/On-premises-and-late-night-(on-premises)-Self-paced-guide.pdf), not independently verified against the raw legislative text — flag for a direct human read before this becomes module content).
- **Restaurant and cafe licence** (s9A) — alcohol only with or ancillary to a meal; not the typical bar category, included for contrast only. Table/chair condition: tables and chairs must be available for at least 75% of patrons at any one time. Source: same austlii caveat as above (search index, not directly fetched).
- **Late night (general)** and **Late night (on-premises)** licences — required if a bar wants to keep supplying alcohol after 1am. Source: [vic.gov.au — Late night liquor licences](https://www.vic.gov.au/late-night-liquor-licences) (fetched directly, 6 Sep 2026).
- **Packaged liquor licence** — takeaway/bottle-shop sales; not relevant to a bar's on-site service model, noted for completeness only.

## 1.2 Trading hours

Confirmed directly from vic.gov.au (fetched 6 Sep 2026), for a **general licence**:

| | Mon–Sat (excl. ANZAC Day/Good Friday) | Sunday | ANZAC Day & Good Friday |
|---|---|---|---|
| On-premises consumption | 7am–1am | 10am–1am | 12pm–1am |
| Takeaway | 7am–11pm | 10am–11pm | 12pm–11pm |

Beyond 1am requires a **late night (general)** or **late night (on-premises)** licence — these must specify the actual hours applied for and approved by the Commission; there is no single "standard" late-night trading window, it is set per licence. Source: [vic.gov.au — General liquor licence](https://www.vic.gov.au/apply-general-liquor-licence) and [vic.gov.au — Late night liquor licences](https://www.vic.gov.au/late-night-liquor-licences) (both fetched directly, 6 Sep 2026).

**Grace period after close:** customers have **30 minutes** to finish drinks already served after trading hours end — no further alcohol may be supplied during this window. Source: search-index summary of vic.gov.au's own licensee-obligations material (not independently confirmed by direct fetch of the exact page in this pass — flag for confirmation, though this is a widely and consistently cited figure across vic.gov.au-linked guides).

## 1.3 Patron capacity as a licence condition

Under the Liquor Control Reform Act 1998, Liquor Control Victoria (LCV) can set a **maximum patron capacity** as a formal licence condition — this exists to prevent overcrowding, protect patron safety, manage amenity impact on neighbours, and to calculate the annual licence fee (higher capacity tiers pay more). Source: [vic.gov.au — Maximum patron capacity (PDF, July 2023)](https://www.vic.gov.au/sites/default/files/2023-09/Maximum-patron-capacity.pdf) — **via search-index summary only; the direct WebFetch of this PDF returned raw binary/compressed stream data that could not be parsed as text in this pass, so the specifics below are not independently verified against the primary document and should be re-read directly before use.**

- LCV accepts one of three documents to establish capacity: a **planning permit** stating maximum patron capacity, an **occupancy permit** showing prescribed patron capacity, or a **report from a registered building surveyor**.
- If LCV considers the capacity in a planning/occupancy permit inaccurate or inappropriate, it may require a building surveyor's report calculated on a ratio of **1 person per 0.75 square metres**.
- A red line plan (showing the licensed area boundaries) is a related, separate requirement for the licence application itself. Source: [vic.gov.au — General liquor licence](https://www.vic.gov.au/apply-general-liquor-licence) (fetched directly).

**This is a distinct concept from a building/occupancy permit's own fire-safety occupancy limit** (which is a building-code matter, not a liquor-licence matter) — a bar can in principle have a building occupancy limit and a separate, lower liquor-licence patron capacity condition; confirm both apply and which governs in practice, this wasn't resolved in this pass.

## 1.4 Advanced RSA obligation tied to late-night licences

Licensees granted a **late night (general)** or **late night (on-premises)** licence must complete **advanced RSA training within 6 months of the licence grant** — this is additional to, not a replacement for, standard RSA (see Section 3). Source: [vic.gov.au — Late night liquor licences](https://www.vic.gov.au/late-night-liquor-licences) (fetched directly, 6 Sep 2026). **Gap:** the specific content that differentiates "advanced RSA" from standard RSA was not found in this pass — flagged in the gaps section.

## 1.5 Fees indicate patron-capacity tiers exist as a real cost driver

Application fees for general/on-premises licences scale with declared capacity — e.g. 0–200 patrons costs less than 401+ patrons — which corroborates that patron capacity is a real, load-bearing figure on the licence, not a nominal one. Source: [vic.gov.au — General liquor licence](https://www.vic.gov.au/apply-general-liquor-licence) (fetched directly, 6 Sep 2026).

---

# 2. Patron capacity and crowd control

## 2.1 When licensed crowd controllers are legally required

**There is no blanket state-wide numeric trigger that automatically requires crowd controllers at every bar.** Instead: "your liquor licence conditions will state whether you need to employ licensed crowd controllers" — it is licence-condition-specific, typically attached based on venue type, patron capacity, trading hours, and risk profile (via the venue's Risk-Assessed/venue management plan, see 2.3). Source: [vic.gov.au — Security in licensed venues](https://www.vic.gov.au/security-licensed-venues) (fetched directly, 6 Sep 2026).

## 2.2 Staffing ratio, once required

Where a licence condition does require crowd controllers, the standard formula (as stated on vic.gov.au) is:

- **2 crowd controllers for the first 100 patrons**
- **+1 additional crowd controller for every extra 100 patrons, or part thereof**

Worked example given directly on the page: a venue licensed for 240 patrons needs 4 crowd controllers. Source: [vic.gov.au — Security in licensed venues](https://www.vic.gov.au/security-licensed-venues) (fetched directly, 6 Sep 2026).

## 2.3 Registers and verification

- Venues must keep a **register of crowd controllers** on the premises, available for inspection by liquor inspectors — a government template exists; a digital register is acceptable but must be immediately accessible even if a manager isn't present.
- Individual crowd controllers must hold a current, valid licence; this can be checked against **Victoria Police's public register of licence holders** before engaging anyone.
- Venues may also be required (again, per licence condition) to run **security cameras with recordings retained for at least 4 weeks**, available to authorities on request.
Source: [vic.gov.au — Security in licensed venues](https://www.vic.gov.au/security-licensed-venues) (fetched directly, 6 Sep 2026).

## 2.4 Venue/risk-assessed management plans

Late-night licences and live-music venues in particular are commonly required to hold a **venue management plan**, which must document: number of security staff/crowd controllers and their hours, interior/exterior lighting for safety, the licensed maximum patron capacity, entry/exit and pass-out procedures, evacuation procedures, waste storage/removal, and incident-response policy for drink spiking, theft, weapons and gender-based violence. The plan must be kept current and produced on request to liquor inspectors or Victoria Police. Source: [vic.gov.au — Management plans to reduce alcohol-related harm](https://www.vic.gov.au/management-plans) (fetched directly, 6 Sep 2026).

## 2.5 Private Security Act 2004 — the licensing regime behind "crowd controller"

- Crowd control work in Victoria is regulated under the **Private Security Act 2004 (Vic)**, administered by **Victoria Police's Licensing and Regulation Division**.
- A **crowd controller** is licensed to maintain order at a venue: screening people at entry, monitoring/controlling patron behaviour, and ejecting patrons when necessary. This requires an **individual operator licence specifically endorsed for crowd control**, plus completion of crowd-control/security-operations training.
- **Security guard** is a separate, broader licence category with its own sub-endorsements (armed guard, unarmed guard, cash-in-transit guard, guard with a dog, control room/monitoring centre operator) — a bar engaging "security" rather than dedicated door crowd controllers should confirm which specific endorsement the individual actually holds, since they are not interchangeable licences.
Source: [Armstrong Legal — Private security licences in Victoria](https://www.armstronglegal.com.au/commercial-law/vic/employment-law/private-security-licences/) (fetched directly, 6 Sep 2026) — **this is a law firm's practitioner summary of the Act, not the primary legislative text itself**; direct WebFetch of the Act's own definitions section ([classic.austlii.edu.au .../psa2004217/s3.html](https://classic.austlii.edu.au/au/legis/vic/consol_act/psa2004217/s3.html)) returned HTTP 403 in this pass, so the statutory wording is not independently verified — flag for a direct human read of s3 before this becomes module or chatbot-source content, since exact legal definitions matter here.

---

# 3. RSA (Responsible Service of Alcohol) — Victoria-specific standards

## 3.1 Who must hold RSA and when

- RSA is mandatory for anyone who sells, offers for sale, or serves liquor at a venue with a general, on-premises, late night, or packaged liquor licence — this explicitly includes bartenders, floor staff, managers, supervisors, licensees, function/event staff, security officers, alcohol delivery staff, and volunteers.
- Staff must complete RSA **before starting to supply alcohol, or within one month (28 days in some sources) of starting** in that role. Under-18 staff can complete the training early but cannot serve until they turn 18.
- Training must be delivered by an **LCV-approved provider** — a specific "Approved RSA Provider" logo identifies legitimate trainers.
Source: [vic.gov.au — RSA training](https://www.vic.gov.au/rsa-training) (fetched directly, 6 Sep 2026).

## 3.2 Certification validity and refresher

- RSA certification is valid for **3 years**; a free RSA Refresher course (approx. 90 minutes, online, via the LCV Learning Hub) must be completed before it lapses to stay current.
- Failure by a licensee to personally complete an approved RSA program (initial or refresher) within 3 years is itself an infringement offence (LCRA s108AA(2)) — maximum penalty $12,211, infringement notice $1,221 (2025–26 figures, see Section 6 for full penalty context and the caveat that these change every 1 July).
Source: [vic.gov.au — RSA training](https://www.vic.gov.au/rsa-training) and [Liquor Control Victoria — Breaches under the Liquor Control Reform Act 1998, from 1 July 2025](https://www.liqcon.com.au/uploads/114/141/Fact-Sheet-Breaches-2025-26.pdf) (this PDF was fetched and its text successfully extracted and read directly in this pass — a genuine primary-source read, not a search-index summary; it is hosted by a private RSA training provider (liqcon.com.au) but is explicitly branded and titled as an official Liquor Control Victoria fact sheet — the same content also exists at a vic.gov.au-hosted URL for the prior financial year, [vic.gov.au/sites/default/files/2024-06/liquor-licensing-breaches.pdf], confirming this is the genuine government document rather than a third-party rewrite).

## 3.3 Course content — what RSA actually covers in Victoria

The approved Victorian RSA course is built on the nationally recognised unit **SITHFAB021 — Provide Responsible Service of Alcohol**, with Victoria-specific additions covering: Victorian liquor laws, drink-spiking prevention, ID/proof-of-age checking, prone restraint use, and harm minimisation. A newer module addresses recognising and preventing sexual harassment and assault. Source: [vic.gov.au — RSA training](https://www.vic.gov.au/rsa-training) (fetched directly, 6 Sep 2026).

## 3.4 What "responsible service" actually obligates staff to do — the legal definition of intoxication

The operative legal test (Liquor Control Reform Act 1998 s3AB, "What is intoxication?"): a person is in a state of intoxication if their **speech, balance, coordination or behaviour is noticeably affected**, and there are reasonable grounds to believe this is the result of alcohol consumption. Source: search-index summary citing [classic.austlii.edu.au .../s3ab.html](https://classic.austlii.edu.au/au/legis/vic/consol_act/lcra1998266/s3ab.html) — **direct WebFetch of this specific section returned HTTP 403 in this pass; the wording is cross-confirmed independently by a direct fetch of the plain-English government explainer below, which uses near-identical language, giving reasonable confidence in the substance even though the primary statutory text itself wasn't directly read.**

In practice, per [vic.gov.au — Managing intoxicated patrons](https://www.vic.gov.au/managing-intoxicated-patrons) (fetched directly, 6 Sep 2026):

- **Must refuse further alcohol service** to a patron assessed as intoxicated by these signs: loud/argumentative behaviour, struggling to walk straight, bumping into objects/people, rambling or slurred speech, offensive language, losing focus, spilling drinks, coordination difficulties, appearing drowsy.
- An intoxicated patron **may remain on the premises** — the obligation is to stop serving them, not necessarily to remove them (removal becomes relevant if they are also drunk, violent, or disorderly — see 3.5).
- Staff must consider that a **disability may mimic intoxication signs** before refusing service on that basis alone — a real judgement-call caution, not just a mechanical checklist.
- Recommended practice: staff should observe how much a patron has had, whether they smell of alcohol, whether they may have been drinking before arrival, and should coordinate observations with other staff rather than deciding in isolation.
- **Must not permit a drunk or disorderly person to remain on the premises** at all — this is the harder line beyond simple intoxication.

## 3.5 Penalties that make this a compliance matter, not just a service-quality one

From the directly-read Liquor Control Victoria breaches fact sheet (1 July 2025 figures):

| Offence | Section | Maximum penalty | Infringement notice |
|---|---|---|---|
| Supply liquor to intoxicated person | 108(4)(a) | $24,421 | $2,442 |
| Permit drunken or disorderly person on premises | 108(4)(b) | $24,421 | $2,442 |
| Procure liquor for an intoxicated person | 114(1)(b)(i) | $4,070 | $407 |
| Aid/abet an intoxicated person to obtain liquor | 114(1)(b)(ii) | $4,070 | $407 |
| Refusal by a drunk/violent/quarrelsome person to leave when asked | 114(2) | $10,176 | $1,018 |

These offences also trigger the **compliance history risk fee** (raises the venue's own future licence renewal cost) and affect the venue's demerit points/star rating. **These dollar figures apply only to the 2025–26 financial year and are re-indexed every 1 July** — do not hard-code them into module content without a refresh mechanism or an explicit "figures current as at [date]" caveat. Source: [Liquor Control Victoria — Breaches under the Liquor Control Reform Act 1998, from 1 July 2025](https://www.liqcon.com.au/uploads/114/141/Fact-Sheet-Breaches-2025-26.pdf) (directly read in full).

## 3.6 Refusal of service in practice — the venue's own written policy

Licensees, as part of their risk-assessed management plan, commonly maintain a written "refusal of service" policy giving staff clear steps for when and how to refuse service — this is best-practice/commonly-required rather than a specific standalone statutory mandate found in this pass. Source: search-index summary (multiple RSA training-provider workbooks converge on this description; not a single authoritative citation — flagged as the weaker end of this section's sourcing).

---

# 4. Closing procedures specific to a licensed bar

## 4.1 No general lockout or mandatory last-drinks law currently applies in Victoria

Victoria trialled a **2am lockout** in inner-Melbourne council areas (Melbourne, Port Phillip, Stonnington, Yarra) for three months from 2 June 2008 to 2 September 2008. It was **not made permanent** — a November 2008 government report found it correlated with an *increase* in violence rather than a reduction, and dozens of venues had already successfully appealed exemptions via VCAT during the trial. **Victoria currently has no general, state-wide lockout or mandated last-drinks time** for a standard bar licence, unlike NSW's now-repealed Kings Cross/Sydney CBD lockout regime. Source: [Wikipedia — 2am Lockout](https://en.wikipedia.org/wiki/2am_Lockout) (fetched directly, 6 Sep 2026) — **this is an encyclopedia article, not a primary government source; it is being used here only to establish a negative (the absence of a current rule), which is inherently harder to source to a single regulator page. Recommend a targeted follow-up check directly against Liquor Control Victoria / Department of Justice and Community Safety press material before treating "no lockout currently exists" as final for module content, since policy could change.**

This does **not** mean there is no trading-hours cutoff at all — the cutoff is simply whatever the venue's own licence specifies (Section 1.2), not a separate blanket lockout rule layered on top.

## 4.2 The 30-minute drink-up period

As in 1.2: once trading hours end, patrons already served have **30 minutes** to finish drinks; no further alcohol may be supplied during that window. This is the practical anchor for a "last call" procedure. Source: as cited in 1.2 (search-index summary of vic.gov.au material, not independently confirmed by direct fetch of a single dedicated page).

## 4.3 Securing the licence conditions overnight

- The **RSA obligation to refuse service to intoxicated or drunk/disorderly patrons continues until the premises are actually clear** — this doesn't end at the trading-hours cutoff, it ends when the last patron leaves (Section 3.4–3.5 obligations apply throughout the drink-up window and clearing of the venue).
- If the venue used a **barring order** that night (Section 6.1), the licensee/permittee must keep a written record of it, including any variation or revocation, and must be able to produce that record for a police officer or liquor inspector on request — and must destroy those records **3 years after expiry or revocation**, not before and not indefinitely. Source: [Liquor Control Victoria — Breaches fact sheet](https://www.liqcon.com.au/uploads/114/141/Fact-Sheet-Breaches-2025-26.pdf) (ss106K(1), 106K(2), 106K(5); directly read).
- Displaying a current copy of the licence itself, and keeping/producing the licensed-premises plan on request, are standalone offences if missed (ss101, 101B) — relevant to an end-of-night or opening checklist that confirms required signage/documents are still in place. Same source.

## 4.4 Cash-up and physical security at close

This is where closing procedure meets cash handling directly — see Section 5 for the sourced detail (float/safe/banking practices). The **weakest-sourced part of this section** is a single, bar-specific, regulator-issued "closing checklist" — no such document was found in this pass. What is sourced are the individual load-bearing obligations above (RSA continuing until clear, barring-order record-keeping, licence/plan display) plus the general cash-handling guidance in Section 5 — a real end-of-night SOP would need to be assembled from these pieces rather than lifted from one source, and that assembly work has not been done here (this document is research, not module content, per the task brief).

---

# 5. Cash handling (bar-specific)

## 5.1 Primary sources

Two direct, government/police-issued sources apply here, both fetched directly and read in full (6 Sep 2026):

- [WorkSafe Victoria — Armed hold-ups and cash handling: Transferring cash safely](https://www.worksafe.vic.gov.au/armed-hold-ups-and-cash-handling-transferring-cash-safely)
- [Victoria Police — Cash handling tips](https://www.police.vic.gov.au/cash-handling-tips)

WorkSafe Victoria also separately publishes [Cash-in-transit: A guide to managing OHS in the cash-in-transit industry](https://www.worksafe.vic.gov.au/resources/cash-transit-guide-managing-ohs-cash-transit-industry) — a 32-page guide aimed at the cash-in-transit (armoured car) sector specifically, not a small bar; referenced here only via search-index summary, not directly fetched, since its intended audience is a different type of business. It does, however, name the general risk principle worth carrying over: **employees who handle cash, or who work alone/in isolation or at night, are named as being at elevated risk of work-related violence** — directly relevant to a bar's closing shift. Source: search-index summary of the same WorkSafe cash-in-transit guide page.

## 5.2 Float and till management

- Secure the cash register/till to the counter; position it away from the exit.
- Design counters to **maximise the physical distance between customer and staff**, and prevent customer access behind the counter.
- Post visible signage stating **limited cash is kept on the premises**.
- **Keep as little cash on-site as possible** — signage indicating no overnight cash retention is a named recommendation.
Source: Victoria Police — Cash handling tips (as above).

## 5.3 Safe drops and reconciliation timing

- Perform **regular, unpredictable bank deposits throughout the day/night** rather than one large end-of-night count — avoid predictable patterns in deposit bags, timing, routes, and vehicles used.
- **Do not count cash in front of customers** — lock doors before counting where practical.
- Install a safe with **dual keys, time-delay mechanisms, and dye-bomb devices**.
- **Do not take large amounts of cash to the bank in the same bag at the same time every day** — vary route and timing.
- **Never take the day's takings home** — WorkSafe names this explicitly as a robbery-risk behaviour ("driving home with the day's takings makes you a target").
Source: WorkSafe Victoria — Armed hold-ups and cash handling (as above).

## 5.4 Staffing during cash handling

- Roster **at least two staff members per shift**, and specifically **two staff members to do the banking run** together.
- Where feasible, hire security/loss-prevention staff to escort cash transport, or otherwise have a companion accompany whoever carries cash to the bank.
- During a banking run: **stay alert to surroundings**, carry a phone, vary route/time, avoid uniforms/name tags that identify the business, use unmarked bags (not ones branded with the business or bank's name), and report anything suspicious immediately.
Source: both WorkSafe Victoria and Victoria Police sources above (consistent across both).

## 5.5 If a robbery occurs

- **Comply fully with the offender's demands; do not resist or give chase.**
- Avoid direct eye contact; stay calm; avoid drawing attention to yourself.
- Call **000** only once it is safe to do so.
- Preserve the scene for evidence — don't touch anything the offender touched.
Source: WorkSafe Victoria — Armed hold-ups and cash handling; consistent with Victoria Police's general "during a robbery" guidance already sourced in B5 §3.7 for the broader break-in/robbery scenario — this document does not duplicate that, it adds the cash-specific prevention layer B5 didn't cover.

---

# 6. Security — crowd controller licensing and incident/violence response

## 6.1 Barring orders, banning notices, and liquor accord bans — three distinct powers

These are frequently conflated; they are legally distinct, all sourced directly from [vic.gov.au — Refusing or banning entry to a licensed venue](https://www.vic.gov.au/refusing-entry-to-licensed-venues) (fetched directly, 6 Sep 2026):

| Mechanism | Who can issue | Duration | Geographic scope |
|---|---|---|---|
| **Barring order** | Licensee, venue manager ("responsible person"), or a police officer | Set by the issuer, must be in writing, using the official barring order booklet | Person must stay 20 metres clear of the venue until it expires |
| **Liquor accord ban** | Liquor accord member venues, acting collectively | Up to 12 months (accord process, must be fair/transparent and proportionate to the conduct) | All participating venues in that accord |
| **Police banning notice** | Victoria Police, in a formally "designated area" | Up to 72 hours | Either all licensed venues in the designated area, or the whole area |

For a barring order specifically: the licensee must record the person's name, address, and date of birth if known, and must **retain that record** (see 4.3 above for the 3-year destruction rule). A barred person who returns within 24 hours of being refused entry or asked to leave, or who loiters within the exclusion zone, commits a separate offence (s114(3)/(4)) — maximum penalty $4,070, infringement $407 (2025–26 figures). Source: same vic.gov.au page plus the directly-read Liquor Control Victoria breaches fact sheet (Section 3.5's source).

## 6.2 Crowd controller licensing — see Section 2.5 for full detail

Repeated here only as a cross-reference: crowd control is a distinct **individual operator licence, endorsed specifically for crowd control**, under the Private Security Act 2004 (Vic), administered by Victoria Police's Licensing and Regulation Division — separate from the broader "security guard" licence and its own sub-endorsements. See 2.5 for sourcing and the caveat that the Act's own definitions section could not be directly fetched in this pass.

## 6.3 Incident/violence response specific to a licensed venue

- The **WHS notifiable-incident threshold** already sourced in B5 §2.6 (death, serious injury requiring hospital treatment, or a dangerous near-miss — notify the regulator immediately, PCBU obligation) applies identically to a bar; not re-derived here.
- **Escalation to Victoria Police for an active/urgent security incident** (assault in progress, weapon, immediate danger): **000**. For a non-urgent report after the fact: the online reporting service or the **Police Assistance Line, 131 444** — both already sourced in B5 §3.7 for the general break-in/robbery scenario and equally applicable to an on-premises violent incident.
- **Bar-specific addition B5 didn't cover:** a violent or seriously disorderly patron is very often also the trigger for a **barring order** (6.1) — the practical sequence for staff is de-escalate → remove/refuse service (RSA obligation, Section 3) → issue a barring order if appropriate → escalate to police if it becomes a safety matter or the person won't comply. This sequencing is a synthesis of Sections 3, 4, and 6.1 above, not a single source's own stated procedure — flagged as such.
- **Gap:** no Victoria-specific, regulator-issued "how to physically de-escalate or restrain an aggressive patron" guidance was found in this pass beyond the passing mention that the RSA course syllabus includes "prone restraint use" as a topic (Section 3.3) — the substance of what that actually teaches was not sourced independently and should not be assumed or reconstructed from the topic label alone.

---

# Gaps and weakest-sourced items — flagged honestly

1. **Private Security Act 2004 (Vic) primary text (s3 definitions of "crowd controller"/"security guard")** — direct WebFetch returned HTTP 403 on every attempt in this pass (both classic.austlii.edu.au and austlii.edu.au). All content on exact statutory definitions in Sections 2.5 and 6.2 comes from a law firm's practitioner summary (Armstrong Legal) and search-index snippets, not a direct read of the Act. This is the single most important item to verify with a direct human read before any of it becomes chatbot-source content, since exact legal category boundaries (who counts as a "crowd controller" vs "security guard") carry real compliance weight.
2. **Liquor Control Reform Act 1998 primary sections (s9, s9A, s3AB, s148R)** — same 403 issue on austlii for the raw Act text. Every specific clause cited from the Act in this document is corroborated by at least one plain-English vic.gov.au page that was fetched directly, but the exact statutory wording itself was not independently verified in this pass.
3. **"Advanced RSA" course content** — sourced only as a named requirement (6 months post-late-night-licence-grant), not what makes it "advanced" versus standard RSA. Genuine gap.
4. **Maximum patron capacity guidance PDF** — direct fetch returned unparseable binary; the 1-person-per-0.75sqm ratio and accepted-document list come from a search-index summary of the same document, not a verified direct read.
5. **The 30-minute post-trading drink-up window** — cited consistently across secondary sources referencing vic.gov.au material, but no single vic.gov.au page stating this was directly and successfully fetched in this pass to pin down the exact source page and any conditions attached to it.
6. **Confirmation that Victoria currently has no general lockout law** — sourced to Wikipedia, used only to establish a historical fact and a negative (absence of a current rule). This is inherently a harder thing to source to one authoritative page; worth a direct check against current Liquor Control Victoria / Department of Justice and Community Safety material, since policy is the kind of thing that can change without this document being updated.
7. **A single, regulator-issued, bar-specific closing/cash-up checklist** — does not appear to exist as its own document. What's sourced is the individual components (RSA continuing until premises clear, barring-order record-keeping, licence/plan display duties, general cash-handling guidance) — assembling these into an actual closing SOP is authoring work, not something this research pass found pre-built and citable as one source.
8. **De-escalation/physical-restraint technique detail** — the RSA course syllabus names "prone restraint use" as a covered topic, but the actual content of what is taught was not independently sourced. Do not write module content describing specific restraint techniques based on the topic label alone.
9. **Whether a bar's building/occupancy-permit capacity and its liquor-licence patron-capacity condition can differ, and which one governs if they do** — noted as an open question in Section 1.3, not resolved in this pass.
10. **Regulator naming** — flagged at the top of this document: the task brief names VCGLR, but the current operating name is Liquor Control Victoria (LCV) / the Victorian Liquor Commission, per a direct fetch of vic.gov.au. Recommend using the current name in any authored content, with VCGLR noted only as legacy/historical.

---

*Compiled 6 Sep 2026 per Build Manual Block P1. Research only — no module or SOP text has been authored against this. This document is intended as a ground-truth baseline for checking a chatbot's answers against, per the task brief — review with John before it is used that way, given the sourcing caveats above (items 1, 2, 4, 5, 6, and 8 in particular).*
