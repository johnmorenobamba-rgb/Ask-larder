"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { ElevatedCell } from "@/components/shared/ElevatedCell";
import { ChitMark } from "@/components/shared/ChitMark";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { StationGlyph, SegmentedProgress } from "@/components/staff/BentoGrid";
import { getStationVisuals } from "@/lib/staff/stationVisuals";
import twoFiresDemo from "@/data/two-fires-demo.json";
import twoFiresStations from "@/data/two-fires-stations.json";

export type HeroBentoPreviewHandle = {
  cardEls: [unknown, unknown, unknown, unknown]; // ring / continue / stations / ask-larder, fall order
};

const {
  completedCount,
  totalCount,
  continueModule,
  continueSectionsTotal,
  continueSectionsDone,
} = twoFiresDemo;

const STATION_CYCLE_MS = 2600;

/**
 * Reverted to live, scroll-scrubbed GSAP (6 Sep 2026) -- John's call after
 * seeing the baked-Remotion-video version live: back to the original
 * scroll-tied cascade, but keeping the real stations gallery worked in as
 * the 4th tile (replacing Certificates), which is what the video attempt
 * was actually for. See [[project_block_n_hero_splash_copy]] memory for
 * the full back-and-forth -- the Remotion composition
 * (remotion/compositions/HeroTileDrop.tsx) and its render are left in
 * place, just unused by this component now, not deleted.
 *
 * Real components, not redrawn: ProgressRing, SegmentedProgress,
 * StationGlyph (all exported from BentoGrid.tsx), ChitMark. Real Two
 * Fires data: `two-fires-demo.json` (ring/continue) and
 * `two-fires-stations.json` (5 real stations, real photos downloaded to
 * `public/images/stations/` as static files -- the fetch script's own
 * Supabase signed URLs are fine for a one-time Remotion render but
 * expire in days, which would silently break real photos in this
 * long-lived live component).
 *
 * Stations cycles through 3 of the real 5 stations every
 * `STATION_CYCLE_MS` via plain setInterval + React state -- safe here
 * since this runs live in the browser with no rendering-determinism
 * constraint (unlike the Remotion version, which drove the same idea
 * off `useCurrentFrame()` instead). Gives the swapped-in tile some of
 * the same "gallery" feel without needing the full interactive
 * `useCylinderCarousel` drag physics in a small, non-interactive cell.
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
  const stationsRef = useRef<HTMLDivElement | null>(null);
  const askLarderRef = useRef<HTMLDivElement | null>(null);
  const [stationIndex, setStationIndex] = useState(0);
  const previewStations = twoFiresStations.slice(0, 3);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setStationIndex((i) => (i + 1) % previewStations.length);
    }, STATION_CYCLE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- previewStations is a stable slice of a static import, not real per-render state
  }, [reducedMotion]);

  useImperativeHandle(
    forwardedRef,
    () => ({
      get cardEls() {
        return [ringRef.current, continueRef.current, stationsRef.current, askLarderRef.current] as [
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
  const station = previewStations[stationIndex];
  const visuals = getStationVisuals(station.name, stationIndex);

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

      {/* Stations -- real Two Fires stations, cycling through 3 of the real 5 */}
      <div ref={stationsRef} data-hero-card="stations" className={`col-span-1 row-span-1 ${cardClass}`}>
        <ElevatedCell glowColor="var(--color-preserve-red)" floatDurationS={6.0} floatDelayS={0.6} depth="secondary" className="relative h-full overflow-hidden rounded-md">
          <div className="relative h-full w-full">
            {previewStations.map((s, i) => (
              <div key={s.id} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: i === stationIndex ? 1 : 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static real photo, no benefit from next/image at this tiny preview scale */}
                <img src={s.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
              </div>
            ))}
            <div className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink/50">
              <StationGlyph color="var(--color-parchment)" />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-1.5">
              <p className="font-mono text-[4px] uppercase tracking-wide text-parchment/70 sm:text-[5px]">{visuals.department}</p>
              <p className="truncate font-display text-[6px] leading-tight text-parchment sm:text-[7px]">{station.name}</p>
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
