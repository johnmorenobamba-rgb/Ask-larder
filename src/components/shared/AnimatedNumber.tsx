"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

const DEFAULT_DURATION_MS = 900;

function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Block L2 -- shared number-counter roll-up. Counts up from 0 to `value`
 * once `animate` flips true, matching the same on-mount rAF-gated pattern
 * already used by BentoGrid's progress ring (`ringAnimated`) and
 * StaffCompletionList's rings (`entered`) -- callers pass that same gate
 * in here rather than this component inventing a second convention.
 * `prefers-reduced-motion` renders the final value immediately, no count.
 */
export function AnimatedNumber({
  value,
  animate,
  durationMs = DEFAULT_DURATION_MS,
  format,
  className = "",
}: {
  value: number;
  animate: boolean;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      const raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }
    if (!animate) return;

    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(Math.round(value * easeOutQuad(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, value, durationMs, reducedMotion]);

  return <span className={className}>{format ? format(display) : display}</span>;
}
