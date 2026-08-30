"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

const TRACE_FRACTION = 0.3;
const TRACE_LOOP_MS = 900;

// Same circle+ribbon glyph used for certificates elsewhere in the owner
// dashboard (OwnerDashboardBoard.tsx's CertGlyph) -- reusing the shape
// keeps this visually tied to "certificate," not an arbitrary ring.
const CIRCLE_R = 6;
const RIBBON_PATH = "M9 15.5L7.5 21l4.5-2 4.5 2-1.5-5.5";

/**
 * Block L9 -- a bespoke "verifying/syncing" motif for in-flight save
 * operations (cert upload), standing in for a generic spinner. Uses the
 * exact same technique as ChitMark's idle traveling-glow trace (measure
 * real path length, animate a short glowing dash segment around it via
 * WAAPI) applied to the certificate glyph's own outline -- a genuine
 * extension of this app's one signature motion idiom, not a borrowed
 * spinner style or decorative shimmer.
 */
export function SyncingIndicator({ size = 20, color = "var(--color-parchment)" }: { size?: number; color?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const [pathLength, setPathLength] = useState(0);
  const circleRef = useRef<SVGCircleElement | null>(null);

  const measureRef = useCallback((el: SVGCircleElement | null) => {
    circleRef.current = el;
    if (el) setPathLength(el.getTotalLength());
  }, []);

  useEffect(() => {
    const el = circleRef.current;
    if (!el || pathLength === 0 || reducedMotion) return;

    const segment = pathLength * TRACE_FRACTION;
    el.style.strokeDasharray = `${segment} ${pathLength - segment}`;
    const animation = el.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -pathLength }], {
      duration: TRACE_LOOP_MS,
      iterations: Infinity,
      easing: "linear",
    });
    return () => animation.cancel();
  }, [pathLength, reducedMotion]);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label="Saving">
      <circle cx="12" cy="10" r={CIRCLE_R} stroke={color} strokeOpacity="0.3" strokeWidth="1.5" />
      <circle ref={measureRef} cx="12" cy="10" r={CIRCLE_R} stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d={RIBBON_PATH} stroke={color} strokeOpacity="0.3" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
