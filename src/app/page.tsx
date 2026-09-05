import { LarderMark } from "@/components/shared/LarderMark";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { FeatureGuideStrip } from "@/components/marketing/FeatureGuideStrip";
import { ExplainerVideoSection } from "@/components/marketing/ExplainerVideoSection";

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
      <ExplainerVideoSection />

      {/* Temporary placeholder CTA -- N4 (Build Manual) owns the real final
          CTA content; this is the same block that used to sit inside
          FeatureGuideStrip, just relocated so `#contact` (linked from the
          header nav and the hero's "Get started") stays live. */}
      <div id="contact" className="border-t border-ink/10 bg-parchment px-6 py-16 text-center sm:px-10 md:px-16">
        <p className="font-display text-2xl font-bold text-ink">Want to see it on your own venue?</p>
        <p className="mt-2 text-ink/70">Book a walkthrough. We&apos;ll bring your own SOPs into it.</p>
        <a
          href="mailto:hello@asklarder.com.au?subject=Book%20a%20walkthrough"
          className="mt-6 inline-block rounded-full bg-saffron px-7 py-3 font-sans text-sm font-medium text-ink transition-colors hover:bg-saffron/90"
        >
          Book a walkthrough
        </a>
      </div>
    </main>
  );
}
