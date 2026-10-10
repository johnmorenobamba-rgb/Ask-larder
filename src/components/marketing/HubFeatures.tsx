import { FEATURES } from "@/data/features";
import { FeatureCards } from "./FeatureCards";

/** The hub's one feature section: a leading line that names the destination, then one card per feature page. */
export function HubFeatures() {
  return (
    <section id="features" aria-labelledby="features-lead" className="bg-parchment px-6 py-16 sm:px-10 md:py-24 md:px-16">
      <div className="mx-auto max-w-6xl">
        <h2 id="features-lead" className="mb-8 max-w-2xl font-display text-3xl font-bold text-ink sm:text-4xl">
          Tap a feature to see how it works on your floor.
        </h2>
        <FeatureCards features={FEATURES} source="hub" />
      </div>
    </section>
  );
}
