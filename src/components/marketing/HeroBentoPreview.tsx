"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { ElevatedCell } from "@/components/shared/ElevatedCell";
import { ChitMark } from "@/components/shared/ChitMark";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { StationGlyph, SegmentedProgress } from "@/components/staff/BentoGrid";
import twoFiresDemo from "@/data/two-fires-demo.json";

export type HeroBentoPreviewHandle = {
  cardEls: [unknown, unknown, unknown, unknown]; // ring / continue / certificates / ask-larder, fall order
};

const {
  completedCount,
  totalCount,
  continueModule,
  continueSectionsTotal,
  continueSectionsDone,
  certRows,
} = twoFiresDemo;
const frontCert = certRows[0];

/**
 * Reverted to live, scroll-scrubbed GSAP (6 Sep 2026) -- John's call after
 * seeing the baked-Remotion-video version live: back to the original
 * scroll-tied cascade. The 3rd cell was a real Two Fires stations gallery
 * for a while (replacing Certificates); reverted back to Certificates
 * 22 Sep 2026 at John's request, to bring the preview back into exact
 * fidelity with the real staff BentoGrid dashboard (which has never had a
 * stations tile at all -- stations render as a separate gallery below the
 * grid, not a bento cell). See [[project_block_n_hero_splash_copy]] memory
 * for the stations-tile back-and-forth; the Remotion composition
 * (remotion/compositions/HeroTileDrop.tsx) and its render are left in
 * place, just unused by this component, not deleted.
 *
 * Real components, not redrawn: ProgressRing, SegmentedProgress,
 * StationGlyph (all exported from BentoGrid.tsx), ChitMark. Real Two
 * Fires data throughout: `two-fires-demo.json` (ring/continue/certRows),
 * the exact same object the real dashboard itself renders from.
 *
 * Each card is a plain outer div (GSAP's cascade tween target, via
 * cardEls) wrapping a real `<ElevatedCell tilt>` as its only child --
 * two different systems each want to own `transform` on whatever node
 * they're attached to (GSAP's fall-in tween here, ElevatedCell's own
 * pointer-tilt there), so they're kept on separate nodes, parent/child --
 * see heroTimeline.ts's doc comment for the conflict this avoids.
 */
export const HeroBentoPreview = forwardRef<HeroBentoPreviewHandle, object>(function HeroBentoPreview(
  _props,
  forwardedRef,
) {
  const reducedMotion = usePrefersReducedMotion();
  const ringRef = useRef<HTMLDivElement | null>(null);
  const continueRef = useRef<HTMLDivElement | null>(null);
  const certsRef = useRef<HTMLDivElement | null>(null);
  const askLarderRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      get cardEls() {
        return [ringRef.current, continueRef.current, certsRef.current, askLarderRef.current] as [
          unknown,
          unknown,
          unknown,
          unknown,
        ];
      },
    }),
    [],
  );

  const cardClass = reducedMotion ? "" : "opacity-0";

  return (
    <div className="grid h-full w-full grid-cols-4 grid-rows-2 gap-[3%] p-[4%]" style={{ transformStyle: "preserve-3d" }} data-hero-bento-preview>
      {/* Ring -- the real Overall Progress hero cell */}
      <div ref={ringRef} data-hero-card="ring" className={`col-span-2 row-span-2 ${cardClass}`}>
        <ElevatedCell glowColor="var(--color-bay-green)" floatDurationS={5.8} floatDelayS={0.3} depth="hero" className="h-full rounded-md bg-parchment">
          <div className="flex h-full flex-col items-center justify-center gap-1">
            <ProgressRing completedCount={completedCount} totalCount={totalCount} size="compact" />
            <p className="font-sans text-[6px] text-clay-brown sm:text-[7px]">modules complete</p>
          </div>
        </ElevatedCell>
      </div>

      {/* Continue -- glyph + real segmented step-progress */}
      <div ref={continueRef} data-hero-card="continue" className={`col-span-2 row-span-1 ${cardClass}`}>
        <ElevatedCell glowColor="var(--color-clay-brown)" floatDurationS={5.6} floatDelayS={0} depth="secondary" className="h-full rounded-md bg-parchment">
          <div className="flex h-full flex-col justify-center gap-1 px-[8%]">
            <div className="flex items-center gap-1">
              <StationGlyph color="var(--color-clay-brown)" />
              <p className="truncate font-display text-[6px] font-bold text-ink sm:text-[7px]">{continueModule.title}</p>
            </div>
            <p className="font-sans text-[5px] text-clay-brown sm:text-[6px]">{continueModule.status}</p>
            <SegmentedProgress total={continueSectionsTotal} done={continueSectionsDone} />
          </div>
        </ElevatedCell>
      </div>

      {/* Certificates -- the real cell type, same front-card + status-color
          border logic as BentoGrid.tsx's own Certificates tile, same real
          Two Fires cert data (First Aid, expiring in 9d). */}
      <div ref={certsRef} data-hero-card="certificates" className={`col-span-1 row-span-1 ${cardClass}`}>
        <ElevatedCell glowColor={frontCert.color} floatDurationS={6.0} floatDelayS={0.6} depth="secondary" className="h-full rounded-md bg-parchment">
          <div className="flex h-full flex-col justify-center gap-1 px-[8%]">
            <p className="font-mono text-[4px] uppercase tracking-wide text-clay-brown sm:text-[5px]">Certificates</p>
            <div className="rounded border px-1 py-0.5" style={{ borderColor: frontCert.color }}>
              <p className="truncate font-sans text-[5px] text-ink sm:text-[6px]">{frontCert.name}</p>
              <p className="font-mono text-[4px] sm:text-[5px]" style={{ color: frontCert.color }}>
                {frontCert.label}
              </p>
            </div>
          </div>
        </ElevatedCell>
      </div>

      {/* Ask Larder -- the real traced-chit, not a static bubble icon */}
      <div ref={askLarderRef} data-hero-card="ask-larder" className={`col-span-1 row-span-1 ${cardClass}`}>
        <ElevatedCell glowColor="var(--color-saffron)" floatDurationS={6.2} floatDelayS={1.0} depth="secondary" className="h-full rounded-md bg-ink">
          <div className="flex h-full flex-col items-center justify-center gap-0.5">
            <ChitMark size={20} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" />
            <p className="font-sans text-[5px] text-parchment sm:text-[6px]">Ask something</p>
          </div>
        </ElevatedCell>
      </div>
    </div>
  );
});
