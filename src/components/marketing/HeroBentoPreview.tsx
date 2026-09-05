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

const certGlowColor = certRows[0]?.color ?? "var(--color-bay-green)";

/**
 * Rebuilt 5 Sep 2026 (Notion, Build Manual Block N) -- previously 5 plain
 * divs with invented marketing copy standing in for the dashboard ("Built
 * from your own SOPs," "Scan at station," etc). Now the actual 4
 * differentiated Personal Dashboard cell types named in the Build
 * Manual's own J2 sub-block (ring / glyph+step-progress / fanned card-
 * stack / traced-chit), built from the real shared pieces
 * (ProgressRing, SegmentedProgress, StationGlyph -- all exported from
 * BentoGrid.tsx rather than redrawn here) and real Two Fires demo data
 * (`src/data/two-fires-demo.json`, the same real fixture used by the
 * Block N3 explainer video) -- not fabricated numbers or copy.
 *
 * The certificate fan is the one genuinely new visual here (the real
 * dashboard's own Certificates cell moved to a simpler front-card+pill
 * treatment after J2's original fanned-stack didn't hold up at that
 * narrower footprint -- see BentoGrid.tsx's own comment) -- real
 * creative latitude on the *treatment*, still built from the real
 * certRows data and the real status-color convention, not invented cert
 * names or counts.
 *
 * Each card is a plain outer div (GSAP's cascade tween target, via
 * cardEls) wrapping a real `<ElevatedCell tilt>` as its only child --
 * two different systems each want to own `transform` on whatever node
 * they're attached to (GSAP's fall-in tween here, ElevatedCell's own
 * pointer-tilt there), so they're kept on separate nodes, parent/child,
 * rather than fighting over one -- see heroTimeline.ts's doc comment for
 * the actual conflict this avoids. Tilt is deliberately ON here (unlike
 * BentoGrid.tsx's own `tilt={false}` cells) -- a marketing hero is
 * exactly the desktop, mouse-driven "look how impressive this is" moment
 * Block L3's tilt system was built for, even though the real touch-first
 * product keeps it off.
 */
export const HeroBentoPreview = forwardRef<HeroBentoPreviewHandle, object>(function HeroBentoPreview(
  _props,
  forwardedRef,
) {
  const reducedMotion = usePrefersReducedMotion();
  const ringRef = useRef<HTMLDivElement | null>(null);
  const continueRef = useRef<HTMLDivElement | null>(null);
  const certificatesRef = useRef<HTMLDivElement | null>(null);
  const askLarderRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      get cardEls() {
        return [ringRef.current, continueRef.current, certificatesRef.current, askLarderRef.current] as [
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

      {/* Certificates -- real cert data, fanned card-stack treatment */}
      <div ref={certificatesRef} data-hero-card="certificates" className={`col-span-1 row-span-1 ${cardClass}`}>
        <ElevatedCell
          glowColor={certGlowColor}
          floatDurationS={6.0}
          floatDelayS={0.6}
          depth="secondary"
          className="relative h-full overflow-visible rounded-md bg-parchment"
        >
          <div className="relative h-full w-full">
            {certRows
              .slice()
              .reverse()
              .map((cert, i) => {
                const isFront = i === certRows.length - 1;
                return (
                  <div
                    key={cert.id}
                    className="absolute inset-x-[10%] top-1/2 flex flex-col justify-center rounded-sm border bg-parchment px-[10%] py-[6%]"
                    style={{
                      borderColor: cert.color,
                      transform: `translateY(-50%) rotate(${(i - (certRows.length - 1)) * -6}deg) translateX(${(i - (certRows.length - 1)) * 8}%)`,
                      zIndex: i,
                      boxShadow: isFront ? "0 1px 3px rgba(31,27,22,0.15)" : "none",
                    }}
                  >
                    <p className="truncate font-sans text-[5px] font-medium text-ink sm:text-[6px]">{cert.name}</p>
                    <p className="font-mono text-[4px] sm:text-[5px]" style={{ color: cert.color }}>
                      {cert.label}
                    </p>
                  </div>
                );
              })}
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
