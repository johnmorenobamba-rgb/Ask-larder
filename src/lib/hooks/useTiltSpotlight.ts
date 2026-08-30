"use client";

import { useCallback, useRef } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const MAX_TILT_DEG = 7;
const PERSPECTIVE_PX = 700;
const RESET_TRANSITION = "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease-out";

function neutralTransform(depthTranslateZPx: number) {
  return `perspective(${PERSPECTIVE_PX}px) rotateX(0deg) rotateY(0deg) translateZ(${depthTranslateZPx}px)`;
}

/**
 * Block J1 (Bento elevation system) — pointer/touch-tracked 3D tilt +
 * spotlight, shared across every bento cell that opts in via ElevatedCell.
 * Updates go straight to CSS custom properties on the element (not React
 * state) so a drag doesn't trigger a re-render per pointermove — this is
 * the standard high-frequency-pointer-tracking pattern (same approach as
 * 21st.dev's Tilt Card / Card Spotlight, referenced in the spec).
 *
 * Unified via the Pointer Events API rather than separate mouse/touch
 * handlers — a touch-drag on the card fires the same onPointerMove path a
 * mouse does. touch-action: none on the element (applied by ElevatedCell)
 * is required so the browser treats a drag on the card as this gesture
 * rather than a page scroll — worth revisiting if this rolls out to more
 * cells later (J2), since it costs that area its normal touch-scroll.
 *
 * Block L3 -- `depthTranslateZPx` (0 unless a caller opts a cell into a
 * depth tier) rides along in the same transform string as the tilt/reset
 * writes, rather than living in a separate CSS property, so a hero cell's
 * "closer to camera" translateZ survives every pointermove/reset update
 * instead of only applying at rest.
 */
export function useTiltSpotlight<T extends HTMLElement>(depthTranslateZPx = 0) {
  const ref = useRef<T | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const updateFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const px = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const py = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));

      const rotateY = (px - 0.5) * 2 * MAX_TILT_DEG;
      const rotateX = -(py - 0.5) * 2 * MAX_TILT_DEG;

      el.style.transition = "none";
      el.style.setProperty(
        "--tilt-transform",
        `perspective(${PERSPECTIVE_PX}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${depthTranslateZPx}px)`,
      );
      el.style.setProperty("--spotlight-x", `${px * 100}%`);
      el.style.setProperty("--spotlight-y", `${py * 100}%`);
      el.style.setProperty("--spotlight-opacity", "1");
    },
    [depthTranslateZPx],
  );

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = RESET_TRANSITION;
    el.style.setProperty("--tilt-transform", neutralTransform(depthTranslateZPx));
    el.style.setProperty("--spotlight-opacity", "0");
  }, [depthTranslateZPx]);

  // Depth (L3) is a static spatial offset, not motion -- it stays under
  // reduced motion (only the interactive tilt-on-pointer and idle float
  // are the "movement" that rule drops), so it's set directly as an
  // inline style rather than left to the CSS fallback, which has no way
  // to know this instance's depth value.
  const style = {
    touchAction: reducedMotion ? "auto" : "none",
    "--tilt-transform": neutralTransform(depthTranslateZPx),
  } as React.CSSProperties;

  if (reducedMotion) {
    return { ref, handlers: {}, style };
  }

  return {
    ref,
    handlers: {
      onPointerMove: (e: React.PointerEvent) => updateFromPoint(e.clientX, e.clientY),
      onPointerDown: (e: React.PointerEvent) => updateFromPoint(e.clientX, e.clientY),
      onPointerLeave: reset,
      onPointerUp: reset,
      onPointerCancel: reset,
    },
    style,
  };
}
