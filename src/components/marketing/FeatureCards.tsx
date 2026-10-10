import type { Feature } from "@/data/features";
import { FeatureIcon } from "./FeatureIcon";
import { TrackedLink } from "./TrackedLink";

/**
 * Feature cards as a list. The heading is the one real link and a ::after pseudo element stretches it over the whole card,
 * so the card is one tap target with one tab stop. The visible arrow line repeats the link's purpose for sighted visitors, and
 * the link also carries it as hidden text, so its name is never a bare "Learn more".
 */
export function FeatureCards({
  features,
  source,
  headingLevel = 3,
}: {
  features: Feature[];
  source: "hub" | "related";
  headingLevel?: 2 | 3;
}) {
  const H = `h${headingLevel}` as "h2" | "h3";
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f) => (
        <li
          key={f.slug}
          className="group relative flex flex-col gap-3 rounded-2xl border-2 border-ink/15 bg-parchment px-5 py-6 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-ink/50 hover:shadow-[0_14px_30px_-18px_rgba(31,27,22,0.5)] focus-within:border-ink focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-saffron motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <div className="text-bay-green">
            <FeatureIcon name={f.icon} />
          </div>
          <H className="font-display text-xl font-bold text-ink">
            <TrackedLink
              href={`/features/${f.slug}`}
              event="hub_feature_card_click"
              eventProps={{ slug: f.slug, source }}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl"
            >
              {f.card.title}
              <span className="sr-only">. {f.card.linkText}</span>
            </TrackedLink>
          </H>
          <p className="font-sans text-sm text-ink/75">{f.card.body}</p>
          <p aria-hidden="true" className="mt-auto pt-2 font-sans text-sm font-medium text-preserve-red">
            {f.card.linkText}{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transition-none">&rarr;</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
