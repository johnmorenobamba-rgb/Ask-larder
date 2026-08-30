"use client";

import { useState } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { useCylinderCarousel } from "@/lib/hooks/useCylinderCarousel";
import { getStationVisuals, type StationGlyphKey } from "@/lib/staff/stationVisuals";
import { StationFocusOverlay, type FocusedStation } from "@/components/staff/StationFocusOverlay";

type Station = {
  id: string;
  name: string;
  qrCodeSlug: string;
  qrDataUrl: string;
  photoUrl: string;
};

const CARD_WIDTH = 200;
const CARD_HEIGHT = 280;
const MIN_OPACITY = 0.35;
const MIN_SCALE = 0.72;
// At exactly 3 stations (the old threshold), neighbors sit at ±120deg --
// past backfaceVisibility:hidden's 90deg cutoff, so they're invisible at
// rest and the carousel reads as a flat single card with chevrons, no
// peeking, no depth. Confirmed live: this happens on EITHER dashboard with
// 3 stations, not a component divergence (staff and owner render
// byte-identical given equal data -- see the comparison this threshold
// change was verified against). Raised to 5 (72deg neighbors, cos(72)>0,
// genuinely visible even if grazing) so the cylinder actually looks like
// one at rest. Fewer than 5 stations get the flat-row fallback instead of
// a technically-3D-but-looks-flat cylinder.
const MIN_CYLINDER_COUNT = 5;

