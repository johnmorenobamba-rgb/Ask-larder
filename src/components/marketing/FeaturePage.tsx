import Link from "next/link";
import { getFeature, prevNext, type Feature } from "@/data/features";
import { siteUrl } from "@/lib/site";
import { AllFeaturesStrip } from "./AllFeaturesStrip";
import { AnnotatedFigure } from "./AnnotatedFigure";
import { ClosingCta } from "./ClosingCta";
import { FeatureCards } from "./FeatureCards";
import { FeaturePageView } from "./FeaturePageView";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SkipLink } from "./SkipLink";
import { TrackedLink } from "./TrackedLink";

function Breadcrumb({ feature }: { feature: Feature }) {
  return (
    <nav aria-label="Breadcrumb" className="font-sans text-sm text-ink/70">
      {/* Phone: parent level only. */}
      <Link href="/#features" className="inline-flex min-h-11 items-center hover:text-ink sm:hidden">
        <span aria-hidden="true">&larr;&nbsp;</span>Features
      </Link>
      <ol className="hidden items-center gap-2 sm:flex">
        <li>
          <Link href="/#features" className="hover:text-ink">
            Features
          </Link>
        </li>
        <li aria-hidden="true">&gt;</li>
        <li aria-current="page" className="text-ink">
          {feature.name}
        </li>
      </ol>
    </nav>
  );
}

function breadcrumbJsonLd(feature: Feature) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Larder", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Features", item: `${base}/#features` },
      { "@type": "ListItem", position: 3, name: feature.name, item: `${base}/features/${feature.slug}` },
    ],
  };
}

