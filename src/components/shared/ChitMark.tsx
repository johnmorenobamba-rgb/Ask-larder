"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { LARDER_MARK_PATH, LARDER_MARK_PATH_BOLD } from "./LarderMark";

const TRACE_FRACTION = 0.22;
const TRACE_LOOP_S = 2.6;
const DRAW_IN_MS = 500;
const SETTLE_MS = 200;
const HERO_HOLD_MS = 450;

type Stage = "before" | "drawing" | "hero" | "idle";

export type ChitMarkHandle = {
  /** Block L6 -- one-shot MorphSVG flex/flash, played on tap right before
   * the Ask Larder overlay opens (a state-indication beat, not decoration).
   * No-op if the mark hasn't reached its idle stage yet. */
  playActivationBeat: () => void;
};

/**
 * Block J3 — the shared chit mark. Plain flat chit-bubble (no toque merge,
 * explicitly rejected per the Decision Log) with the confirmed idle state:
 * a faint (~10% opacity) full-shape fill under a stroked outline where a
 * short glowing segment (~22% of the real path length, measured via
 * getTotalLength() at runtime) travels around the closed path, plus
 * (Block L6) a subtle breathing scale on the same 2.6s cycle so the trace
 * completes one lap and the breath completes one cycle together, every
 * time -- both driven from one `gsap.timeline()` (`gsap.ticker`'s single
 * shared clock) rather than two independently-timed CSS/WAAPI animations,
 * which could drift apart from each other over a long session.
 *
 * GSAP is imported dynamically (`import("gsap")`), not as a static
 * top-level import -- this component renders on nearly every dashboard
 * screen (bento tile, floating bubble, AllClearCell), so a static import
 * would put GSAP's bundle weight back on every page's critical path,
 * undoing Session 1's lazy-loading fix for the exact same dependency. A
 * dynamic import fetches it in the background once idle is reached,
 * without blocking first paint/interactivity; the mark shows its correct
 * static idle frame (segment at its start position) until that chunk
 * arrives, then upgrades to the animated loop -- progressive enhancement,
 * not a broken intermediate state. MorphSVGPlugin (needed only for
 * `playActivationBeat`) is deferred even further, to first actual tap.
 *
 * Built once, used in three places (Ask Larder dashboard tile,
 * AskLarderTriggerIcon's idle state, and J4/L5's splash mark via
 * SplashSequence's hand-off) — not reimplemented per site. Colors and size
 * are props specifically so callers can drop this into differently-sized,
 * differently-colored contexts without touching this file.
 *
 * `animateIn` plays the one-time ~700ms draw-in-then-settle reveal before
 * dropping into the idle trace. Off by default — the dashboard tile and
 * the floating bubble are persistent chrome already on screen, not a
 * cold-load reveal moment; SplashSequence no longer uses this path itself
 * (L5 rebuilt the splash's own entrance on GSAP) but the prop stays for
 * any future non-splash reveal use.
 *
 * `intensity="hero"` inserts one extra transient beat after the draw-in:
 * the full outline holds lit in trace color with a stronger glow for
 * ~450ms, then settles into the exact same subtle idle trace every other
 * usage has. The idle state itself never changes based on intensity — only
 * this one-time reveal flash does. It also skips the flat interior fill
 * entirely for the rest of its lifetime — see the `fillOpacity` comment
 * below for why.
 */
