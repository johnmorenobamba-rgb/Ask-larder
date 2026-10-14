# DECISIONS: landing hub and spoke (branch `landing-hub-and-spoke`)

Working log for the hub and spoke restructure. Written autonomously; every ambiguous call is recorded here.

## 1. Inventory of the landing page before the change

Page: `src/app/page.tsx` (one long page, 14 stacked blocks). Measured on the production build before any change:

| Viewport | Document height | Lighthouse mobile |
|---|---|---|
| 390 wide | 15,814 px | performance 0.55, accessibility 0.92, SEO 0.92 |
| 1440 wide | 15,313 px | LCP 5.7 s, TBT 500 ms, CLS 0, FCP 3.0 s, speed index 6.7 s |

Sections in order, with the assets each used:

| # | Component | Content | Assets |
|---|---|---|---|
| 0 | header (inline in page.tsx) | Logo, "See a live demo" (/two-fires), "Contact us" (/contact) | none |
| 1 | `MarketingHero` | Pinned GSAP hero, four phrases ("Training. Onboarding. Repeat. Ask Larder."), iPad mockup with splash and bento preview. Buttons: "Get started" (#cta), "Learn more" (#explainer-video) | none (all drawn in code) |
| 2 | `ProblemSolutionSection` | Three problems (binder, every hire learns a different version, knowledge leaves) and the solution line | glyph icons |
| 3 | `FeatureGuideStrip` | Four cards: built from your SOPs, certificates in one place, your SOPs always on shift, owner visibility | glyph icons |
| 4 | `AskLarderSection` | Ask mid shift, get the answer; approval line; supervisor line | `launch/ask-answer.webp` |
| 5 | `ComplianceFormsSection` | Forms in taps, three tap checklist, failed reading note, owner overview, print and CSV, "not legal advice" | `forms-hub`, `checklist-tablet`, `checklist-fail-note`, `temperature-failed`, `owner-overview` |
| 6 | `OwnerOverviewSection` | One screen for the owner, four bullet points | `owner-dashboard` (marked `priority`) |
| 7 | `StationGallerySection` | Station QR codes and gallery | `stations-gallery` |
| 8 | `CertsSignSection` | Certificate list, typed name sign off | `owner-certificates`, `esign` |
| 9 | `SuggestionAssistantSection` | Larder drafts additions from near misses and unanswered questions; owner approves | `suggestion-assistant-feed-v2.png` |
| 10 | `ExplainerVideoSection` | 74 second film (video v3, quiet sound track, starts muted), transcript | `/videos/larder-v3-web.mp4` + `larder-v3-poster.jpg` (already an MP4 with `preload="none"`, `muted`, `controls`; it does NOT ship the Remotion Player to the browser) |
| 11 | `HowItWorksSection` | Walkthrough, Build, Approve, Live (done for you service) | none |
| 12 | `TrustStrip` | Locked to your venue, you approve everything, month to month, records are yours | none |
| 13 | `FaqSection` | Eight questions | none |
| 14 | Closing CTA (inline) | "Want to see it on your own venue?" and the button | none |
| 15 | `SiteFooter` | Address, links, legal, privacy | none |

**Primary CTA (reused everywhere, no new funnel):** "Book a walkthrough" to `/contact` (the closing CTA). The hero's "Get started" scrolls to that block. No self serve sign up, trial language or pricing was added.

## 2. What the hub is now

Hub (`/`), in order: header, hero, film, feature cards (with the leading line above them), closing call to action, footer. `main` holds exactly four children (hero, `#explainer-video`, `#features`, `#cta`); a test asserts it.

| Measure | Before | After |
|---|---|---|
| Document height at 390 wide | 15,814 px | 5,504 px |
| Document height at 1440 wide | 15,313 px | 6,110 px |
| Blocks on the page | 14 | 4 plus header and footer |

The after heights still include the hero's scroll pin (about 2.2 screens on a phone, 3.2 on desktop), which is unchanged.

Six feature pages, one per card, all driven by `src/data/features.ts` (cards, pages, related links, previous and next, sitemap, metadata, strip): `ask-larder`, `training-modules`, `compliance-forms`, `certificates-signoff`, `owner-dashboard`, `stations`.

## 3. Where each removed section went

| Old section | Now |
|---|---|
| Header | Kept on every page. Added the primary CTA to it (see assumptions). |
| Hero | Kept as it was. Only change: the secondary button "Learn more" now reads "Watch the film" (a bare "Learn more" is banned). |
| Problem and solution | The three problems are the Problem block on `training-modules`. The closing "Ask Larder turns what your best staff already know..." paragraph is cut; the hero subhead already says it. |
| Feature guide strip (4 cards) | Replaced by the six hub cards. Built from your SOPs to `training-modules`, certificates to `certificates-signoff`, SOPs always on shift to `ask-larder`, owner visibility to `owner-dashboard`. |
| Ask Larder section | `ask-larder`. Fryer oil example, approved content line, supervisor line for keys, codes and logins. |
| Compliance forms | `compliance-forms`. Hub, checklist, failed check note, print and CSV, "not legal advice". The temperature log card and the old overview image were cut (see screenshots). |
| Owner overview | `owner-dashboard`. The four bullets are the "What it does" bullets. |
| Stations | `stations`. |
| Certificates and sign off | `certificates-signoff`. |
| Suggestion assistant | Extra figure on `training-modules` (Larder suggests what your procedures missed). |
| Explainer video | Hub, directly under the hero. |
| How it works (walkthrough, build, approve, live) | Steps 1 to 3 on `training-modules`. The fourth step, Live, is cut as a separate step; staff learning is step 3 and Ask Larder is its own page. |
| Trust strip | Locked to your venue: `ask-larder` bullet. You approve everything: `training-modules` (step 2 and bullet). Month to month and records are yours: the "What happens if we cancel?" FAQ on `owner-dashboard`. |
| FAQ (8 questions) | Rostering and cancel: `owner-dashboard`. Build the training ourselves: `training-modules`. What can Ask Larder answer (now "Can the chatbot make something up?") and internet connection: `ask-larder`. Legal checks and overdue reminders: `compliance-forms`. State rules: `certificates-signoff`. Station install question is new and answers a real objection. |
| Closing CTA | Same wording and destination, now a shared component on every page. |
| Footer | Same. The Features link now goes to `/#features`. |

Deleted components: all section components above plus `ScreenFigure`, `Reveal` and `launchShots.json` (nothing imports them). The images they used stay in `public/images/marketing/launch`; only `ask-answer.webp` and `stations-gallery.webp` are still referenced.

## 4. Assumptions and decisions made without asking

- **Video (replaced with v3, video-v2 branch):** the landing page now plays `/videos/larder-v3-web.mp4` (74 seconds, 5.8 MB web encode of `out/larder-promo-v3.mp4`) with `larder-v3-poster.jpg`. The v2b files stay in `public/videos` as a fallback. v3 has a quiet synthesised sound track (about minus 20 LUFS) but no narration; it still starts muted and has visible controls, so the muted, inline, `preload="none"` attributes and the existing pause behaviour are unchanged. The transcript, the aria label and the example venue note were rewritten for the new film. The section heading still reads "From a pile of forms to a few taps." and was not changed. Before this, the film was already a rendered MP4 (`/videos/larder-v2b-web.mp4`), not the Remotion Player, so there was no change to the file. It is muted, `playsInline`, `preload="none"`, has a poster and native controls, plus the existing transcript. There is no narration, so there are no captions to add. One real fix: it autoplays muted when scrolled into view, and previously it restarted after the viewer paused it. It now stays paused once the viewer pauses it (WCAG 2.2.2).
- **Primary CTA:** "Book a walkthrough" to `/contact`. Added to the header on every page because the brief asks for it. The hero's "Get started" still scrolls to `#cta`.
- **Hero kept** untouched apart from the button text. Its pin reads the first `header` on the page, so the new `SiteHeader` stays the first one.
- **Merged trust cards:** two cards. "Training built from your own procedures" carries the owner approval gate. "Certificates and sign off in one place" carries certificate upload, expiry and the typed name sign off. Hub total is six.
- **Breadcrumb:** "Features" links to `/#features` because there is no `/features` index page and the brief did not ask for one. On a phone only the parent level shows.
- **"All features" strip and header** stick together at the top of feature pages. The header alone is sticky on the hub.
- **Prev and next wrap around** (Stations to Ask Larder), so every page has both.
- **Related links** use the hub card component, so the link text is the descriptive "See how ... works".
- **Compliance wording** (FSANZ Standard 3.2.2A). Sources & References section 1 and `docs/block-o-compliance-sources.md` support the standard and the December 2023 date. The claims ledger (`scratch/compliance-hardening3-report/C1-claims-ledger.md`, L1, L2) says the old "every food business" wording is too broad and the category detail is unconfirmed. So the pages say "many Australian food businesses", "depends on your food business category", "helps you meet and evidence", and "not legal advice". No guarantee, no liability or lawsuit framing. **Please check this wording against the primary source before it goes live.**
- **State rules:** RSA and working with children checks are described as different by state, with no state named, per Sources & References sections 3 and 4.
- **Not claimed (left out on purpose, per the ledger):** reminder emails for certificates, instant alerts, offline use, voice, hosting in Australia, trained on your data, any statistic, any customer or testimonial. The weekly report screen was not used because its capture shows "no unanswered questions", which undercuts the claim.
- **Ask Larder fallback screens:** no screenshot of the supervisor fallback, as in the launch decision (superseded files). It appears in words only: the does bullet and the FAQ.
- **Stamp:** appears only inside the real completion screen screenshot on `certificates-signoff`. Not used as decoration anywhere.
- **Skill:** CLAUDE.md names a `frontend-design` skill; it is not installed in this environment. I applied the CLAUDE.md design system directly (palette, Space Grotesk, Inter, IBM Plex Mono, no cream plus terracotta, numbered markers only on the genuine step sequence, no confetti or generic checkmarks).
- **Pre-existing lint errors:** `main` had 19 `no-html-link-for-pages` errors in `SiteFooter.tsx` and `contact/page.tsx`. Fixed by switching those links to `next/link` so lint passes.

## 5. Screenshots

- **No new capture run.** The Saltbush Corner Kitchen capture spec (`scratch/marketing/capture.spec.ts`) creates and deletes a fixture venue in Supabase with the service role. The brief says not to touch Supabase, so I did not run it. The existing library from that spec (fictional venue, invented staff, certificate dates and QR codes swapped for a sample, four viewports, 2x) already covered every step. It lives outside the repo at `C:/Users/johnm/larder-private/marketing-assets/launch/screenshots`.
- `scripts/crop-feature-shots.mjs` plus `scripts/feature-crops.json` record each crop and regenerate `public/features/<slug>/*.webp` and `src/data/feature-shots.json` (size and blur placeholder per image).
- Staff steps use the iPad landscape captures (1024 by 768 at 2x), owner steps use the 375 wide phone captures cropped portrait, and owner completions uses desktop. The two reused launch images are the Ask Larder answer (a phone capture, since the iPad modal is cut off at the bottom of the frame) and the station gallery.
- Callouts are HTML markers over the image with a text legend, not baked into pixels. Positions were checked by eye in rendered pages and may be a few percent off; adjust in `features.ts`.
- `priority` is not set on any feature page image: the first screenshot sits below the hero text. Everything is lazy with a blur placeholder.
- **No uncapturable screens, so no placeholder images.** Gaps to know about: the Ask Larder owner step shows the dashboard escalations tile, not a dedicated unanswered questions screen.

## 6. Placeholders and TODOs

- **Real venue quote:** every feature page has a hidden `<aside data-todo="venue-quote">` in How it helps, plus a code comment, and `quoteSlot` in `features.ts`. Nothing renders until a venue agrees to be named.
- **PostHog:** events `hub_feature_card_click` (slug, source), `feature_page_view` (slug), `feature_cta_click` (slug, location: header, hero or closing; the hub uses slug `hub`), `video_play` and `video_pause` (trigger: scroll or viewer) are wired. They do nothing until `NEXT_PUBLIC_POSTHOG_KEY` is set, because the existing `track()` wrapper no-ops without it.
- **OG images** are generated per feature with the default font, not Space Grotesk. Fine for now; swap in the font file later if wanted.
- **`NEXT_PUBLIC_SITE_URL`** is not set locally, so canonical, Open Graph and sitemap URLs use the fallback `https://asklarder.com.au`.
- **Stale scripts (not run, not changed):** `scripts/verify-marketing-n4.ts` and `scripts/one-off/verify-suggestion-assistant-section.mjs` check sections that no longer exist on the hub.

## 7. Lighthouse (mobile, production build, localhost)

| | Before | After (hub) | After (training-modules page) |
|---|---|---|---|
| Performance | 0.55 | 0.56 | 0.69 |
| Accessibility | 0.92 | 0.96 | 0.96 |
| SEO | 0.92 | 0.92 | 0.92 |
| LCP | 5.7 s | 5.8 s | 4.4 s |
| TBT | 500 ms | 540 ms | n/a |
| CLS | 0 | 0 | 0 |
| Page weight | 692 KiB | 620 KiB | n/a |

The hub did not regress: the differences in LCP and TBT are within run to run noise on this machine, and weight and unused JavaScript went down. Its LCP is still slow because of the cold load splash and the pinned hero, which I left alone. That is the next thing to look at if hub speed matters.

## 8. Verification

- `tsc --noEmit`, `eslint` (0 errors) and `next build` pass.
- `tests/e2e/hub-and-spoke.spec.ts` (run with `playwright.hub.config.ts`, no database, no global setup): 26 tests. Hub block structure and card links; every card lands on the right page at phone (390), iPad (820) and desktop (1440); every page at all three widths checks H1, breadcrumb, strip, header and hero CTA, template section order, three steps, related links, prev and next, no sideways scroll, no broken images, alt text and every internal link returning 200; metadata, canonical, OG image, breadcrumb JSON-LD, sitemap and a 404 on an unknown slug; copy rules (no dashes, no banned claims, compliance wording); FAQ opens; keyboard skip link and card focus outline. All passed against both the dev server and the production build.
- `tests/e2e/landing.spec.ts` updated for the new structure. It needs the database global setup, so it was not run here.