function normalizeAngle(deg: number) {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

// Custom line-icon glyphs, matching the nav drawer / bento cell icon
// language (24x24 viewBox, ~1.5 stroke weight) -- no stock icon library,
// per the Branding Kit's standing rule. Small fixed set, one per
// station-type keyword match in stationVisuals.ts, plus a generic fallback.
function CoffeeGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z" stroke={color} strokeWidth="1.5" />
      <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" stroke={color} strokeWidth="1.5" />
      <path d="M8.5 5.5c0 1-1 1-1 2M12 5.5c0 1-1 1-1 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FridgeGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="3" width="12" height="18" rx="1.5" stroke={color} strokeWidth="1.5" />
      <line x1="6" y1="11" x2="18" y2="11" stroke={color} strokeWidth="1.5" />
      <line x1="9" y1="6" x2="9" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="14" x2="9" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BarGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4h12l-5 8v6h3M12 12v6H9" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PassGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="8" width="18" height="3" rx="1" stroke={color} strokeWidth="1.5" />
      <line x1="6.5" y1="11" x2="6.5" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17.5" y1="11" x2="17.5" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GenericGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

function ChevronGlyph({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="var(--color-ink)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const GLYPHS: Record<StationGlyphKey, (props: { color: string }) => React.JSX.Element> = {
  coffee: CoffeeGlyph,
  fridge: FridgeGlyph,
  bar: BarGlyph,
  pass: PassGlyph,
  generic: GenericGlyph,
};

function CardFace({
  station,
  fillColor,
  glyph,
  department,
  number,
}: {
  station: Station;
  fillColor: string;
  glyph: StationGlyphKey;
  department: string;
  number: string;
}) {
  const Glyph = GLYPHS[glyph];
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl shadow-xl"
      style={{ backgroundColor: fillColor }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- stock/tagged photo URL, no benefit from next/image */}
      <img src={station.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/15 to-transparent" />
      <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink/50">
        <Glyph color="var(--color-parchment)" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- server-generated data URL, no benefit from next/image */}
      <img src={station.qrDataUrl} alt="" className="absolute right-3 top-3 h-11 w-11 rounded-md bg-parchment p-1" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="font-mono text-xs text-parchment/80">
          {number} · {department}
        </p>
        <p className="font-display text-lg leading-tight text-parchment">{station.name}</p>
      </div>
    </div>
  );
}

function CarouselCard({
  station,
  fillColor,
  glyph,
  department,
  number,
  angle,
  radius,
  falloffDeg,
  anglePerCard,
  rotationY,
  onFocus,
}: {
  station: Station;
  fillColor: string;
  glyph: StationGlyphKey;
  department: string;
  number: string;
  angle: number;
  radius: number;
  falloffDeg: number;
  anglePerCard: number;
  rotationY: MotionValue<number>;
  onFocus: () => void;
}) {
  // Derived per-card, not React state -- dragging the cylinder shouldn't
  // re-render every card every frame, same discipline as J1's tilt/
  // spotlight and the original coverflow hook this replaces.
  //
  // falloffDeg is capped at ~85% of the actual spacing between cards (not
  // a fixed 90deg) -- at 90deg fixed, six cards spaced 60deg apart barely
  // dim by the time a neighbor is one step away, so the front card's text
  // was visibly competing with its neighbor's. Scaling the window to the
  // real spacing means an adjacent card is always most of the way to its
  // minimum, whatever the station count.
  const opacity = useTransform(rotationY, (r) => {
    const t = Math.min(1, Math.abs(normalizeAngle(r + angle)) / falloffDeg);
    return 1 - t * (1 - MIN_OPACITY);
  });
  // A raw transform STRING, not separate rotateY/z/scale style props --
  // framer-motion composes individual transform shorthand props in a fixed
  // internal order (translate, then rotate, then scale) regardless of the
  // order they're listed in the style object. That order rotates each card
  // around its OWN already-translated center instead of around the shared
  // cylinder axis -- confirmed live via getBoundingClientRect() on every
  // card: instead of spreading around a circle, all six clustered near the
  // same off-center point. Building the string directly gives rotateY the
  // outer position (rotate the local axis first) and translateZ the inner
  // position (then push outward along the NEW axis), which is what a
  // cylinder actually needs.
  const transform = useTransform(rotationY, (r) => {
    const t = Math.min(1, Math.abs(normalizeAngle(r + angle)) / falloffDeg);
    const s = 1 - t * (1 - MIN_SCALE);
    return `rotateY(${angle}deg) translateZ(${radius}px) scale(${s})`;
  });
  // CSS 3D transforms don't reliably depth-sort pointer-event hit-testing
  // to match what's actually painted on top -- confirmed live via
  // elementFromPoint() at the visual front card's screen center: it
  // returned a DIFFERENT card (the last one in DOM order), not the one
  // actually visible there. Relying on the browser to route a click to the
  // right card was a real bug, not just a test artifact -- a user could
  // tap the front card and open the wrong station. Fixed by explicitly
  // gating pointer-events to only whichever single card is currently
  // nearest to front (a clean Voronoi split at half the card spacing), so
  // there's never ambiguity about which element receives the click,
  // independent of whatever the browser's paint order happens to be.
  const pointerEvents = useTransform(rotationY, (r) =>
    Math.abs(normalizeAngle(r + angle)) < anglePerCard / 2 ? "auto" : "none",
  );

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 cursor-pointer"
      data-station-card={station.id}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        marginLeft: -CARD_WIDTH / 2,
        marginTop: -CARD_HEIGHT / 2,
        transform,
        opacity,
        pointerEvents,
        backfaceVisibility: "hidden",
      }}
      onClick={onFocus}
    >
      <CardFace station={station} fillColor={fillColor} glyph={glyph} department={department} number={number} />
    </motion.div>
  );
}

/**
 * Block J5 redo — Personal Dashboard spec's "Stations gallery" section,
 * rebuilt from a flat coverflow scroll into a true 3D rotating cylinder
 * (drag-physics rotateY carousel, spring-damped settle, click-to-focus
 * zoom) per the direction pivot toward "genuinely impressive." Built from
 * John's description of the reference technique -- no reference files
 * exist in the repo -- adapted so each cylinder face carries real station
 * content (photo, name, department/number, QR chip) rather than the
 * reference's bare image.
 *
 * Dots AND chevron buttons are both kept as non-drag fallbacks for
 * discoverability (flagged, not decided silently): drag-to-spin is the
 * primary, novel interaction, but nothing here requires discovering it --
 * a user who never drags can still reach every station.
 *
 * Fewer than 3 stations can't form a real cylinder (the radius formula
 * divides by tan(pi/count), which is 0 at count<=2) -- those render as a
 * plain flat row instead, still fully featured (click-to-focus included).
 */
