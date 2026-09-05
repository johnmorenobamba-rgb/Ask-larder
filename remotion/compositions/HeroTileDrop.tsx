import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame } from "remotion";
import { ChitMark } from "@/components/shared/ChitMark";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { SegmentedProgress, StationGlyph } from "@/components/staff/BentoGrid";
import { getStationVisuals } from "@/lib/staff/stationVisuals";
import twoFiresDemo from "@/data/two-fires-demo.json";
import twoFiresStations from "@/data/two-fires-stations.json";

// Hero tablet rebuild, 5-6 Sep 2026: baked Remotion loop replacing the
// live GSAP tile-drop inside the marketing hero's tablet mockup (John's
// explicit direction -- "cleaner, smoother, more impressive drop of
// tiles" -- accepting the tradeoff that this no longer scrubs 1:1 with
// scroll once revealed). Same real-components-not-redrawn principle as
// the N3 explainer video: ProgressRing/SegmentedProgress/StationGlyph/
// ChitMark are the actual shared components, real Two Fires data.
//
// Stations replaces Certificates as the 4th tile (confirmed with John).
// The reveal is a real-data crossfade through 3 of Two Fires' actual 5
// stations (name + real tagged photo, via getStationVisuals for the same
// department/glyph derivation the real StationsGallery uses) shown as an
// independent centered overlay rather than literally scaling the small
// grid cell in place -- an earlier version transformed the cell itself
// and the translate/scale math pushed it off-canvas; crossfading to a
// separately-centered spotlight sidesteps that whole class of bug.
// Also intentionally not reimplementing useCylinderCarousel's 3D drag
// physics -- that hook's transform-string ordering is already documented
// as fragile (StationsGallery.tsx's own comment), not worth the risk for
// a preview that was never interactive here anyway.
const FPS = 30;

const FALL_STAGGER = 6;
const SPOTLIGHT_IN_START = 70;
const SPOTLIGHT_IN_DURATION = 20;
const STATIONS_START = 96;
const STATIONS_HOLD = 40;
const SPOTLIGHT_OUT_START = 136;
const SPOTLIGHT_OUT_DURATION = 19;
export const HERO_TILE_DROP_DURATION = 155;

const { completedCount, totalCount, continueModule, continueSectionsTotal, continueSectionsDone } = twoFiresDemo;
const PREVIEW_STATIONS = twoFiresStations.slice(0, 3); // 3 of the real 5 -- enough to read as "several", not exhaustive

function useLocalFrame() {
  return useCurrentFrame();
}

/** Gentle settle, not a wild scatter -- a big scatter reads fine mid-
 * scroll-scrub but would make this file's own loop restart (settled back
 * to scattered) read as a jarring reset instead of a near-continuous seam. */
function TileFall({ delay, children }: { delay: number; children: React.ReactNode }) {
  const frame = useLocalFrame();
  const local = Math.max(0, frame - delay);
  const p = spring({ frame: local, fps: FPS, config: { damping: 16, mass: 0.7 } });
  const opacity = interpolate(p, [0, 1], [0, 1]);
  const y = interpolate(p, [0, 1], [16, 0]);
  const scale = interpolate(p, [0, 1], [0.94, 1]);
  return <div style={{ opacity, transform: `translateY(${y}px) scale(${scale})`, height: "100%" }}>{children}</div>;
}

function StationCompactTile() {
  const station = PREVIEW_STATIONS[0];
  return (
    <div className="relative h-full w-full overflow-hidden rounded-md shadow-xl">
      <Img src={station.photoUrl} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
      <div className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink/50">
        <StationGlyph color="var(--color-parchment)" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2">
        <p className="font-mono text-[7px] uppercase tracking-wide text-parchment/70">Station</p>
        <p className="font-display text-[10px] leading-tight text-parchment">{station.name}</p>
      </div>
    </div>
  );
}

/** Independent full-canvas overlay, not a transform on the small grid
 * cell -- centers itself the same way regardless of where the compact
 * tile happens to sit, avoiding any scale/translate-origin math entirely. */
