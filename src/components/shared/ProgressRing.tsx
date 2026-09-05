"use client";

import { useEffect, useState } from "react";
import { AnimatedNumber } from "./AnimatedNumber";

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * The staff dashboard's hero progress ring, extracted out of
 * BentoGrid.tsx so the marketing hero's tablet preview can render the real
 * thing (real ring math, real AnimatedNumber count-up) instead of a
 * redrawn approximation -- same "real components, not redrawn" principle
 * as the Remotion video importing BentoGrid directly. BentoGrid.tsx now
 * imports this too, so there's one implementation, not two.
 *
 * `animate` is optional -- pass it explicitly (as BentoGrid.tsx does, with
 * its own page-wide `ringAnimated` flag) to stay in sync with other
 * AnimatedNumbers on the same screen; omit it for a standalone usage that
 * should just animate in on its own mount.
 */
export function ProgressRing({
  completedCount,
  totalCount,
  animate,
  size = "default",
}: {
  completedCount: number;
  totalCount: number;
  animate?: boolean;
  /** "default" matches the staff dashboard's own sm: breakpoint sizing; "compact" is fixed-size for contexts (e.g. the marketing hero's tablet preview) that can't lean on a sm: breakpoint the same way. */
  size?: "default" | "compact";
}) {
  const [selfAnimated, setSelfAnimated] = useState(false);
  useEffect(() => {
    if (animate !== undefined) return;
    const raf = requestAnimationFrame(() => setSelfAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, [animate]);
  const resolvedAnimate = animate ?? selfAnimated;

  const fraction = totalCount > 0 ? completedCount / totalCount : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - (resolvedAnimate ? fraction : 0));
  const dims = size === "compact" ? "h-20 w-20" : "h-32 w-32 sm:h-44 sm:w-44";
  const numberSize = size === "compact" ? "text-base" : "text-2xl sm:text-3xl";

  return (
    <div className={`relative flex items-center justify-center ${dims}`}>
      <svg className={`-rotate-90 ${dims}`} viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={RING_RADIUS} fill="none" stroke="var(--color-clay-brown)" strokeOpacity="0.2" strokeWidth="8" />
        <circle
          cx="64"
          cy="64"
          r={RING_RADIUS}
          fill="none"
          stroke="var(--color-bay-green)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={ringOffset}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <span className={`absolute font-display font-bold text-ink ${numberSize}`}>
        <AnimatedNumber value={completedCount} animate={resolvedAnimate} /> of{" "}
        <AnimatedNumber value={totalCount} animate={resolvedAnimate} />
      </span>
    </div>
  );
}
