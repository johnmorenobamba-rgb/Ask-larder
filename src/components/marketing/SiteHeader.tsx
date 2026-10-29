import Link from "next/link";
import { LarderMark } from "@/components/shared/LarderMark";
import { TrackedLink } from "./TrackedLink";

/**
 * The header for the hub and every feature page. The primary call to action stays in view on every page and on a phone,
 * and the text links drop below the sm breakpoint because the "All features" strip and the footer carry the navigation there.
 * MarketingHero measures the first `header` element on the page to offset its pin, so keep this the first one.
 */
export function SiteHeader({ slug }: { slug: string }) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-ink/5 bg-parchment px-4 py-3 sm:px-10 sm:py-5 md:px-16">
      <Link href="/" className="flex items-center gap-2 rounded-md" aria-label="Larder home">
        <LarderMark size={28} />
        <span className="font-display text-lg font-bold text-ink">Larder</span>
      </Link>
      <nav aria-label="Main" className="flex items-center gap-4 font-sans text-sm text-ink/80 sm:gap-6">
        <Link href="/#features" className="hover:text-ink">
          Features
        </Link>
        <Link href="/coachmans-arms-wizard" className="hidden hover:text-ink sm:inline">
          See a live demo
        </Link>
        <Link href="/contact" className="hidden hover:text-ink md:inline">
          Contact us
        </Link>
        <TrackedLink
          href="/contact"
          event="feature_cta_click"
          eventProps={{ slug, location: "header" }}
          className="rounded-full bg-saffron px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-saffron/90 sm:px-5 sm:text-sm"
        >
          Book a walkthrough
        </TrackedLink>
      </nav>
    </header>
  );
}
