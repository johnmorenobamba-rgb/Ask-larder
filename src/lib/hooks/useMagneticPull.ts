"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const DEFAULT_MAX_PULL_PX = 10;
const REACH_BEYOND_BOX_PX = 60;

/**
 * Block L6/L8 -- desktop-only magnetic pointer-pull via GSAP's `quickTo()`.
 * Gated behind `(hover: hover) and (pointer: fine)`, matching the
 * touch-vs-hover discipline already used elsewhere (useTiltSpotlight,
 * StationsGallery) -- a magnetic pull that also fired on touch would just
 * be a confusing lag on tap, not a hover affordance.
 *
 * `quickTo()` (not a fresh `gsap.to()` per pointermove) is GSAP's own
 * documented pattern for this exact "follow the cursor with inertia" case
 * -- one persistent interpolator per axis, retargeted every move rather
 * than spinning up a new tween each frame.
 *
 * A window-level pointermove listener is required (not the element's own
 * onPointerMove) so the pull can engage *before* the cursor actually
 * enters the element -- that's the "magnetic" part; an element-scoped
 * listener would only ever fire once the pointer is already inside it.
 * GSAP itself is a dynamic import for the same bundle-weight reason as
 * ChitMark's idle timeline -- see that component's doc comment.
 */
export function useMagneticPull<T extends HTMLElement>(maxPullPx = DEFAULT_MAX_PULL_PX) {
  const ref = useRef<T | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let cancelled = false;
    let cleanupListeners: (() => void) | null = null;

    import("gsap").then(({ default: gsap }) => {
      if (cancelled) return;
      const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });

      function onPointerMove(e: PointerEvent) {
        const rect = el!.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const reach = Math.max(rect.width, rect.height) / 2 + REACH_BEYOND_BOX_PX;
        const dist = Math.hypot(dx, dy);
        if (dist > reach) {
          xTo(0);
          yTo(0);
          return;
        }
        const strength = 1 - dist / reach;
        xTo((dx / reach) * maxPullPx * strength * 2);
        yTo((dy / reach) * maxPullPx * strength * 2);
      }

      function onPointerLeave() {
        xTo(0);
        yTo(0);
      }

      window.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerleave", onPointerLeave);
      cleanupListeners = () => {
        window.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerleave", onPointerLeave);
        gsap.set(el, { x: 0, y: 0 });
      };
    });

    return () => {
      cancelled = true;
      cleanupListeners?.();
    };
  }, [reducedMotion, maxPullPx]);

  return ref;
}
