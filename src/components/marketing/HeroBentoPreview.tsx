"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

export type HeroBentoPreviewHandle = {
  cardEls: [unknown, unknown, unknown, unknown, unknown]; // ask-larder / trained-on-sops / certificates / scan-station / owner-strip, fall order
};

// Tiny line-icon glyphs, same 1.5-stroke custom language as
// FeatureGuideStrip/BentoGrid's StationGlyph — sized down for this preview's
// much smaller scale, not a separate icon system.
function DocumentGlyph({ className = "" }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M6 3.5h9l3 3v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8.5 12h7M8.5 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function BadgeGlyph({ className = "" }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="m8.5 15-1.5 6 5-2 5 2-1.5-6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
function QrGlyph({ className = "" }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" />
      <rect x="15" y="15" width="4" height="4" fill="currentColor" />
    </svg>
  );
}
function DashboardGlyph({ className = "" }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3.5" y="3.5" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**
 * Block N2 (31 Aug 2026 feedback round) — the bento preview that cascades
 * onto the tablet screen, rebuilt from a uniform 2x2 grid of near-identical
 * cells into a genuinely varied composition: one large hero cell plus a
 * wide cell, two small cells, and a full-width strip, each carrying a
 * distinct color from the full locked palette (not just Ink/Parchment) and
 * REAL Ask Larder storytelling — what the product actually does — instead
 * of generic dashboard-preview copy. Mirrors the reference "Bento 2.0"
 * composition's size/color variety, applied to the actual product's own
 * differentiators (own-SOPs training, automatic cert tracking, Ask Larder
 * chat, station QR entry, owner visibility) rather than invented content.
 *
 * Plain divs, not ElevatedCell/useTiltSpotlight — see heroTimeline.ts's own
 * doc comment for why (that hook's imperative `transform` writes would
 * conflict with GSAP's own transform tween on the same node).
 */
export const HeroBentoPreview = forwardRef<HeroBentoPreviewHandle, object>(function HeroBentoPreview(
  _props,
  forwardedRef,
) {
  const reducedMotion = usePrefersReducedMotion();
  const askLarderRef = useRef<HTMLDivElement | null>(null);
  const trainedRef = useRef<HTMLDivElement | null>(null);
  const certificatesRef = useRef<HTMLDivElement | null>(null);
  const scanRef = useRef<HTMLDivElement | null>(null);
  const ownerRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      get cardEls() {
        return [askLarderRef.current, trainedRef.current, certificatesRef.current, scanRef.current, ownerRef.current] as [
          unknown,
          unknown,
          unknown,
          unknown,
          unknown,
        ];
      },
    }),
    [],
  );

  const cardClass = reducedMotion ? "" : "opacity-0";

  return (
    <div
      className="grid h-full w-full grid-cols-4 grid-rows-3 gap-[3%] p-[4%]"
      style={{ transformStyle: "preserve-3d" }}
      data-hero-bento-preview
    >
      {/* Hero cell — Ask Larder chat, the flagship differentiator */}
      <div
        ref={askLarderRef}
        data-hero-card="ask-larder"
        className={`col-span-2 row-span-2 flex flex-col justify-between rounded-md bg-ink p-[6%] ${cardClass}`}
      >
        <div className="flex flex-col gap-1">
          <div className="self-start rounded-md rounded-bl-none bg-parchment/15 px-[8%] py-[4%]">
            <p className="font-sans text-[6px] text-parchment sm:text-[7px]">Walk-in temp range?</p>
          </div>
          <div className="self-end rounded-md rounded-br-none bg-saffron px-[8%] py-[4%]">
            <p className="font-sans text-[6px] font-medium text-ink sm:text-[7px]">1–4°C. Logged.</p>
          </div>
        </div>
        <p className="font-mono text-[5px] tracking-wide text-parchment/60 uppercase sm:text-[6px]">Ask Larder</p>
      </div>

      {/* Wide cell — trained on your own SOPs */}
      <div
        ref={trainedRef}
        data-hero-card="trained-on-sops"
        className={`col-span-2 row-span-1 flex flex-col justify-center gap-1 rounded-md bg-clay-brown px-[6%] ${cardClass}`}
      >
        <DocumentGlyph className="text-parchment" />
        <p className="font-display text-[6px] font-bold text-parchment sm:text-[7px]">Built from your own SOPs</p>
      </div>

      {/* Small cell — certificate tracking (urgency color, deliberately) */}
      <div
        ref={certificatesRef}
        data-hero-card="certificates"
        className={`col-span-1 row-span-1 flex flex-col justify-center gap-0.5 rounded-md bg-preserve-red px-[6%] ${cardClass}`}
      >
        <BadgeGlyph className="text-parchment" />
        <p className="font-sans text-[5px] font-medium text-parchment sm:text-[6px]">RSA · 12d</p>
      </div>

      {/* Small cell — station QR entry */}
      <div
        ref={scanRef}
        data-hero-card="scan-station"
        className={`col-span-1 row-span-1 flex flex-col justify-center gap-0.5 rounded-md bg-bay-green px-[6%] ${cardClass}`}
      >
        <QrGlyph className="text-parchment" />
        <p className="font-sans text-[5px] font-medium text-parchment sm:text-[6px]">Scan at station</p>
      </div>

      {/* Full-width strip — owner visibility */}
      <div
        ref={ownerRef}
        data-hero-card="owner-strip"
        className={`col-span-4 row-span-1 flex items-center gap-2 rounded-md bg-saffron px-[4%] ${cardClass}`}
      >
        <DashboardGlyph className="text-ink" />
        <p className="font-sans text-[6px] font-medium text-ink sm:text-[7px]">8 of 10 staff trained</p>
      </div>
    </div>
  );
});
