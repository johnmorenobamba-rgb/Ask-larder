"use client";

import { useEffect, useRef, useState } from "react";

// Simple line-icon glyphs matching the Branding Kit's custom-icon rule (no
// stock icon library) — same 24x24/1.5-stroke language as StationGlyph in
// BentoGrid.tsx, kept intentionally minimal since these render small.
function DocumentGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3.5h9l3 3v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 12h7M8.5 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function BadgeGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="m8.5 15-1.5 6 5-2 5 2-1.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChatGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4 4v-4H6a2 2 0 0 1-2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function DashboardGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const FEATURES = [
  {
    glyph: DocumentGlyph,
    title: "Built from your own SOPs",
    body: "Modules are structured from the way your venue already works, not a generic course.",
  },
  {
    glyph: BadgeGlyph,
    title: "Certs tracked automatically",
    body: "RSA, food handling, first aid, WWCC — expiry nudges before they lapse.",
  },
  {
    glyph: ChatGlyph,
    title: "Ask Larder, on shift",
    body: "Staff get answers grounded in your venue's own approved content — nothing else.",
  },
  {
    glyph: DashboardGlyph,
    title: "See it from the owner side",
    body: "Completion, certificates, and escalations in one dashboard.",
  },
];

/**
 * Block N2 — the quick feature guide shown once the pinned hero releases.
 * Plain scroll-into-view fade-up (IntersectionObserver), not GSAP — this
 * section doesn't need the hero's scrub machinery, just a light reveal.
 */
export function FeatureGuideStrip() {
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
    <section id="feature-guide" className="bg-parchment px-6 py-24 sm:px-10 md:px-16">
      <div ref={ref} className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="transition-all duration-500 ease-out motion-reduce:transition-none"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(16px)",
                transitionDelay: visible ? `${i * 90}ms` : "0ms",
              }}
            >
              <div className="text-preserve-red">
                <f.glyph />
              </div>
              <p className="font-display mt-3 text-lg font-bold text-ink">{f.title}</p>
              <p className="mt-1 text-sm text-ink/70">{f.body}</p>
            </div>
          ))}
        </div>

        <div id="contact" className="mt-20 border-t border-ink/10 pt-12 text-center">
          <p className="font-display text-2xl font-bold text-ink">Want to see it on your own venue?</p>
          <p className="mt-2 text-ink/70">Book a walkthrough — we&apos;ll bring your own SOPs into it.</p>
          <a
            href="mailto:hello@asklarder.com.au?subject=Book%20a%20walkthrough"
            className="mt-6 inline-block rounded-full bg-ink px-7 py-3 font-sans text-sm font-medium text-parchment transition-colors hover:bg-ink/90"
          >
            Book a walkthrough
          </a>
        </div>
      </div>
    </section>
  );
}
