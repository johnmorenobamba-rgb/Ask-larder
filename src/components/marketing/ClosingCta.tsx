import { TrackedLink } from "./TrackedLink";

/** The closing call to action, the same wording and destination as the original landing page. The id stays `cta` because the hero's Get started button scrolls here. */
export function ClosingCta({ slug }: { slug: string }) {
  return (
    <section id="cta" aria-labelledby="cta-heading" className="border-t border-ink/10 bg-parchment px-6 py-16 text-center sm:px-10 md:px-16">
      <h2 id="cta-heading" className="font-display text-2xl font-bold text-ink">
        Want to see it on your own venue?
      </h2>
      <p className="mt-2 text-ink/70">Book a walkthrough. We&apos;ll bring your own SOPs into it.</p>
      <TrackedLink
        href="/contact"
        event="feature_cta_click"
        eventProps={{ slug, location: "closing" }}
        className="mt-6 inline-block rounded-full bg-saffron px-7 py-3 font-sans text-sm font-medium text-ink transition-colors hover:bg-saffron/90"
      >
        Book a walkthrough
      </TrackedLink>
    </section>
  );
}
