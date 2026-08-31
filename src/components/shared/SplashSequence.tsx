"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { ChitMark } from "./ChitMark";
import { LARDER_MARK_PATH } from "./LarderMark";
import { buildSplashTimeline } from "./splashTimeline";

gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, SplitText);

// Matches SplashScreen's original glow sizing (2.6x the icon) -- a pure
// radial-gradient with no shape to trace, so it never reads as a container
// behind the mark (see ChitMark.tsx's doc comment for why drop-shadow was
// rejected for this same reason).
const GLOW_SIZE_RATIO = 2.6;

/**
 * Block L5 -- the splash's cold-load entrance, rebuilt as one coordinated
 * `gsap.timeline()`. Replaces J4's CSS-keyframe wordmark + ChitMark's
 * `animateIn`/`intensity="hero"` draw-in for this one call site only --
 * ChitMark itself (dashboard tile, floating bubble) is untouched, and once
 * this timeline completes it hands off to a plain, already-idle <ChitMark>
 * so the shared WAAPI traveling-glow trace takes over rather than this
 * component reimplementing it. J4's trigger logic (once/day, never on
 * internal nav) lives entirely in SplashScreen.tsx and isn't touched here.
 *
 * Beats are declared as timeline positions relative to each other (labels /
 * `"<"` `"-=n"` offsets), not independently hand-computed millisecond
 * delays -- draw-in and the wordmark's character stagger both hang off the
 * same timeline, so retiming one beat can't silently desync the other the
 * way two separate CSS animations with their own delays could.
 *
 * Block N2 -- the actual tween construction now lives in
 * buildSplashTimeline() (./splashTimeline.ts), extracted so the marketing
 * hero's tablet-screen preview can scrub the exact same beats instead of
 * autoplaying them. This component's own call site is a pure relocation --
 * same tweens, same autoplay, same onComplete-driven hand-off to a plain
 * idle ChitMark below.
 */
export function SplashSequence({
  size,
  fillColor,
  traceColor,
  wordmark = "Larder",
}: {
  size: number;
  fillColor: string;
  traceColor: string;
  wordmark?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [settled, setSettled] = useState(false);
  const traceRef = useRef<SVGPathElement | null>(null);
  const fillRef = useRef<SVGPathElement | null>(null);
  const wordmarkRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      const raf = requestAnimationFrame(() => setSettled(true));
      return () => cancelAnimationFrame(raf);
    }
    const trace = traceRef.current;
    const fillEl = fillRef.current;
    const wordmarkEl = wordmarkRef.current;
    if (!trace || !fillEl || !wordmarkEl) return;

    const { timeline: tl, split } = buildSplashTimeline(
      gsap,
      SplitText,
      { traceEl: trace, fillEl, wordmarkEl },
      { onComplete: () => setSettled(true) },
    );

    return () => {
      tl.kill();
      split.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot entrance, deliberately runs once on mount (see ChitMark's own animateIn effect for the same pattern/reasoning)
  }, []);

  const glowSize = size * GLOW_SIZE_RATIO;

  return (
    <div className="relative flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            width: glowSize,
            height: glowSize,
            background:
              "radial-gradient(circle, rgba(232,169,59,0.55) 0%, rgba(232,169,59,0.26) 30%, rgba(232,169,59,0) 62%)",
          }}
        />
        {settled ? (
          <ChitMark size={size} fillColor={fillColor} traceColor={traceColor} />
        ) : (
          <svg width={size} height={size} viewBox="0 0 72 72" role="img" aria-label="Larder">
            <path ref={fillRef} d={LARDER_MARK_PATH} fill={fillColor} opacity={0} />
            <path
              ref={traceRef}
              d={LARDER_MARK_PATH}
              fill="none"
              stroke={traceColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      <span aria-label={wordmark} className="font-display text-2xl font-bold text-parchment">
        <span ref={wordmarkRef} aria-hidden="true" className={reducedMotion ? "" : "opacity-0"}>
          {wordmark}
        </span>
      </span>
    </div>
  );
}
