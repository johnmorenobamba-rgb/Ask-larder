// Structural types for exactly the methods used here, not GSAP's own types —
// gsap is always either a dynamic import (marketing hero) or a static import
// in an already-lazy-loaded module (SplashSequence, via SplashScreen's
// next/dynamic), so there's no one static import to hang real GSAP types off
// of consistently across both call sites. Same convention as ChitMark.tsx's
// idleTimelineRef.
// Method-shorthand signatures (not arrow-function-valued properties) so TS
// checks these bivariantly against the real, stricter-typed gsap module --
// passing the actual `gsap` default export where this loose interface is
// expected would otherwise fail structural assignability on `to()`'s
// `targets` parameter (real gsap types it as `TweenTarget`, not `unknown`).
type GsapTimeline = {
  addLabel(name: string, position?: string): GsapTimeline;
  to(targets: unknown, vars: Record<string, unknown>, position?: string): GsapTimeline;
  kill(): void;
  duration(): number;
};
type GsapLike = {
  timeline(vars?: { paused?: boolean; onComplete?: () => void }): GsapTimeline;
  set(targets: unknown, vars: Record<string, unknown>): void;
};
type SplitTextInstance = { chars: unknown[]; revert: () => void };
type SplitTextCtor = new (target: Element, vars: { type: string }) => SplitTextInstance;

const WORDMARK_DURATION = 0.55;
const WORDMARK_STAGGER = 0.055;

/** Positions the wordmark's post-stagger beats relative to this span (not a
 * guessed hold duration) so "legible" can never cut in before every
 * character has actually finished staggering in. */
function wordmarkSpan(charCount: number) {
  return WORDMARK_DURATION + WORDMARK_STAGGER * Math.max(0, charCount - 1);
}

/**
 * Block N2 — a scrub-safe re-authoring of the same splash beats for the
 * marketing hero's tablet-screen preview, built after discovering (via an
 * isolated repro, not assumption) that DrawSVGPlugin and MorphSVGPlugin
 * tweens never apply when a timeline is driven purely by `.progress()`
 * jumps (ScrollTrigger's `scrub`) rather than normal ticker-driven
 * playback — confirmed with a minimal `gsap.timeline({paused:true})` +
 * `drawSVG` repro outside any of this app's own code, while an identical
 * repro using a plain CSS property (`strokeDashoffset`) scrubbed correctly.
 * Plain CSSPlugin-handled properties (opacity, strokeDashoffset,
 * strokeWidth, x/y) all scrub correctly; DrawSVG/MorphSVG's custom render
 * paths do not, in this GSAP version.
 *
 * Reproduces the same visual story with only scrub-safe properties:
 * - "draw" -> `strokeDashoffset` from the path's own measured length to 0
 *   (the same manual path-length technique ChitMark.tsx already uses for
 *   its own idle trace, just tweened once here instead of driving a
 *   continuous loop).
 * - "settle" -> `strokeWidth` thickens + the fill fades in (no path-shape
 *   morph -- the real cold-load splash (SplashSequence.tsx) doesn't do one
 *   either anymore; it renders ChitMark's own `animateIn`/`intensity="hero"`
 *   reveal directly rather than tweening a private copy of the path here).
 * - "wordmark" / "legible" -> the same character-stagger beats
 *   SplashSequence.tsx builds for the real splash (opacity/y stagger via
 *   SplitText, both plain properties) -- kept independent rather than
 *   shared, since one is scroll-scrubbed and the other autoplays.
 *
 * Deliberately does NOT pass `paused: true` here -- confirmed via isolated
 * repro that a child timeline created with
 * `paused: true` never renders once nested into a parent via `.add()` and
 * driven only through the parent's `.progress()` (ScrollTrigger's scrub),
 * regardless of whether the tweened property is plugin-driven or plain
 * CSS. A child left in its default (unpaused) state renders correctly once
 * nested — reparenting via `.add()` removes it from the global root
 * timeline, so there's no independent autoplay/double-drive risk once it's
 * owned by this always-`paused:true`, scrub-only master timeline.
 */
export function buildScrubSafeSplashPreviewTimeline(
  gsap: GsapLike,
  SplitTextCtor: SplitTextCtor,
  refs: { traceEl: SVGPathElement; fillEl: Element; wordmarkEl: HTMLElement },
): { timeline: GsapTimeline; split: SplitTextInstance } {
  const { traceEl, fillEl, wordmarkEl } = refs;

  const split = new SplitTextCtor(wordmarkEl, { type: "chars" });
  gsap.set(split.chars, { opacity: 0, y: 8 });
  gsap.set(wordmarkEl, { opacity: 1 });

  const pathLength = traceEl.getTotalLength();
  gsap.set(traceEl, { strokeDasharray: pathLength, strokeDashoffset: pathLength, strokeWidth: 3 });
  gsap.set(fillEl, { opacity: 0 });

  const timeline = gsap.timeline();
  const span = wordmarkSpan(split.chars.length);

  timeline
    .addLabel("draw")
    .to(traceEl, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, "draw")
    .addLabel("settle")
    .to(traceEl, { strokeWidth: 5, duration: 0.2, ease: "power2.out" }, "settle")
    .to(fillEl, { opacity: 1, duration: 0.2 }, "settle")
    .addLabel("wordmark", "settle+=0.35")
    .to(
      split.chars,
      { opacity: 1, y: 0, duration: WORDMARK_DURATION, ease: "back.out(1.9)", stagger: WORDMARK_STAGGER },
      "wordmark",
    )
    .addLabel("legible", `wordmark+=${span + 0.25}`)
    .to(traceEl, { strokeWidth: 3, duration: 0.2, ease: "power2.inOut" }, "legible")
    .to(fillEl, { opacity: 0, duration: 0.2 }, "legible");

  return { timeline, split };
}
