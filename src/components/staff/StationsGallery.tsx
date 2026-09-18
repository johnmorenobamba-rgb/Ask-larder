"use client";

import { useState } from "react";
import Link from "next/link";
import { getStationVisuals, type StationGlyphKey } from "@/lib/staff/stationVisuals";
import { StationFocusOverlay, type FocusedStation } from "@/components/staff/StationFocusOverlay";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

type Station = {
  id: string;
  name: string;
  qrCodeSlug: string;
  qrDataUrl: string;
  photoUrl: string;
};

// Mirrors getStationsWithDisplay.ts's STOCK_STATION_PHOTO -- same URL, used
// here as this card's client-side onError fallback rather than a
// server-side default.
const STOCK_STATION_PHOTO_FALLBACK = "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=400&h=560&fit=crop";

const ROW_HEIGHT = 256;
const EXPAND_MS = 700;
const EXPAND_EASE = "cubic-bezier(0.25, 1, 0.5, 1)";

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

// The active card's "open this station" CTA -- a diagonal arrow, same
// 24x24/~1.5 stroke language as the glyphs above, distinct from a chevron
// (this opens something, it doesn't step through a list).
function OpenGlyph({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 17L17 7M17 7H9M17 7V15" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
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

function StationCard({
  station,
  glyph,
  department,
  number,
  active,
  reducedMotion,
  onActivate,
  onMouseEnter,
}: {
  station: Station;
  glyph: StationGlyphKey;
  department: string;
  number: string;
  active: boolean;
  reducedMotion: boolean;
  onActivate: () => void;
  onMouseEnter: () => void;
}) {
  const Glyph = GLYPHS[glyph];
  const transitionMs = reducedMotion ? 0 : EXPAND_MS;

  return (
    <button
      type="button"
      data-testid="station-card"
      onClick={onActivate}
      onMouseEnter={onMouseEnter}
      aria-expanded={active}
      aria-label={active ? `Open ${station.name}` : `Show ${station.name}`}
      className={`relative min-w-[56px] shrink overflow-hidden rounded-2xl text-left shadow-xl ${active ? "flex-[4]" : "flex-[1]"}`}
      style={{
        height: ROW_HEIGHT,
        transition: `flex-grow ${transitionMs}ms ${EXPAND_EASE}, flex-shrink ${transitionMs}ms ${EXPAND_EASE}`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- stock/tagged photo URL, no benefit from next/image */}
      <img
        src={station.photoUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          transform: active ? "scale(1)" : "scale(1.1)",
          filter: active ? "brightness(1)" : "brightness(0.5)",
          transition: `transform ${transitionMs}ms ${EXPAND_EASE}, filter ${transitionMs}ms ${EXPAND_EASE}`,
        }}
        // A signed URL that's gone stale (expired token, or the object was
        // deleted after this page rendered) fails at the browser's actual
        // fetch, not at render time -- with a plain <img> and no fallback,
        // that reads as a genuinely blank tile. Swap to the same stock
        // photo this card already falls back to server-side when there's
        // no tagged photo at all, so a stale token degrades to "generic
        // photo" instead of "nothing."
        onError={(e) => {
          if (e.currentTarget.src !== STOCK_STATION_PHOTO_FALLBACK) e.currentTarget.src = STOCK_STATION_PHOTO_FALLBACK;
        }}
      />

      <div
        className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent"
        style={{
          opacity: active ? 1 : 0.55,
          transition: `opacity ${transitionMs}ms ${EXPAND_EASE}`,
        }}
      />

      <div className="absolute left-3 top-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/50">
        <Glyph color="var(--color-parchment)" />
      </div>

      {active ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- server-generated data URL, no benefit from next/image */}
          <img src={station.qrDataUrl} alt="" className="absolute right-3 top-3 h-11 w-11 rounded-md bg-parchment p-1" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
            <p className="font-mono text-xs uppercase tracking-wide text-saffron">
              {number} · {department}
            </p>
            <p className="font-display text-xl leading-tight text-parchment">{station.name}</p>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-parchment/90">
              Open station
              <OpenGlyph color="var(--color-parchment)" />
            </span>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 hidden items-center justify-center pb-4 sm:flex">
          <span
            className="whitespace-nowrap font-mono text-xs uppercase tracking-wide text-parchment/90"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {station.name}
          </span>
        </div>
      )}
    </button>
  );
}

