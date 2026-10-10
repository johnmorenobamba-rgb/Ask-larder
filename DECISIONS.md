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
| 10 | `ExplainerVideoSection` | 60 second silent film, transcript | `/videos/larder-v2b-web.mp4` + poster (already an MP4 with `preload="none"`, `muted`, `controls`; it does NOT ship the Remotion Player to the browser) |
| 11 | `HowItWorksSection` | Walkthrough, Build, Approve, Live (done for you service) | none |
| 12 | `TrustStrip` | Locked to your venue, you approve everything, month to month, records are yours | none |
| 13 | `FaqSection` | Eight questions | none |
| 14 | Closing CTA (inline) | "Want to see it on your own venue?" and the button | none |
| 15 | `SiteFooter` | Address, links, legal, privacy | none |

**Primary CTA (reused everywhere, no new funnel):** "Book a walkthrough" to `/contact` (the closing CTA). The hero's "Get started" scrolls to that block. No self serve sign up, trial language or pricing was added.
