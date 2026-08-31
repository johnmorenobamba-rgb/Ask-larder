import { LarderMark } from "@/components/shared/LarderMark";
import { MarketingHero } from "@/components/marketing/MarketingHero";

// Block N1 — replaces the "under construction" placeholder at the bare
// root domain (Decision Log, 31 Aug 2026; Build Manual Block N). Separate
// from Block M's venue-specific `/[venueSlug]` login gateway, which this
// route doesn't touch. Header stays brand-only for this stage — nav/CTA
// wiring is N4's scope, not N1's.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-parchment">
      <header className="flex items-center gap-2 px-6 py-6 sm:px-10 md:px-16">
        <LarderMark size={28} />
        <span className="font-display text-lg font-bold text-ink">Larder</span>
      </header>
      <MarketingHero />
    </main>
  );
}
