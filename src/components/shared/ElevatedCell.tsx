"use client";

import { useTiltSpotlight } from "@/lib/hooks/useTiltSpotlight";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

export type CellDepth = "hero" | "secondary";

// Block L3 -- how far a tier sits from the camera under each cell's own
// local perspective(700px) (baked into useTiltSpotlight's transform, not a
// shared preserve-3d scene -- see that hook's doc comment for why a
// per-cell-local approach was chosen over a shared 3D containing block).
const DEPTH_TRANSLATE_Z_PX: Record<CellDepth, number> = { hero: 16, secondary: -10 };

// Block L7 -- how far a tier travels under the whole-viewport parallax
// (useViewportParallax's --viewport-parallax-x/y, -1..1). Hero cells read
// as closer, so they move more; secondary cells recede, so they move less
// -- depth and parallax reinforce the same physical read instead of being
// two unrelated effects.
const PARALLAX_WEIGHT_PX: Record<CellDepth, number> = { hero: 10, secondary: 4 };

/**
 * Block J1 — the shared bento-cell elevation/tilt/spotlight treatment
 * (Decision Log, 29 Aug 2026 direction pivot; Personal Dashboard spec's
 * "Impressive, not flat" section). One reusable wrapper so J2 (all four
 * staff dashboard cells) and J6 (owner dashboard flag cards / completion
 * rings) apply the exact same physicality later, not a re-implementation
 * per screen.
 *
 * Composition note: the idle float uses the standalone CSS `translate`
 * property, not `transform: translateY()` — that lets it run alongside the
 * tilt's JS-driven `transform` (perspective + rotateX/rotateY) without the
 * two fighting over the same property. `prefers-reduced-motion` disables
 * both the float animation and the interactive tilt/spotlight — the
 * layered shadow + glow (not motion) stays either way.
 *
 * `depth` (Block L3, optional) grades a cell into the "hero sits closer,
 * secondary recedes" hierarchy -- translateZ per DEPTH_TRANSLATE_Z_PX plus
 * a `data-depth` attribute the CSS reads for tier-specific shadow/glow
 * strength. Omitted entirely (undefined) means today's exact flat
 * treatment, unchanged -- callers that aren't a graded hero/secondary
 * composition (e.g. StaffCompletionList's peer rows) simply don't pass it.
 *
 * The parallax wrapper (Block L7) is a plain 2D `translate()` on an outer
 * div, deliberately never combined into the inner div's own 3D tilt
 * transform -- J5's stations cylinder already produced one real
 * pointer-hit-testing bug from overlapping elements sharing a 3D scene;
 * keeping parallax as a separate, non-rotated, small-magnitude translate
 * on a non-overlapping grid cell avoids that bug class entirely rather
 * than budgeting time to debug it again here.
 */
export function ElevatedCell({
  children,
  glowColor = "var(--color-ink)",
  floatDurationS = 6,
  floatDelayS = 0,
  depth,
  className = "",
}: {
  children: React.ReactNode;
  /** A CSS color value (e.g. "var(--color-bay-green)") matched to this cell's own fill/accent. */
  glowColor?: string;
  /** 5.5-6.2s per spec; vary per cell so the grid doesn't bob in unison. */
  floatDurationS?: number;
  floatDelayS?: number;
  /** Block L3/L7 depth tier. Omit for cells outside a graded hero/secondary composition. */
  depth?: CellDepth;
  className?: string;
}) {
  const depthTranslateZPx = depth ? DEPTH_TRANSLATE_Z_PX[depth] : 0;
  const { ref, handlers, style } = useTiltSpotlight<HTMLDivElement>(depthTranslateZPx);
  const reducedMotion = usePrefersReducedMotion();
  const parallaxWeight = depth && !reducedMotion ? PARALLAX_WEIGHT_PX[depth] : 0;

  const cell = (
    <div
      ref={ref}
      {...handlers}
      data-depth={depth}
      className={`elevated-cell ${reducedMotion ? "" : "elevated-cell-float"} ${className}`}
      style={
        {
          ...style,
          "--elevated-glow-color": glowColor,
          "--elevated-float-duration": `${floatDurationS}s`,
          "--elevated-float-delay": `${floatDelayS}s`,
        } as React.CSSProperties
      }
    >
      <div className="elevated-cell-spotlight" aria-hidden="true" />
      <div className="elevated-cell-content">{children}</div>
    </div>
  );

  if (parallaxWeight === 0) return cell;

  return (
    <div
      className="elevated-cell-parallax"
      style={
        {
          "--parallax-weight": `${parallaxWeight}px`,
        } as React.CSSProperties
      }
    >
      {cell}
    </div>
  );
}
