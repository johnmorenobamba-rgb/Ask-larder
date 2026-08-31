"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { ChitMark } from "@/components/shared/ChitMark";
import { LARDER_MARK_PATH } from "@/components/shared/LarderMark";

export type HeroSplashPreviewHandle = {
  rawGroupEl: HTMLDivElement | null;
  idleGroupEl: HTMLDivElement | null;
  traceEl: SVGPathElement | null;
  fillEl: SVGPathElement | null;
  wordmarkEl: HTMLSpanElement | null;
};

/**
 * Block N2 — replays the cold-load splash's beats (draw -> settle ->
 * wordmark stagger) inside the tablet's screen, scrubbed to scroll by
 * heroTimeline.ts's master timeline via
 * splashTimeline.ts's buildScrubSafeSplashPreviewTimeline — a
 * scrub-compatible re-authoring of the same story using only plain
 * properties (strokeDashoffset/strokeWidth/opacity), not the real splash's
 * DrawSVG/MorphSVG tweens, which were confirmed (via isolated repro) to
 * never apply when scrubbed via `.progress()` rather than played normally.
 *

 * Both the raw trace/fill/wordmark SVG group AND a plain idle `<ChitMark>`
 * are permanently mounted (the idle one starts at opacity 0) — a deliberate
 * departure from SplashSequence.tsx's own hand-off, which unmounts the raw
 * SVG for a plain ChitMark via React state on a one-shot `onComplete`. That
 * works for a splash that only ever plays forward once; nested in a
 * bidirectionally-scrubbed timeline it would remount/unmount (with the
 * idle ChitMark's own internal GSAP loop) on every scroll direction change
 * across the boundary. heroTimeline.ts instead crossfades opacity between
 * the two groups via its own tween appended right after this component's
 * exposed refs finish their nested splash timeline — same end visual,
 * scrub-safe mechanism.
 */
export const HeroSplashPreview = forwardRef<HeroSplashPreviewHandle, { size?: number }>(function HeroSplashPreview(
  { size = 40 },
  forwardedRef,
) {
  const reducedMotion = usePrefersReducedMotion();
  const rawGroupRef = useRef<HTMLDivElement | null>(null);
  const idleGroupRef = useRef<HTMLDivElement | null>(null);
  const traceRef = useRef<SVGPathElement | null>(null);
  const fillRef = useRef<SVGPathElement | null>(null);
  const wordmarkRef = useRef<HTMLSpanElement | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      get rawGroupEl() {
        return rawGroupRef.current;
      },
      get idleGroupEl() {
        return idleGroupRef.current;
      },
      get traceEl() {
        return traceRef.current;
      },
      get fillEl() {
        return fillRef.current;
      },
      get wordmarkEl() {
        return wordmarkRef.current;
      },
    }),
    [],
  );

  if (reducedMotion) {
    return (
      <div className="flex flex-col items-center gap-2">
        <ChitMark size={size} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" />
        <span className="font-display text-sm font-bold text-parchment">Larder</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div ref={rawGroupRef} data-hero-splash-trace className="flex flex-col items-center gap-2">
        <svg width={size} height={size} viewBox="0 0 72 72" role="img" aria-label="Larder">
          <path ref={fillRef} d={LARDER_MARK_PATH} fill="var(--color-parchment)" opacity={0} />
          <path
            ref={traceRef}
            d={LARDER_MARK_PATH}
            fill="none"
            stroke="var(--color-saffron)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </svg>
        <span ref={wordmarkRef} className="font-display text-sm font-bold text-parchment" style={{ opacity: 0 }}>
          Larder
        </span>
      </div>
      <div
        ref={idleGroupRef}
        data-hero-splash-idle
        className="absolute inset-0 flex flex-col items-center gap-2"
        style={{ opacity: 0 }}
      >
        <ChitMark size={size} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" />
        <span className="font-display text-sm font-bold text-parchment">Larder</span>
      </div>
    </div>
  );
});
