"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { ChitMark } from "@/components/shared/ChitMark";

export type HeroBentoPreviewHandle = {
  cardEls: [unknown, unknown, unknown, unknown, unknown]; // greeting / progress / continue / certificates / ask-larder, diagonal fall order
};

/**
 * Block N2 — the 5-cell bento preview that cascades onto the tablet screen,
 * mirroring the real product's actual composition (src/components/staff/BentoGrid.tsx
 * — a full-width greeting bar + a progress ring + continue/certificates/
 * ask-larder cells), with placeholder marketing copy, not real user data.
 *
 * Plain divs, not ElevatedCell/useTiltSpotlight — that hook writes
 * `transform` imperatively via a CSS custom property on the element's own
 * inline style; a GSAP tween setting `transform` on the same node would
 * stomp it, and no pointer/hover interaction is needed for a scroll-scrubbed
 * preview anyway. heroTimeline.ts drives each card's fall via a single
 * `.fromTo()` (not `gsap.set()` + `.to()`) so a page load that jumps
 * straight to some mid-scroll progress still renders the correct
 * in-between state.
 */
export const HeroBentoPreview = forwardRef<HeroBentoPreviewHandle, object>(function HeroBentoPreview(
  _props,
  forwardedRef,
) {
    const reducedMotion = usePrefersReducedMotion();
    const greetingRef = useRef<HTMLDivElement | null>(null);
    const progressRef = useRef<HTMLDivElement | null>(null);
    const continueRef = useRef<HTMLDivElement | null>(null);
    const certificatesRef = useRef<HTMLDivElement | null>(null);
    const askLarderRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(
      forwardedRef,
      () => ({
        get cardEls() {
          return [
            greetingRef.current,
            progressRef.current,
            continueRef.current,
            certificatesRef.current,
            askLarderRef.current,
          ] as [unknown, unknown, unknown, unknown, unknown];
        },
      }),
      [],
    );

    const cardClass = reducedMotion ? "" : "opacity-0";

    return (
      <div
        className="grid h-full w-full grid-cols-2 gap-[3%] p-[4%]"
        style={{ transformStyle: "preserve-3d" }}
        data-hero-bento-preview
      >
        <div
          ref={greetingRef}
          data-hero-card="greeting"
          className={`col-span-2 flex items-center rounded-md bg-ink px-[4%] py-[3%] ${cardClass}`}
        >
          <p className="font-display text-[7px] font-bold text-parchment sm:text-[9px]">Morning, Alex.</p>
        </div>
        <div
          ref={progressRef}
          data-hero-card="progress"
          className={`flex flex-col items-center justify-center gap-1 rounded-md bg-parchment ${cardClass}`}
        >
          <div className="h-4 w-4 rounded-full border-2 border-bay-green sm:h-5 sm:w-5" />
          <p className="font-mono text-[5px] text-clay-brown sm:text-[6px]">6 of 10</p>
        </div>
        <div
          ref={continueRef}
          data-hero-card="continue"
          className={`flex flex-col justify-center gap-0.5 rounded-md bg-parchment px-[6%] ${cardClass}`}
        >
          <p className="font-display text-[6px] font-bold text-ink sm:text-[7px]">Bar setup</p>
          <div className="h-0.5 w-2/3 rounded-full bg-clay-brown/30 sm:h-1" />
        </div>
        <div
          ref={certificatesRef}
          data-hero-card="certificates"
          className={`flex flex-col justify-center gap-0.5 rounded-md bg-parchment px-[6%] ${cardClass}`}
        >
          <p className="font-mono text-[5px] tracking-wide text-clay-brown uppercase sm:text-[6px]">Certificates</p>
          <p className="font-sans text-[6px] text-bay-green sm:text-[7px]">All valid</p>
        </div>
        <div
          ref={askLarderRef}
          data-hero-card="ask-larder"
          className={`flex flex-col items-center justify-center gap-1 rounded-md bg-ink ${cardClass}`}
        >
          <ChitMark size={14} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" />
          <p className="font-sans text-[5px] text-parchment sm:text-[6px]">Ask something.</p>
        </div>
      </div>
    );
  },
);

