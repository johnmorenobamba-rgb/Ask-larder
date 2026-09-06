"use client";

import { useEffect, useRef, useState } from "react";
import { ElevatedCell } from "@/components/shared/ElevatedCell";

const STEPS = [
  {
    number: "01",
    title: "Walkthrough",
    body: "We visit your venue, walk your stations, and collect your SOPs, photos, and the way your staff actually do the job.",
  },
  {
    number: "02",
    title: "Build",
    body: "We turn what we collected into training modules. AI assisted for speed, then edited by hand before you ever see them.",
  },
  {
    number: "03",
    title: "Approve",
    body: "You review every module and approve it before it goes live. Nothing reaches staff without your sign off, because the liability stays with your business.",
  },
  {
    number: "04",
    title: "Live",
    body: "Staff onboard on your venue's own iPad. Ask Larder answers questions from your approved content only, nothing else.",
  },
];

/**
 * Block N4 — How it works. The real done for you service model, set
 * against the explicit "not self serve" expectation the Build Manual
 * calls out by name. Numbered steps are a genuine sequence here (the
 * Branding Kit's own carve-out for the general no-numbered-markers rule),
 * not decoration.
 *
 * Creative pass (6 Sep 2026): same scroll-reveal pattern as
 * ProblemSolutionSection.tsx, each step wrapped in a real ElevatedCell
 * instead of bare text in a column.
 */
export function HowItWorksSection() {
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
        <p className="mb-3 text-center font-mono text-xs uppercase tracking-[0.2em] text-clay-brown">How it works</p>
        <h2 className="mb-2 text-center font-display text-3xl font-bold text-ink sm:text-4xl">
          A done for you service, not a shelf of settings.
        </h2>
        <p className="mb-12 text-center font-sans text-ink/70">
          You don&apos;t build modules yourself. We do, starting with one visit to your venue.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="transition-all duration-500 ease-out motion-reduce:transition-none"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(16px)",
                transitionDelay: visible ? `${i * 90}ms` : "0ms",
              }}
            >
              <ElevatedCell depth="secondary" glowColor="var(--color-clay-brown)" className="h-full rounded-2xl bg-parchment">
                <div className="flex h-full flex-col gap-2 px-5 py-6">
                  <p className="font-mono text-sm text-preserve-red">{step.number}</p>
                  <p className="font-display text-lg font-bold text-ink">{step.title}</p>
                  <p className="font-sans text-sm text-ink/70">{step.body}</p>
                </div>
              </ElevatedCell>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
