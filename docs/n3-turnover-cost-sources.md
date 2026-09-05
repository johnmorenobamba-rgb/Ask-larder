# Block N3 explainer video — cost statistic & music sourcing

**Updated for v2** (Researcher → Writer → Motion Director pipeline,
2026-09-05): the rebuilt script adds three more on-screen numbers beyond
the original Cornell figure. Same sourcing discipline applies — each is
listed below with its real source.

## Additional v2 statistics

- **VIC: licensee penalty up to $12,546 for an RSA lapse.** Source:
  Victorian Government, Liquor Control Reform Act 1998 s108AC(2)
  (https://www.vic.gov.au/liquor-offences-and-fines) — primary,
  government source. Infringement notice amount is $1,255; the $12,546
  figure is the maximum penalty. **Applied:** beat 9, on-screen as
  "$12,546."
- **NSW: licensee fined $1,100 vs. staff member $220 for the same RSA
  lapse.** Source: NSW Government
  (https://www.nsw.gov.au/business-and-economy/liquor-and-gaming/training/competency-cards/fines)
  — primary, government source, LR2018 C63(1)(b)/(2). **Removed from the
  video 2026-09-05** at John's direction (v4) — was on-screen as the
  "$220 / $1,100" comparison beat; the citation stays here for the
  record, same treatment as the excluded court case below, in case a
  future cut wants to reintroduce it. The VIC $12,546 figure and the
  15.5% turnover stat are unaffected and still used.
- **Australian hospitality has the highest job turnover of any industry:
  15.5%.** Source: Ai Group, "Labour market dynamics in Australia"
  factsheet
  (https://www.australianindustrygroup.com.au/resourcecentre/research-economics/factsheets/factsheet-labour-market-dynamics-in-australia/),
  ABS-derived, year to February 2025. **Applied:** beat 4/5, on-screen as
  "15.5%."

**Two claims explicitly rejected during research and NOT used anywhere in
this video**, flagged here so they don't get reintroduced later: an
"$11,000 fine for one expired RSA" claim circulating on hospitality SaaS
blogs (unsupported — the real NSW figure is $1,100) and a "38.7% turnover"
claim (no primary source found — the real ABS-derived figure is 15.5%).

**One finding deliberately excluded from the video, flagged to the
founder separately, not a citation to reuse:** a real, checkable 2021 NSW
Supreme Court case (a restaurant fined after an allergy death traced to a
handwritten allergen sheet) came up in research. It is thematically exact
but involves a real death and a named business — using it in marketing
copy is an editorial/ethical call for the founder to make explicitly, not
something this pipeline should decide by default. Not included in any
draft.

Per the Build Manual's Block N3 non-negotiable sourcing discipline (same
standard as Block O's compliance content): every claim shown on screen
must trace to a real, checkable source. This doc is that citation record
for the video's 0:10–0:14 cost beat and its music track — not the video
script itself, which states things in plain viewer-facing language.

## Turnover/retraining-cost statistic

- Tracey, J. Bruce, and Timothy R. Hinkin. "Contextual Factors and Cost
  Profiles Associated With Employee Turnover." Cornell University Center
  for Hospitality Research. Full text:
  https://ecommons.cornell.edu/bitstream/handle/1813/72391/Hinkin59_Contextual_Factors_and_Cost_Profiles_Associated_with_Employee_Turnover.pdf
- **Applied:** the video states "$5,864 — average cost to replace one
  hospitality employee." This is the study's reported average total
  turnover cost for front-desk-level hotel positions across a 12-hotel
  sample (Exhibit 49.1, range $2,604–$14,019). The same paper's broader
  33-property sample splits this by job complexity: ~$5,700 for lower-
  complexity roles, up to ~$9,932–$12,000+ for higher-complexity/skilled
  roles — the $5,864 figure was chosen as the single clearest, most
  representative headline number for a 4-second on-screen beat.
- **Known limitation, stated plainly, not hidden:** this is U.S. hotel
  data collected in 2005 (the paper itself appears to date to ~2007–2008
  publication, referencing a March 2007 Circuit City layoff). No
  primary-sourced Australian hospitality-specific turnover-cost figure
  was found — the Australian sources that surfaced in search (rosterelf.com,
  foremind.com.au, scalesuite.com.au) were checked directly by fetching
  each page's content and contain no citation, named study, or
  methodology at all; they are unsourced marketing content, not usable
  under this project's sourcing standard. The Australian HR Institute's
  real, dated "Turnover and Retention Research Report" (Aug 2018, 501
  respondents) was also checked directly (PDF read in full) — it gives a
  credible general Australian turnover RATE (~18% average across all
  industries) but does not report a hospitality-specific dollar cost
  figure and its hospitality/accommodation-and-food-services subsample
  was too small (1.2% of respondents) to use reliably on its own.
- **Confirmed with John before use** (Bento-variety-pass-style
  confirmation, same session): use the Cornell figure, framed honestly as
  hospitality-industry research rather than implied to be Australian.

## Music track & license

- Track: "Indie Rock (Food Review)" by BombinSound.
- Source: Pixabay (https://pixabay.com/music/rock-indie-rock-food-review-592192/),
  downloaded directly from Pixabay's own CDN
  (`cdn.pixabay.com/audio/2026/09/01/audio_0c84e23ebb.mp3`).
- License: Pixabay Content License (full terms:
  https://pixabay.com/service/license-summary/) — free for commercial
  use, no attribution required, modification into new works explicitly
  permitted. Verified by reading the license summary page directly, not
  assumed from the track page's badge alone.
- Stored in the repo at `remotion/public/indie-rock-food-review.mp3`.
- **Beat timing derivation:** cut points for the video's 8 script beats
  are aligned to real onsets detected in Pixabay's own published waveform
  data for this track (`pixabay.com/music/592192/waveform.json`), via a
  peak-picking pass over that amplitude envelope
  (`scratch/n3-research/analyze-waveform.mjs`) — not manually guessed
  round numbers. That analysis also surfaced a genuine quieter stretch in
  the track around 26–37s, used deliberately for the calmer feature-
  callouts beat rather than fought against. The waveform data's own
  resolution (~3.8 points/second) is coarse enough that this should be
  read as real structural/pacing guidance, not literally frame-accurate
  beat-matching — a finer pass (e.g. re-analyzing the actual decoded audio
  rather than the pre-rendered waveform JSON) would be needed for that.

## Freshness caveat

Checked live during this Block N3 session (September 2026). Re-verify the
Cornell citation and Pixabay license terms before relying on this
long-term, per the same standing caveat used in
`docs/block-o-compliance-sources.md`.