export function FeaturePage({ feature }: { feature: Feature }) {
  const { prev, next } = prevNext(feature.slug);
  const related = feature.related.map((s) => getFeature(s)).filter((f): f is Feature => Boolean(f));
  return (
    <div className="flex flex-1 flex-col bg-parchment">
      <SkipLink />
      <div className="sticky top-0 z-50">
        {/* The header is sticky on its own in the hub; here the header and the strip stick together. */}
        <div className="[&>header]:static">
          <SiteHeader slug={feature.slug} />
        </div>
        <AllFeaturesStrip current={feature.slug} />
      </div>
      <FeaturePageView slug={feature.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(feature)) }} />

      <main id="main" className="flex flex-1 flex-col">
        <section className="px-6 pt-6 pb-14 sm:px-10 md:px-16">
          <div className="mx-auto max-w-5xl">
            <Breadcrumb feature={feature} />
            <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] font-bold text-ink sm:text-6xl">{feature.h1}</h1>
            <p className="mt-5 max-w-2xl font-sans text-lg text-ink/80">{feature.subhead}</p>
            <TrackedLink
              href="/contact"
              event="feature_cta_click"
              eventProps={{ slug: feature.slug, location: "hero" }}
              className="mt-8 inline-block rounded-full bg-saffron px-7 py-3 font-sans text-sm font-medium text-ink transition-colors hover:bg-saffron/90"
            >
              Book a walkthrough
            </TrackedLink>
          </div>
        </section>

        <section aria-labelledby="problem-heading" className="bg-ink px-6 py-14 sm:px-10 md:px-16">
          <div className="mx-auto max-w-5xl">
            <h2 id="problem-heading" className="mb-5 font-mono text-xs tracking-[0.2em] text-saffron uppercase">
              The problem
            </h2>
            <div className="max-w-3xl space-y-4">
              {feature.problem.map((line) => (
                <p key={line} className="font-display text-xl font-bold text-parchment sm:text-2xl">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="does-heading" className="px-6 py-14 sm:px-10 md:px-16">
          <div className="mx-auto max-w-5xl">
            <h2 id="does-heading" className="mb-6 font-display text-3xl font-bold text-ink">
              What it does
            </h2>
            <ul className="grid gap-6 font-sans text-base text-ink md:grid-cols-3">
              {feature.does.map((d) => (
                <li key={d}>
                  <span aria-hidden="true" className="mb-3 block h-1 w-10 rounded-full bg-saffron" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="how-heading" className="border-t border-ink/10 px-6 py-14 sm:px-10 md:px-16">
          <div className="mx-auto max-w-5xl">
            <h2 id="how-heading" className="mb-10 font-display text-3xl font-bold text-ink">
              How it works
            </h2>
            <ol className="space-y-14">
              {feature.steps.map((step, i) => (
                <li key={step.title} className="grid items-center gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10">
                  <div>
                    <p className="mb-2 font-mono text-sm text-preserve-red">Step {i + 1}</p>
                    <h3 className="mb-2 font-display text-2xl font-bold text-ink">{step.title}</h3>
                    <p className="font-sans text-base text-ink/80">{step.body}</p>
                  </div>
                  <AnnotatedFigure figure={step} />
                </li>
              ))}
            </ol>
            {feature.extra && (
              <div className="mt-14 grid items-center gap-6 border-t border-ink/10 pt-14 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10">
                <div>
                  <h3 className="mb-2 font-display text-2xl font-bold text-ink">{feature.extra.title}</h3>
                  <p className="font-sans text-base text-ink/80">{feature.extra.body}</p>
                </div>
                <AnnotatedFigure figure={feature.extra} />
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="helps-heading" className="bg-bay-green px-6 py-14 sm:px-10 md:px-16">
          <div className="mx-auto max-w-5xl">
            <h2 id="helps-heading" className="mb-8 font-display text-3xl font-bold text-parchment">
              How it helps
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-mono text-xs tracking-[0.2em] text-saffron uppercase">For the owner</h3>
                <p className="font-sans text-lg text-parchment">{feature.helps.owner}</p>
              </div>
              <div>
                <h3 className="mb-2 font-mono text-xs tracking-[0.2em] text-saffron uppercase">For the new hire</h3>
                <p className="font-sans text-lg text-parchment">{feature.helps.newHire}</p>
              </div>
            </div>
            {/* TODO: real venue quote. Not rendered until a venue agrees to be named. No invented quotes. */}
            <aside hidden data-todo="venue-quote">
              {feature.quoteSlot}
            </aside>
          </div>
        </section>

        <section aria-labelledby="related-heading" className="px-6 py-14 sm:px-10 md:px-16">
          <div className="mx-auto max-w-5xl">
            <h2 id="related-heading" className="mb-6 font-display text-3xl font-bold text-ink">
              Related features
            </h2>
            <FeatureCards features={related} source="related" />
          </div>
        </section>

        {feature.faq && feature.faq.length > 0 && (
          <section aria-labelledby="faq-heading" className="px-6 pb-14 sm:px-10 md:px-16">
            <div className="mx-auto max-w-3xl">
              <h2 id="faq-heading" className="mb-6 font-display text-3xl font-bold text-ink">
                Questions owners ask
              </h2>
              <div className="space-y-3">
                {feature.faq.map((f) => (
                  <details key={f.q} className="group rounded-2xl border-2 border-clay-brown/40 bg-parchment px-5 py-4 open:border-ink/60">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold text-ink">
                      {f.q}
                      <span aria-hidden="true" className="font-mono text-xl text-preserve-red transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 font-sans text-base text-ink/80">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        <ClosingCta slug={feature.slug} />

        <nav aria-label="Previous and next feature" className="border-t border-ink/10 px-6 py-8 sm:px-10 md:px-16">
          <div className="mx-auto flex max-w-5xl flex-col justify-between gap-4 font-sans sm:flex-row">
            <Link href={`/features/${prev.slug}`} rel="prev" className="group min-h-11 text-ink">
              <span className="block font-mono text-xs tracking-[0.2em] text-clay-brown uppercase">Previous feature</span>
              <span className="font-display text-lg font-bold group-hover:underline">&larr; {prev.name}</span>
            </Link>
            <Link href={`/features/${next.slug}`} rel="next" className="group min-h-11 text-ink sm:text-right">
              <span className="block font-mono text-xs tracking-[0.2em] text-clay-brown uppercase">Next feature</span>
              <span className="font-display text-lg font-bold group-hover:underline">{next.name} &rarr;</span>
            </Link>
          </div>
        </nav>
      </main>
      <SiteFooter />
    </div>
  );
}
