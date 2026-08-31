import { LarderMark } from "@/components/shared/LarderMark";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { FeatureGuideStrip } from "@/components/marketing/FeatureGuideStrip";

// Block N1/N2 — replaces the "under construction" placeholder at the bare
// root domain (Decision Log, 31 Aug 2026; Build Manual Block N). Separate
// from Block M's venue-specific `/[venueSlug]` login gateway, which this
// route doesn't touch.
//
// Nav notes (31 Aug 2026 feedback round):
// - "Login" has no single functional destination -- accounts are
//   venue-scoped, there's no generic login (Decision Log's own framing:
//   link to Block M "only in the sense of existing-clients messaging, not
//   as a functional deep link"). Routes to a mailto for now, honestly, not
//   a fake deep link to a specific venue.
// - "Blog" has no destination yet -- no blog exists. Placeholder anchor,
//   flagged, not wired to real content.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-parchment">
      <header className="sticky top-0 z-50 flex items-center justify-between gap-2 border-b border-ink/5 bg-parchment px-6 py-6 sm:px-10 md:px-16">
        <div className="flex items-center gap-2">
          <LarderMark size={28} />
          <span className="font-display text-lg font-bold text-ink">Larder</span>
        </div>
        <nav className="flex items-center gap-6 font-sans text-sm text-ink/80">
          <a href="mailto:hello@asklarder.com.au?subject=Existing%20customer%20login" className="hover:text-ink">
            Login
          </a>
          <a href="#" className="hover:text-ink">
            Blog
          </a>
          <a href="#contact" className="hover:text-ink">
            Contact us
          </a>
        </nav>
      </header>
      <MarketingHero />
      <FeatureGuideStrip />
    </main>
  );
}
