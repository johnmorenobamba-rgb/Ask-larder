"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { ChitMark } from "./ChitMark";
import { LARDER_MARK_PATH, LARDER_MARK_PATH_BOLD } from "./LarderMark";

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

    const split = new SplitText(wordmarkEl, { type: "chars" });
    gsap.set(split.chars, { opacity: 0, y: 8 });
    gsap.set(wordmarkEl, { opacity: 1 });

    const tl = gsap.timeline({
      onComplete: () => setSettled(true),
    });

    // Beats after "wordmark" are positioned relative to the wordmark
    // tween's OWN end (not a guessed hold duration) so unsettle can never
    // cut in before every character has actually finished staggering in --
    // that overlap (fixed here) was why the wordmark barely read before
    // the mark started settling back down. "legible" adds a real still
    // beat where the full wordmark sits static before unsettling.
    const wordmarkCharCount = split.chars.length;
    const wordmarkDuration = 0.55;
    const wordmarkStagger = 0.055;
    const wordmarkSpan = wordmarkDuration + wordmarkStagger * Math.max(0, wordmarkCharCount - 1);

    tl.addLabel("draw")
      .to(trace, { drawSVG: "100%", duration: 0.5, ease: "power2.out" }, "draw")
      .addLabel("settle")
      .to(trace, { morphSVG: LARDER_MARK_PATH_BOLD, strokeWidth: 5, duration: 0.2, ease: "power2.out" }, "settle")
      .to(fillEl, { opacity: 1, duration: 0.2 }, "settle")
      .addLabel("wordmark", "settle+=0.35")
      .to(
        split.chars,
        { opacity: 1, y: 0, duration: wordmarkDuration, ease: "back.out(1.9)", stagger: wordmarkStagger },
        "wordmark",
      )
      .addLabel("legible", `wordmark+=${wordmarkSpan + 0.25}`)
      .to(trace, { morphSVG: LARDER_MARK_PATH, strokeWidth: 3, duration: 0.2, ease: "power2.inOut" }, "legible")
      .to(fillEl, { opacity: 0, duration: 0.2 }, "legible");

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
