import { LarderMark } from "@/components/shared/LarderMark";
import { ChitMark } from "@/components/shared/ChitMark";

const SITE_LINKS = [
  { label: "Features", href: "/#feature-guide" },
  { label: "See it in motion", href: "/#explainer-video" },
  { label: "Book a walkthrough", href: "/contact" },
  { label: "See a live demo", href: "/two-fires" },
];

/**
 * Block N4 — the site's first footer. Black (the palette's darkest token,
 * `--color-ink`, already used as the video section's background) with a
 * decorative oversized ChitMark bleeding off the bottom right corner
 * (`overflow-hidden` wrapper, no changes to ChitMark.tsx itself) rather
 * than centered as a normal logo mark.
 */
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ink px-6 py-16 sm:px-10 md:px-16">
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 opacity-40"
        aria-hidden="true"
      >
        <ChitMark size={320} traceColor="var(--color-saffron)" fillColor="var(--color-parchment)" />
      </div>
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-10 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <LarderMark size={24} color="var(--color-parchment)" />
            <span className="font-display text-lg font-bold text-parchment">Larder</span>
          </div>
          <p className="max-w-xs font-sans text-sm text-parchment/60">
            Staff onboarding and training, built from your venue&apos;s own way of doing things.
          </p>
          <p className="font-sans text-sm text-parchment/60">157 Fitzroy Street, Saint Kilda VIC 3182</p>
        </div>
        <nav className="flex flex-col gap-2 font-sans text-sm text-parchment/80">
          {SITE_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-parchment">
              {link.label}
            </a>
          ))}
          <a href="/legal" className="hover:text-parchment">
            Legal
          </a>
          <a href="/privacy" className="hover:text-parchment">
            Privacy Policy
          </a>
        </nav>
      </div>
    </footer>
  );
}
