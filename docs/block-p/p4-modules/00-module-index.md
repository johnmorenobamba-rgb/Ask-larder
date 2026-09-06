# Block P4: Module Index (The Quiet Fox)

Internal index only. Not part of the content handed to a new hire.

| # | Module | Roles it applies to | Sections |
|---|---|---|---|
| 01 | Welcome and how we work | Duty Manager, Bar Supervisor, Bar Attendant, Glassie | 4 |
| 02 | RSA and service standards | Duty Manager, Bar Supervisor, Bar Attendant, Glassie | 6 |
| 03 | Food handling and allergens | Duty Manager, Bar Supervisor, Bar Attendant, Glassie | 5 |
| 04 | Bar equipment and stations | Duty Manager, Bar Supervisor, Bar Attendant, Glassie | 6 |
| 05 | Workplace safety and manual handling | Duty Manager, Bar Supervisor, Bar Attendant, Glassie | 4 |
| 06 | Cash handling and end of night reconciliation | Duty Manager, Bar Supervisor | 5 |
| 07 | Closing procedures and premises security | Duty Manager, Bar Supervisor | 5 |
| 08 | Business continuity and emergencies | Duty Manager, Bar Supervisor, Bar Attendant, Glassie | 4 |
| 09 | Safe access procedures (restricted, authorized-tier) | Duty Manager | 1 |
| 10 | Alarm and premises access (restricted, authorized-tier) | Duty Manager, Bar Supervisor | 1 |

## Role scope reasoning

- **All FOH roles** (Duty Manager, Bar Supervisor, Bar Attendant, Glassie) get RSA, food handling, equipment, and OHS content because every role at The Quiet Fox pours, carries, or handles drinks and food at some point, including the Glassie, who runs drinks to booths and is RSA certified for that reason.
- **Cash handling and closing/security are scoped to Duty Manager and Bar Supervisor only**, matching the venue's own rule that a Bar Attendant is never left to close alone.
- **Business continuity is scoped to all FOH** because everyone needs to know the emergency numbers and what to do if EFTPOS goes down mid service, even though supplier accounts and insurance are managed above staff level.
- **Security and patron management content is split rather than given its own module**, matching the venue's explicit choice not to run crowd controllers. Floor level awareness (calming a tense conversation down, the duress alarm, the banned patron folder) sits inside the RSA module, since that's who staff need it during service. The nightly CCTV review and the formal closing security steps sit inside the closing module, since only the Duty Manager or Bar Supervisor perform those.
- **Added 7 Sep 2026, Tech Bible §15i (role-tiered fallback):** modules 09 and 10 hold the actual safe combination and alarm code, tagged `is_restricted = true` and scoped only to the roles the venue's own content already treats as closing-authorized. `staff_roles.fallback_tier` is set to `authorized` for Duty Manager and Bar Supervisor (matching the same two roles already scoped into Cash Handling and Closing), and stays at the default `frontline` for Bar Attendant and Glassie — a frontline-tier question about either code still gets the standard supervisor-fallback line, unchanged. The safe combination is scoped to Duty Manager only (not Bar Supervisor), matching Module 06 §5's own statement that only Marcus and the current Duty Manager know it; the alarm code is scoped to both closing-authorized roles, matching Module 07 §1. Neither restricted section carries a check-question — a multiple-choice question about an access code would have to embed the code (or a plausible near-match) directly into `check_questions`, which has no `is_restricted` column and would defeat the whole point.

## Genuine content gaps flagged during authoring

1. **P3 never names the trained backup Duty Manager**, only that one exists for when Priya is off. Module content refers generically to "the Duty Manager on shift" rather than naming a second person, so this doesn't block authoring, but the real venue will need that person's name captured before rollout.
2. **P3 doesn't state who holds RSA marshal authority when neither Priya nor a backup Duty Manager is on shift** (for example, a quiet Tuesday run by Jordan alone). The RSA module content makes a reasonable inference that Jordan, as Bar Supervisor, holds fallback authority on those nights, but this hasn't been confirmed by Marcus and should be checked before going live.
3. **P3 doesn't specify who exactly assembles the snack boards** (a shared task across bar roles versus something only certain roles do). Food handling content was written to apply to whoever is behind the bar at the time, which fits the venue's small, cross trained team, but this is an assumption rather than a stated fact.
4. **The exact wording of the door sign used during an EFTPOS outage** ("cash preferred, card outage") is the only line from business continuity quoted directly; everything else in that module is procedural rather than a fixed script, so there was nothing further to verify there.