/**
 * Elastic/accordion Stations gallery -- replaces the earlier 3D rotating
 * cylinder (Block J5) with a row of cards that sit narrow at rest and
 * expand wide on activation. Tap/touch driven, not hover: this app's
 * primary device is an iPad on the pass, and a hover-only activation is
 * unreliable on touch. Two-tier tap -- tapping an inactive card only
 * expands it; tapping the already-active card performs the real "open"
 * action (the same StationFocusOverlay every prior version of this
 * gallery has used for that, owner viewers included, since it already
 * omits the navigable link for them). onMouseEnter pre-expands a card for
 * pointer users as a pure enhancement on top of that, so a mouse click
 * lands on an already-active card -- the tap logic works identically
 * with a mouse disconnected.
 */
export function StationsGallery({
  venueSlug,
  stations,
  viewerContext = "staff",
}: {
  venueSlug: string;
  stations: Station[];
  /**
   * The owner dashboard reuses this exact gallery (Block K4), but an owner
   * has no staff PIN session -- following the staff-only content href
   * dropped them on the staff login page instead of any content ("Open
   * station content" led to an odd login-page dead end, reported live).
   * The focus overlay's own doc comment already says an owner's only real
   * use of this modal is confirming a printed QR matches the right
   * station, not consuming the training content itself -- "owner" omits
   * the navigable href instead of pointing it at a login wall.
   */
  viewerContext?: "staff" | "owner";
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(stations[0]?.id ?? null);
  const [focused, setFocused] = useState<FocusedStation | null>(null);

  function openFocus(station: Station, visuals: ReturnType<typeof getStationVisuals>) {
    setFocused({
      id: station.id,
      name: station.name,
      department: visuals.department,
      number: visuals.number,
      photoUrl: station.photoUrl,
      qrDataUrl: station.qrDataUrl,
      href: viewerContext === "owner" ? null : `/${venueSlug}/station/${station.qrCodeSlug}`,
    });
  }

  if (stations.length === 0) {
    return (
      <section className="-mx-4 mt-6 md:-mx-6">
        <p className="mb-3 px-4 font-mono text-xs uppercase tracking-wide text-clay-brown md:px-6">Stations</p>
        <div className="mx-4 rounded-2xl border-2 border-dashed border-clay-brown/30 px-6 py-8 text-center md:mx-6">
          <GenericGlyph color="var(--color-clay-brown)" />
          {viewerContext === "owner" ? (
            <p className="mt-2 font-sans text-sm text-clay-brown">
              No stations set up yet.{" "}
              <Link href={`/${venueSlug}/owner/stations`} className="underline">
                Add one from the Stations page.
              </Link>
            </p>
          ) : (
            <p className="mt-2 font-sans text-sm text-clay-brown">
              No stations set up yet. Your owner can add them from the admin panel.
            </p>
          )}
        </div>
        <StationFocusOverlay station={focused} onClose={() => setFocused(null)} />
      </section>
    );
  }

  return (
    <section className="-mx-4 mt-6 md:-mx-6">
      <p className="mb-3 px-4 font-mono text-xs uppercase tracking-wide text-clay-brown md:px-6">Stations</p>

      <div className="flex gap-2 overflow-x-auto px-4 md:px-6">
        {stations.map((station, i) => {
          const visuals = getStationVisuals(station.name, i);
          const active = station.id === activeId;
          return (
            <StationCard
              key={station.id}
              station={station}
              glyph={visuals.glyph}
              department={visuals.department}
              number={visuals.number}
              active={active}
              reducedMotion={reducedMotion}
              onMouseEnter={() => setActiveId(station.id)}
              onActivate={() => {
                if (active) {
                  openFocus(station, visuals);
                } else {
                  setActiveId(station.id);
                }
              }}
            />
          );
        })}
      </div>

      <StationFocusOverlay station={focused} onClose={() => setFocused(null)} />
    </section>
  );
}
