"use client";

import { useCallback, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { LARDER_MARK_PATH } from "./LarderMark";

/**
 * Ask Larder's "generating a response" loading state -- a real
 * stroke-dasharray line trace of the chit mark (draws in, draws back out,
 * loops), not a generic spinner. A different animation from ChitMark's
 * idle traveling-glow trace: this one has a clear draw/undraw beat suited
 * to a genuine wait, rather than an ambient always-on loop.
 */
export function ChitTraceLoader({
  size = 40,
  color = "var(--color-saffron)",
  label = "Thinking",
  className = "",
}: {
  size?: number;
  color?: string;
  label?: string;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [pathLength, setPathLength] = useState(0);

  const measureRef = useCallback((el: SVGPathElement | null) => {
    if (el) setPathLength(el.getTotalLength());
  }, []);

  return (
    <span role="status" aria-live="polite" className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 72 72" role="img" aria-hidden="true">
        <path d={LARDER_MARK_PATH} fill={color} opacity={0.08} />
        <path
          ref={measureRef}
          d={LARDER_MARK_PATH}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          className={!reducedMotion && pathLength > 0 ? "animate-chit-trace-loop" : ""}
          style={
            pathLength > 0
              ? ({
                  "--chit-path-length": pathLength,
                  strokeDasharray: pathLength,
                  strokeDashoffset: reducedMotion ? pathLength / 2 : undefined,
                } as React.CSSProperties)
              : undefined
          }
        />
      </svg>
      <span className="font-mono text-xs uppercase tracking-wide text-clay-brown">{label}…</span>
    </span>
  );
}
