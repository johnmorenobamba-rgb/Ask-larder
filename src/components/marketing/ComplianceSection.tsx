"use client";

import { useEffect, useRef, useState } from "react";
import { ChitMark } from "@/components/shared/ChitMark";

/**
 * Block N4 — the locked FSANZ 3.2.2A compliance hook (Marketing Strategy,
 * Decision Log 24 Aug 2026: "lead with FSANZ Standard 3.2.2A, not a
 * liability-protection pitch"). Leads with the product's own positioning
 * ("trained on your own way of doing things"), then the real, named,
 * verifiable standard -- never framed as protection from lawsuits, which
 * was explicitly rejected as legally weak (AU WHS law assesses whether
 * training was adequate, not merely acknowledged).
 *
 * Creative pass (6 Sep 2026): same scroll-reveal fade-up as the sections
 * either side of it. Stays one cohesive statement rather than a grid of
 * cards (ElevatedCell's glow language was built for parchment cells, not
 * another dark-on-dark surface) -- instead gets a large, low-opacity
 * ChitMark bleeding in from the edge as a background watermark, the exact
 * technique SiteFooter.tsx already uses, reused rather than invented
 * fresh. The Stamp component is deliberately NOT used here -- it stays
 * locked to its three trust moments (module completion, cert
 * verification, e-signature), and this isn't one of them.
 */
export function ComplianceSection() {
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
    <section className="relative overflow-hidden bg-ink px-6 py-24 sm:px-10 md:px-16">
      <div className="pointer-events-none absolute -left-16 -top-16 opacity-25" aria-hidden="true">
        <ChitMark size={280} traceColor="var(--color-saffron)" fillColor="var(--color-parchment)" />
      </div>
      <div
        ref={ref}
        className="relative z-10 mx-auto max-w-3xl text-center transition-all duration-700 ease-out motion-reduce:transition-none"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
        }}
      >
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-saffron">Compliance, built in</p>
        <h2 className="mb-6 font-display text-3xl font-bold text-parchment sm:text-4xl">
          Trained on your own way of doing things. Compliant with the rules that actually apply.
        </h2>
        <p className="mx-auto max-w-2xl font-sans text-lg text-parchment/80">
          Since December 2023, Standard 3.2.2A of the Food Standards Code has required a trained food safety
          supervisor and trained food handlers in every food business in Australia, enforced by your state and
          territory food authority. Ask Larder builds that training into the same modules your staff already use for
          everything else, so it happens as a normal part of onboarding, not a separate box to tick.
        </p>
      </div>
    </section>
  );
}
