import Link from "next/link";
import { FEATURES } from "@/data/features";

/** Persistent "All features" navigation on every feature page. Scrolls sideways on a phone, so nothing hides behind a menu. */
export function AllFeaturesStrip({ current }: { current: string }) {
  return (
    <nav aria-label="All features" className="border-b border-ink/10 bg-parchment">
      <ul className="flex gap-2 overflow-x-auto px-4 py-2 sm:px-10 md:px-16 [scrollbar-width:thin]">
        {FEATURES.map((f) => {
          const isCurrent = f.slug === current;
          return (
            <li key={f.slug} className="shrink-0">
              <Link
                href={`/features/${f.slug}`}
                aria-current={isCurrent ? "page" : undefined}
                className={
                  isCurrent
                    ? "inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-sans text-sm font-medium text-parchment"
                    : "inline-flex min-h-11 items-center rounded-full border border-ink/20 px-4 font-sans text-sm text-ink hover:bg-ink/5"
                }
              >
                {f.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
