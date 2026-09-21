"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ElevatedCell } from "@/components/shared/ElevatedCell";

/**
 * Featured-capability section for the suggestion assistant, added after
 * the real 22 Sep 2026 demonstration on coachmans-arms-wizard (Decision
 * Log, same date). Placed after HowItWorksSection and before the final
 * CTA -- a "here's what happens after go-live" capstone, not another
 * feature-grid tile. Uses saffron as its accent, the one glow color not
 * already claimed by an adjacent section (bay-green/FeatureGuideStrip,
 * preserve-red/ProblemSolution, ink+saffron/Compliance -- not adjacent to
 * this one -- clay-brown/HowItWorks).
 *
 * Copy is built only from what the real seeded run actually demonstrated
 * (see the Decision Log entry): draft-only, evidence-backed, the same
 * approval gate as any other AI content, real signals that sometimes
 * don't cluster into anything at all. No invented numbers.
 */
export function SuggestionAssistantSection() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-parchment px-6 py-24 sm:px-10 md:px-16">
      <div ref={ref} className="mx-auto max-w-5xl">
        <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.2em] text-clay-brown">
          Always paying attention
        </p>
        <h2 className="mb-2 text-center font-display text-3xl font-bold text-ink sm:text-4xl">
          Larder notices what your SOPs missed.
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center font-sans text-ink/70">
          When staff keep asking Ask Larder the same uncovered question, or the same hazard keeps turning up in
          near-miss reports, Larder drafts a real addition to the right module, quoting exactly who said what.
          You approve it or dismiss it, the same review every other module already goes through. Nothing reaches
          staff on its own.
        </p>
        <div
          className="transition-all duration-500 ease-out motion-reduce:transition-none"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
          }}
        >
          <ElevatedCell depth="hero" glowColor="var(--color-saffron)" className="overflow-hidden rounded-3xl bg-parchment">
            <Image
              src="/images/marketing/suggestion-assistant-feed.png"
              alt="A real Larder suggestion, drafted from staff near-miss reports, with Approve and Dismiss buttons"
              width={1000}
              height={900}
              loading="eager"
              className="w-full"
            />
          </ElevatedCell>
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center font-sans text-sm text-ink/60">
          A real draft, from a real venue: three staff reported broken glass near the bar, worded differently each
          time, and Larder proposed a real addition to Workplace health &amp; safety, evidence attached. If nothing
          genuinely fits an existing module, Larder says so plainly instead of guessing.
        </p>
      </div>
    </section>
  );
}