export const ChitMark = forwardRef<ChitMarkHandle, {
  size?: number;
  traceColor?: string;
  fillColor?: string;
  animateIn?: boolean;
  intensity?: "default" | "hero";
  className?: string;
}>(function ChitMark(
  {
    size = 72,
    traceColor = "var(--color-saffron)",
    fillColor = "var(--color-ink)",
    animateIn = false,
    intensity = "default",
    className = "",
  },
  forwardedRef,
) {
  const reducedMotion = usePrefersReducedMotion();
  const [pathLength, setPathLength] = useState(0);
  const [stage, setStage] = useState<Stage>(animateIn && !reducedMotion ? "before" : "idle");
  const svgElRef = useRef<SVGSVGElement | null>(null);
  const pathElRef = useRef<SVGPathElement | null>(null);
  // Structural type for exactly the 3 methods used here, not GSAP's own
  // Timeline type -- gsap is a dynamic import (see doc comment above), so
  // there's no static import to hang a real type off of.
  const idleTimelineRef = useRef<{ pause: () => void; resume: () => void; kill: () => void } | null>(null);

  // Callback ref, not useEffect+useRef -- getTotalLength() genuinely needs
  // the DOM node to exist, but this only needs to run once on attach; a
  // ref callback firing during commit isn't a useEffect, so it's outside
  // the set-state-in-effect concern that ruled out a simpler effect here.
  const measureRef = useCallback((el: SVGPathElement | null) => {
    pathElRef.current = el;
    if (el) setPathLength(el.getTotalLength());
  }, []);

  // Deliberately runs once (empty deps), not on every `stage` change: this
  // effect's own rAF flips stage to "drawing" while a settle timer from the
  // very same invocation is still pending. Depending on `stage` here would
  // re-run the effect the instant that rAF fires, and the resulting
  // cleanup would cancel that still-pending settle timer before it ever
  // gets to fire -- permanently stalling the sequence in "drawing". The
  // `stage !== "before"` guard makes this a no-op on remounts where the
  // initial stage was already "idle" (animateIn off or reduced motion).
  useEffect(() => {
    if (stage !== "before") return;
    const raf = requestAnimationFrame(() => setStage("drawing"));
    const t = window.setTimeout(() => {
      setStage(intensity === "hero" ? "hero" : "idle");
    }, DRAW_IN_MS + SETTLE_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above; intensity/stage are read from mount-time closure by design
  }, []);

  useEffect(() => {
    if (stage !== "hero") return;
    const t = window.setTimeout(() => setStage("idle"), HERO_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [stage]);

  // Block L6 -- the idle trace+breathing-scale, one gsap.timeline(). See
  // the component doc comment above for why gsap is a dynamic import here.
  useEffect(() => {
    const pathEl = pathElRef.current;
    const svgEl = svgElRef.current;
    if (stage !== "idle" || !pathEl || !svgEl || pathLength === 0) return;

    const segment = pathLength * TRACE_FRACTION;
    pathEl.style.strokeDasharray = `${segment} ${pathLength - segment}`;

    if (reducedMotion) {
      // Stops cleanly at the segment's start position -- never a frozen
      // mid-loop frame, which pausing an in-flight animation would leave.
      pathEl.style.strokeDashoffset = "0";
      return;
    }

    let cancelled = false;
    import("gsap").then(({ default: gsap }) => {
      if (cancelled) return;
      const tl = gsap.timeline({ repeat: -1 });
      tl.fromTo(pathEl, { strokeDashoffset: 0 }, { strokeDashoffset: -pathLength, duration: TRACE_LOOP_S, ease: "none" }, 0);
      tl.to(svgEl, { scale: 1.035, duration: TRACE_LOOP_S / 2, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
      idleTimelineRef.current = tl;
    });

    return () => {
      cancelled = true;
      idleTimelineRef.current?.kill();
      idleTimelineRef.current = null;
    };
  }, [stage, pathLength, reducedMotion]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      playActivationBeat() {
        const pathEl = pathElRef.current;
        if (!pathEl || stage !== "idle" || reducedMotion) return;
        const idleTl = idleTimelineRef.current;
        idleTl?.pause();
        import("gsap").then(async ({ default: gsap }) => {
          const { MorphSVGPlugin } = await import("gsap/MorphSVGPlugin");
          gsap.registerPlugin(MorphSVGPlugin);
          gsap
            .timeline({ onComplete: () => idleTl?.resume() })
            .to(pathEl, { morphSVG: LARDER_MARK_PATH_BOLD, strokeWidth: 4.5, duration: 0.14, ease: "power2.out" })
            .to(pathEl, { morphSVG: LARDER_MARK_PATH, strokeWidth: 3, duration: 0.18, ease: "power2.inOut" });
        });
      },
    }),
    [stage, reducedMotion],
  );

  // `intensity="hero"` (splash only) skips the flat interior fill entirely
  // -- it's a hard-edged rounded-rect shape with no blur of its own, and at
  // the splash's much larger size that reads as a badge/panel behind the
  // icon rather than a glow (confirmed via screenshot: a soft ambient
  // radial-gradient sits behind the mark on that usage already, which does
  // the "ambient warmth" job this fill was doing at small tile/bubble
  // sizes without the hard edge). Every other usage is untouched.
  const fillOpacity = intensity === "hero" ? 0 : stage === "before" ? 0 : 0.1;

  let outlineStyle: React.CSSProperties = {};
  let strokeColor = fillColor;
  let strokeWidth = 3;
  let glowFilter: string | undefined;

  if (pathLength > 0) {
    if (stage === "before") {
      outlineStyle = { strokeDasharray: pathLength, strokeDashoffset: pathLength };
    } else if (stage === "drawing") {
      outlineStyle = {
        strokeDasharray: pathLength,
        strokeDashoffset: 0,
        transition: `stroke-dashoffset ${DRAW_IN_MS}ms ease-out`,
      };
    } else if (stage === "hero") {
      // The "fuller draw" flash — full outline lit in trace color, thicker
      // than idle ever uses. No drop-shadow here (unlike idle, below): a
      // blurred copy of this path is a blurred *rounded rectangle* --
      // LARDER_MARK_PATH's silhouette -- which reads as a soft-edged badge
      // behind the icon rather than a boundary-less glow. The splash (the
      // only caller of intensity="hero") already renders its own
      // radial-gradient ambient glow behind the mark for that job; the
      // bright color + thicker line alone read as "lit" without risking a
      // shape-following blur.
      outlineStyle = { strokeDasharray: pathLength, strokeDashoffset: 0, transition: "stroke-width 200ms ease-out" };
      strokeColor = traceColor;
      strokeWidth = 5;
    } else if (stage === "idle") {
      strokeColor = traceColor;
      glowFilter = reducedMotion ? undefined : `drop-shadow(0 0 4px ${traceColor})`;
    }
    // idle's dasharray/dashoffset are set imperatively by the GSAP timeline
    // above (it owns dashoffset while the loop runs), so no React-driven
    // dasharray/dashoffset style is set here for that case.
  }

  return (
    <svg
      ref={svgElRef}
      width={size}
      height={size}
      viewBox="0 0 72 72"
      role="img"
      aria-label="Larder"
      className={className}
      style={{ transformOrigin: "center" }}
    >
      <path
        d={LARDER_MARK_PATH}
        fill={fillColor}
        opacity={fillOpacity}
        style={{ transition: stage !== "before" ? "opacity 200ms ease-out" : undefined }}
      />
      <path
        ref={measureRef}
        d={LARDER_MARK_PATH}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{ ...outlineStyle, filter: glowFilter }}
      />
    </svg>
  );
});