function StationSpotlight() {
  const frame = useLocalFrame();
  const inP = interpolate(frame, [SPOTLIGHT_IN_START, SPOTLIGHT_IN_START + SPOTLIGHT_IN_DURATION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outP = interpolate(frame, [SPOTLIGHT_OUT_START, SPOTLIGHT_OUT_START + SPOTLIGHT_OUT_DURATION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visible = Math.min(inP, 1 - outP);
  if (visible <= 0) return null;

  const perStation = STATIONS_HOLD / PREVIEW_STATIONS.length;
  const rawIndex = Math.min(PREVIEW_STATIONS.length - 1, Math.max(0, Math.floor((frame - STATIONS_START) / perStation)));
  const withinStation = Math.max(0, frame - STATIONS_START - rawIndex * perStation);
  const crossfade = interpolate(withinStation, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(visible, [0, 1], [0.85, 1]);

  // Each station renders as one complete card (photo + glyph + label
  // together), crossfading the whole unit as one -- not just the photo
  // with the label switching early, which would caption one station's
  // photo with a different station's name mid-transition.
  function Card({ index, opacity }: { index: number; opacity: number }) {
    const station = PREVIEW_STATIONS[index];
    const visuals = getStationVisuals(station.name, index);
    return (
      <div className="absolute inset-0" style={{ opacity }}>
        <Img src={station.photoUrl} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/5 to-transparent" />
        <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-ink/50">
          <StationGlyph color="var(--color-parchment)" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="font-mono text-xs uppercase tracking-wide text-parchment/70">{visuals.department}</p>
          <p className="font-display text-xl leading-tight text-parchment">{station.name}</p>
        </div>
      </div>
    );
  }

  return (
    <AbsoluteFill className="items-center justify-center" style={{ opacity: visible }}>
      <div className="relative overflow-hidden rounded-lg shadow-2xl" style={{ width: "62%", height: "78%", transform: `scale(${scale})` }}>
        <Card index={rawIndex} opacity={rawIndex === 0 ? 1 : crossfade} />
        {rawIndex > 0 && <Card index={rawIndex - 1} opacity={1 - crossfade} />}
      </div>
    </AbsoluteFill>
  );
}

export function HeroTileDrop() {
  const frame = useLocalFrame();
  const gridOpacity = interpolate(
    frame,
    [SPOTLIGHT_IN_START, SPOTLIGHT_IN_START + SPOTLIGHT_IN_DURATION, SPOTLIGHT_OUT_START, SPOTLIGHT_OUT_START + SPOTLIGHT_OUT_DURATION],
    [1, 0, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill className="bg-ink">
      <div className="grid h-full w-full grid-cols-4 grid-rows-2 gap-[3%] p-[4%]" style={{ opacity: gridOpacity }}>
        <div className="col-span-2 row-span-2">
          <TileFall delay={0}>
            <div className="flex h-full flex-col items-center justify-center gap-1 rounded-md bg-parchment">
              <ProgressRing completedCount={completedCount} totalCount={totalCount} size="compact" />
              <p className="font-sans text-[10px] text-clay-brown">modules complete</p>
            </div>
          </TileFall>
        </div>

        <div className="col-span-2 row-span-1">
          <TileFall delay={FALL_STAGGER}>
            <div className="flex h-full flex-col justify-center gap-1 rounded-md bg-parchment px-[8%]">
              <div className="flex items-center gap-1">
                <StationGlyph color="var(--color-clay-brown)" />
                <p className="truncate font-display text-[10px] font-bold text-ink">{continueModule.title}</p>
              </div>
              <p className="font-sans text-[8px] text-clay-brown">{continueModule.status}</p>
              <SegmentedProgress total={continueSectionsTotal} done={continueSectionsDone} />
            </div>
          </TileFall>
        </div>

        <div className="col-span-1 row-span-1">
          <TileFall delay={FALL_STAGGER * 2}>
            <StationCompactTile />
          </TileFall>
        </div>

        <div className="col-span-1 row-span-1">
          <TileFall delay={FALL_STAGGER * 3}>
            <div className="flex h-full flex-col items-center justify-center gap-1 rounded-md bg-ink">
              <ChitMark size={20} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" driveFrameSeconds={frame / FPS} />
              <p className="font-sans text-[8px] text-parchment">Ask something</p>
            </div>
          </TileFall>
        </div>
      </div>

      <StationSpotlight />
    </AbsoluteFill>
  );
}
