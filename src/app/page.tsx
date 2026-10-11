import { MarketingHero } from "@/components/marketing/MarketingHero";
import { ExplainerVideoSection } from "@/components/marketing/ExplainerVideoSection";
import { HubFeatures } from "@/components/marketing/HubFeatures";
import { ClosingCta } from "@/components/marketing/ClosingCta";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SkipLink } from "@/components/marketing/SkipLink";

// Hub page. Block N1/N2 replaced the "under construction" placeholder at the bare root domain; the hub and spoke restructure
// (branch landing-hub-and-spoke, see DECISIONS.md) cut this page down to five blocks: the hero, the film, the feature cards,
// the closing call to action and the footer. Everything else that used to live here moved to a page under /features.
// Nav wiring (Block N4, 6 Sep 2026): "See a live demo" links to the real Two Fires demo venue's gateway page, labelled
// honestly because Larder is founder onboarded, not self serve. "Contact us" and the closing "Book a walkthrough" lead to
// the real `/contact` form (`ContactForm.tsx` -> `/api/contact` -> Resend).
export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-parchment">
      <SkipLink />
      <SiteHeader slug="hub" />
      <main id="main" className="flex flex-1 flex-col">
        <MarketingHero />
        <ExplainerVideoSection />
        <HubFeatures />
        <ClosingCta slug="hub" />
      </main>
      <SiteFooter />
    </div>
  );
}
