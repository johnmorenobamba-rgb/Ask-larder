"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { ChitMark } from "./ChitMark";

gsap.registerPlugin(SplitText);

// Punchier, more saturated than the Branding Kit's flat swatches -- at low
// opacity behind a small icon, the flat Saffron read as barely-there.
const GLOW_SIZE_RATIO = 2.6;
const WORDMARK_DELAY_S = 0.75;
const WORDMARK_DURATION = 0.55;
const WORDMARK_STAGGER = 0.055;

/**
 * Splash rebuild, 5 Sep 2026 (Notion, Splash & Animated Logo spec):
 * previously DrawSVG/MorphSVG-traced its own private copy of the mark
 * before handing off to a plain idle ChitMark once settled -- two separate
 * implementations of "the mark tracing with a glow" that could drift apart.
 * Now just renders ChitMark directly with its own `animateIn` +
 * `intensity="hero"` reveal, which was already built to cover exactly this
 * kind of one-time cold-load moment (see ChitMark.tsx's own doc comment:
 * "the prop stays for any future non-splash reveal use"). One
 * implementation, reused, not redrawn -- same principle as the Remotion
 * video importing the real dashboard components instead of a mockup.
 *
 * Only the wordmark's character-stagger reveal is still hand-built here
 * (unchanged from before -- SplitText, same duration/stagger/ease), timed
 * via its own small delayed timeline rather than sharing one master
 * timeline with the mark, since there's no longer a trace/fill tween on
 * this component's own elements to hang shared labels off of.
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
  const wordmarkRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const wordmarkEl = wordmarkRef.current;
    if (!wordmarkEl) return;

    const split = new SplitText(wordmarkEl, { type: "chars" });
    gsap.set(split.chars, { opacity: 0, y: 8 });
    gsap.set(wordmarkEl, { opacity: 1 });

    const tl = gsap.timeline({ delay: WORDMARK_DELAY_S });
    tl.to(split.chars, {
      opacity: 1,
      y: 0,
      duration: WORDMARK_DURATION,
      ease: "back.out(1.9)",
      stagger: WORDMARK_STAGGER,
    });

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
        <ChitMark size={size} fillColor={fillColor} traceColor={traceColor} animateIn intensity="hero" />
      </div>
      <span aria-label={wordmark} className="font-display text-2xl font-bold text-parchment">
        <span ref={wordmarkRef} aria-hidden="true" className={reducedMotion ? "" : "opacity-0"}>
          {wordmark}
        </span>
      </span>
    </div>
  );
}