export function StationsGallery({ venueSlug, stations }: { venueSlug: string; stations: Station[] }) {
  const [focused, setFocused] = useState<FocusedStation | null>(null);
  const { rotationY, onPan, onPanEnd, activeIndex, goToIndex, anglePerCard } = useCylinderCarousel(stations.length);

  function openFocus(station: Station, visuals: ReturnType<typeof getStationVisuals>) {
    setFocused({
      id: station.id,
      name: station.name,
      department: visuals.department,
      number: visuals.number,
      photoUrl: station.photoUrl,
      qrDataUrl: station.qrDataUrl,
      href: `/${venueSlug}/station/${station.qrCodeSlug}`,
    });
  }

  if (stations.length === 0) {
    return (
      <section className="-mx-4 mt-6 md:-mx-6">
        <p className="mb-3 px-4 font-mono text-xs uppercase tracking-wide text-clay-brown md:px-6">Stations</p>
        <div className="mx-4 rounded-2xl border-2 border-dashed border-clay-brown/30 px-6 py-8 text-center md:mx-6">
          <GenericGlyph color="var(--color-clay-brown)" />
          <p className="mt-2 font-sans text-sm text-clay-brown">
            No stations set up yet. Your owner can add them from the admin panel.
          </p>
        </div>
        <StationFocusOverlay station={focused} onClose={() => setFocused(null)} />
      </section>
    );
  }

  // Cards visible at width, arranged so the front-facing one sits at
  // radius distance from the cylinder's central axis without overlapping
  // its neighbors -- the standard N-gon-inscribed-circle radius formula.
  const radius = stations.length >= MIN_CYLINDER_COUNT ? CARD_WIDTH / 2 / Math.tan(Math.PI / stations.length) : 0;

  if (stations.length < MIN_CYLINDER_COUNT) {
    return (
      <section className="-mx-4 mt-6 md:-mx-6">
        <p className="mb-3 px-4 font-mono text-xs uppercase tracking-wide text-clay-brown md:px-6">Stations</p>
        <div className="flex justify-center gap-4 px-4 md:px-6">
          {stations.map((station, i) => {
            const visuals = getStationVisuals(station.name, i);
            return (
              <div key={station.id} style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
                <div className="cursor-pointer" onClick={() => openFocus(station, visuals)}>
                  <CardFace
                    station={station}
                    fillColor={visuals.fillColor}
                    glyph={visuals.glyph}
                    department={visuals.department}
                    number={visuals.number}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <StationFocusOverlay station={focused} onClose={() => setFocused(null)} />
      </section>
    );
  }

  return (
    <section className="-mx-4 mt-6 md:-mx-6">
      <p className="mb-3 px-4 font-mono text-xs uppercase tracking-wide text-clay-brown md:px-6">Stations</p>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          aria-label="Previous station"
          onClick={() => goToIndex(activeIndex - 1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-parchment shadow"
        >
          <ChevronGlyph direction="left" />
        </button>

        <div className="relative h-[300px] w-full max-w-xs overflow-hidden" style={{ perspective: 700 }}>
          <motion.div
            className="absolute left-1/2 top-1/2 h-0 w-0"
            data-carousel-pivot=""
            style={{ rotateY: rotationY, transformStyle: "preserve-3d", touchAction: "pan-y" }}
            onPan={onPan}
            onPanEnd={onPanEnd}
          >
            {stations.map((station, i) => {
              const visuals = getStationVisuals(station.name, i);
              return (
                <CarouselCard
                  key={station.id}
                  station={station}
                  fillColor={visuals.fillColor}
                  glyph={visuals.glyph}
                  department={visuals.department}
                  number={visuals.number}
                  angle={i * anglePerCard}
                  radius={radius}
                  falloffDeg={Math.min(90, anglePerCard * 0.85)}
                  anglePerCard={anglePerCard}
                  rotationY={rotationY}
                  onFocus={() => openFocus(station, visuals)}
                />
              );
            })}
          </motion.div>
        </div>

        <button
          type="button"
          aria-label="Next station"
          onClick={() => goToIndex(activeIndex + 1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-parchment shadow"
        >
          <ChevronGlyph direction="right" />
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {stations.map((station, i) => (
          <button
            key={station.id}
            type="button"
            aria-label={`Go to ${station.name}`}
            onClick={() => goToIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === activeIndex ? "w-4 bg-preserve-red" : "w-1.5 bg-clay-brown/30"
            }`}
          />
        ))}
      </div>

      <StationFocusOverlay station={focused} onClose={() => setFocused(null)} />
    </section>
  );
}
