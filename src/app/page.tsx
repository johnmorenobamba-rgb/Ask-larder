import { LarderMark } from "@/components/shared/LarderMark";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { FeatureGuideStrip } from "@/components/marketing/FeatureGuideStrip";
import { ExplainerVideoSection } from "@/components/marketing/ExplainerVideoSection";
import { ProblemSolutionSection } from "@/components/marketing/ProblemSolutionSection";
import { ComplianceSection } from "@/components/marketing/ComplianceSection";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { SiteFooter } from "@/components/marketing/SiteFooter";

// Block N1/N2 — replaces the "under construction" placeholder at the bare
// root domain (Decision Log, 31 Aug 2026; Build Manual Block N). Separate
// from Block M's venue-specific `/[venueSlug]` login gateway.
//
// Nav wiring (Block N4, confirmed 6 Sep 2026): "See a live demo" links to
// the real Two Fires demo venue's gateway page (Block M,
// `/[venueSlug]/page.tsx`). Labeled honestly, not "Login" -- Larder is
// founder onboarded, not self serve, so a real venue never logs in via
// this public site; it goes straight to its own bookmarked `/[venueSlug]`
// URL given at setup. A returning customer without that link uses
// "Contact us" instead, which already leads to a real person. "Blog" is
// removed outright -- no blog exists, and there's no plan to build one
// yet. "Contact us" and the final CTA's "Book a walkthrough" both link to
// the real `/contact` form (`ContactForm.tsx` -> `/api/contact` -> Resend)
// instead of mailto links.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-parchment">
      <header className="sticky top-0 z-50 flex items-center justify-between gap-2 border-b border-ink/5 bg-parchment px-6 py-6 sm:px-10 md:px-16">
        <div className="flex items-center gap-2">
          <LarderMark size={28} />
          <span className="font-display text-lg font-bold text-ink">Larder</span>
        </div>
        <nav className="flex items-center gap-6 font-sans text-sm text-ink/80">
          <a href="/two-fires" className="hover:text-ink">
            See a live demo
          </a>
          <a href="/contact" className="hover:text-ink">
            Contact us
          </a>
        </nav>
      </header>
      <MarketingHero />
      <FeatureGuideStrip />
      <ExplainerVideoSection />
      <ProblemSolutionSection />
      <ComplianceSection />
      <HowItWorksSection />

      <div id="cta" className="border-t border-ink/10 bg-parchment px-6 py-16 text-center sm:px-10 md:px-16">
        <p className="font-display text-2xl font-bold text-ink">Want to see it on your own venue?</p>
        <p className="mt-2 text-ink/70">Book a walkthrough. We&apos;ll bring your own SOPs into it.</p>
        <a
          href="/contact"
          className="mt-6 inline-block rounded-full bg-saffron px-7 py-3 font-sans text-sm font-medium text-ink transition-colors hover:bg-saffron/90"
        >
          Book a walkthrough
        </a>
      </div>
      <SiteFooter />
    </main>
  );
}
