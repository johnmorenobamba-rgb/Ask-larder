"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { openAskLarderOverlay } from "@/lib/askLarderBus";
import { ElevatedCell } from "@/components/shared/ElevatedCell";
import { ChitMark } from "@/components/shared/ChitMark";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { ParallaxPermissionPrompt } from "@/components/shared/ParallaxPermissionPrompt";
import { useViewportParallax } from "@/lib/hooks/useViewportParallax";
import { StationsGallery } from "@/components/staff/StationsGallery";

type CertRow = { id: string; name: string; status: string; label: string; color: string; days: number | null };
type ContinueModule = { id: string; title: string; status: string };
type ShiftContext = {
  dateLabel: string;
  hasAnyWindows: boolean;
  current: { label: string; range: string } | null;
  next: { label: string; range: string } | null;
};

// Custom line-icon glyphs only, per the Branding Kit's standing rule — no
// stock icon library. StationGlyph matches the nav drawer's icon language
// (24x24 viewBox, 1.5 stroke weight) rather than being a one-off style.
// Exported -- the marketing hero's tablet preview reuses this exact glyph
// for its own real Continue-cell rendering, not a redrawn copy.
export function StationGlyph({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="8" width="18" height="3" rx="1" stroke={color} strokeWidth="1.5" />
      <line x1="6.5" y1="11" x2="6.5" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17.5" y1="11" x2="17.5" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Shift context glyph — a plain clock dial, distinct from Settings' nav
// dial (that one has no hands, this one does, reading specifically as
// "time" rather than a generic control).
function ClockGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.5" />
      <path d="M12 7.5V12l3 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Next cert expiring glyph — an hourglass, reads as "running out of time"
// distinct from the Certificates nav icon's stamp outline.
function HourglassGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 4.5h11M6.5 19.5h11M7.5 4.5c0 4 3 5.5 4.5 7 1.5-1.5 4.5-3 4.5-7M7.5 19.5c0-4 3-5.5 4.5-7 1.5 1.5 4.5 3 4.5 7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// My Ask Larder activity glyph — a small chit-bubble outline, echoing the
// Ask Larder cell's own chit language (a static line-glyph here, not the
// animated ChitMark component, which stays reserved for the actual entry
// point).
function ChitOutlineGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5V16.5H6.5a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Segmented step-progress -- real section count, decorative fill state.
 * Per-section completion isn't persisted anywhere (ModuleRunner only
 * tracks step client-side), the same limitation already accepted for the
 * checklist's in-progress ring, so "in progress" renders as roughly half
 * filled rather than an invented exact count.
 *
 * Exported -- the marketing hero's tablet preview reuses this for its own
 * real Continue-cell rendering, not a redrawn copy.
 */
export function SegmentedProgress({ total, done }: { total: number; done: number }) {
  if (total === 0) return null;
  return (
    <div className="mt-2 flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < done ? "bg-bay-green" : "bg-clay-brown/20"}`} />
      ))}
    </div>
  );
}

/**
 * Optional Remotion-driven per-cell entrance -- additive and backward
 * compatible, same pattern as ChitMark's `driveFrameSeconds`. When
 * `remotionFrame` is undefined (every real app render) cells fall back
 * entirely to the existing CSS `animate-bento-cell-in` keyframe; when
 * provided (Block N3's tile-fall beat) each cell computes its own
 * deterministic settle-in from frame math instead, so cells fall into
 * place independently rather than as one rigid unit.
 */
function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = Math.min(1, Math.max(0, t));
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function cellEntranceStyle(remotionFrame: number | undefined, delayMs: number) {
  if (remotionFrame === undefined) return { animationDelay: `${delayMs}ms` };
  const delayFrames = delayMs * 0.03;
  const duration = 18;
  const local = remotionFrame - delayFrames;
  const p = Math.min(1, Math.max(0, local / duration));
  const eased = easeOutBack(p);
  return {
    opacity: Math.min(1, Math.max(0, local / (duration * 0.55))),
    transform: `translateY(${(1 - eased) * -50}px) rotate(${(1 - eased) * -3}deg) scale(${0.9 + eased * 0.1})`,
  };
}

function cellClassName(base: string, remotionFrame: number | undefined) {
  return remotionFrame === undefined ? `animate-bento-cell-in ${base}` : base;
}

export function BentoGrid({
  venueSlug,
  staffName,
  venueName,
  timeGreeting,
  completedCount,
  totalCount,
  continueModule,
  continuePhotoUrl,
  continueSectionsTotal,
  continueSectionsDone,
  certRows,
  allCertsValid,
  nextCertExpiring,
  fallbackCount,
  activityPhotoUrl,
  shiftContext,
  stations,
  remotionFrame,
}: {
  venueSlug: string;
  staffName: string;
  venueName: string;
  timeGreeting: string;
  completedCount: number;
  totalCount: number;
  continueModule: ContinueModule | null;
  continuePhotoUrl: string | null;
  continueSectionsTotal: number;
  continueSectionsDone: number;
  certRows: CertRow[];
  allCertsValid: boolean;
  nextCertExpiring: CertRow | null;
  fallbackCount: number;
  activityPhotoUrl: string;
  shiftContext: ShiftContext;
  stations: { id: string; name: string; qrCodeSlug: string; qrDataUrl: string; photoUrl: string }[];
  /** Block N3 only -- drives per-cell entrance from a Remotion frame instead of the CSS keyframe. Leave undefined in the live app. */
  remotionFrame?: number;
}) {
  const router = useRouter();
  const [ringAnimated, setRingAnimated] = useState(false);
  const { needsIOSPermission, requestIOSPermission } = useViewportParallax();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setRingAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // certRows arrives pre-sorted most-urgent-first (home/page.tsx) -- the
  // front-of-stack card's status also drives the cell's own ambient glow,
  // so the "impressive" elevation actually reflects what's shown, not a
  // fixed color regardless of state.
  const frontCert = certRows[0];
  const certGlowColor =
    certRows.length === 0 || allCertsValid
      ? "var(--color-bay-green)"
      : frontCert.status === "expired"
        ? "var(--color-preserve-red)"
        : frontCert.status === "expiring"
          ? "var(--color-saffron)"
          : "var(--color-clay-brown)";

  return (
    <main className="min-h-screen bg-parchment px-4 pb-10 pt-24 md:px-6">
      {/*
        Block J/K redesign (31 Aug 2026 feedback round) -- moved from a
        uniform grid-cols-2 (every cell the same col-span-2/sm:col-span-1
        footprint, varying only by glow strength) to grid-cols-4 with real
        row-spans, so cells genuinely differ in size, not just shadow depth.
        Rows stay implicit `auto` (real in-flow content, not a fixed-aspect
        box) -- see the plan's reasoning for why grid-rows-* is deliberately
        NOT set here. Mobile is unchanged: unprefixed col-span-4, no
        row-span, keeps stacking full-width in DOM order exactly as before;
        the varied sm:col-span-N/sm:row-span-N values only apply at ≥640px.
      */}
      <div className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-4">
        {/* Greeting — flat Ink, full width, no photo */}
        <div
          className={cellClassName("col-span-4 rounded-2xl bg-ink px-6 py-6", remotionFrame)}
          style={cellEntranceStyle(remotionFrame, 0)}
        >
          <h1 className="font-display text-2xl font-bold text-parchment">
            {timeGreeting}, {staffName}.
          </h1>
          <p className="font-sans text-sm text-parchment/60">{venueName}</p>
        </div>

        {/* Overall progress — the true hero cell, genuinely bigger (2x2),
            not just brighter-glowing (Block J1/K). Ring itself scales up at
            sm: so it actually fills the bigger box instead of floating in
            extra whitespace; sm:min-h floors the cell's height since implicit
            auto rows would otherwise size it off its own content alone. */}
        <div
          className={cellClassName("col-span-4 sm:col-span-2 sm:row-span-2", remotionFrame)}
          style={cellEntranceStyle(remotionFrame, 80)}
        >
          <ElevatedCell
            glowColor="var(--color-bay-green)"
            floatDurationS={5.8}
            floatDelayS={0.3}
            depth="hero"
            tilt={false}
            className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl bg-parchment px-6 py-8 sm:min-h-[280px]"
          >
            <ProgressRing completedCount={completedCount} totalCount={totalCount} animate={ringAnimated} />
            <p className="font-sans text-sm text-clay-brown sm:text-base">modules complete</p>
          </ElevatedCell>
        </div>

        {/* Continue — reflowed horizontal (photo/glyph left, text right) to
            suit its new wide-short footprint instead of the old vertical
            stack; every conditional branch (no module / no photo) unchanged. */}
        <button
          type="button"
          onClick={() => continueModule && router.push(`/${venueSlug}/modules/${continueModule.id}`)}
          disabled={!continueModule}
          className={cellClassName("col-span-4 block w-full text-left disabled:opacity-60 sm:col-span-2", remotionFrame)}
          style={cellEntranceStyle(remotionFrame, 140)}
        >
          <ElevatedCell
            glowColor="var(--color-clay-brown)"
            floatDurationS={5.6}
            floatDelayS={0}
            depth="secondary"
            tilt={false}
            className="h-full rounded-2xl bg-parchment px-4 py-4"
          >
            {continueModule ? (
              // ElevatedCell's `className` prop lands on the wrapper OUTSIDE
              // .elevated-cell-content (its shared CSS has no flex of its
              // own -- see globals.css) -- a bare "flex items-center" on
              // that outer className, as this had before, never reaches
              // these two children, so they fell back to block stacking
              // (photo above title, not beside it). Declaring flex directly
              // on this wrapper, self-contained, is the fix, and matches
              // how the empty-state branch below was already written.
              <div className="flex w-full items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-clay-brown/10">
                  {continuePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed/temporary URL, not worth next/image's pipeline
                    <img src={continuePhotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <StationGlyph color="var(--color-clay-brown)" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg text-ink">{continueModule.title}</p>
                  <p className="font-sans text-xs text-clay-brown">{continueModule.status}</p>
                  <SegmentedProgress total={continueSectionsTotal} done={continueSectionsDone} />
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center justify-center gap-3 py-4">
                <StationGlyph color="var(--color-clay-brown)" />
                <p className="font-sans text-sm text-clay-brown">All modules complete</p>
              </div>
            )}
          </ElevatedCell>
        </button>

        {/* Shift context — Bento variety pass (3rd of 4 material treatments:
            textured/patterned, dot-grid on Parchment). Lightweight v1 per
            spec: today's date + whichever configured venues.shift_windows
            window contains now, no roster data invented. */}
        <div className={cellClassName("col-span-4 sm:col-span-1", remotionFrame)} style={cellEntranceStyle(remotionFrame, 200)}>
          <ElevatedCell
            glowColor="var(--color-clay-brown)"
            floatDurationS={5.9}
            floatDelayS={0.45}
            depth="secondary"
            tilt={false}
            className="bento-texture-dot h-full rounded-2xl bg-parchment px-4 py-4"
          >
            <div className="flex items-center gap-1.5">
              <ClockGlyph color="var(--color-clay-brown)" />
              <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Shift</p>
            </div>
            <p className="mt-2 font-display text-base text-ink">{shiftContext.dateLabel}</p>
            {shiftContext.current ? (
              <p className="mt-1 font-sans text-sm text-bay-green">
                On shift now: {shiftContext.current.label} ·{" "}
                <span className="font-mono text-xs">{shiftContext.current.range}</span>
              </p>
            ) : shiftContext.next ? (
              <p className="mt-1 font-sans text-sm text-clay-brown">
                Next: {shiftContext.next.label} · <span className="font-mono text-xs">{shiftContext.next.range}</span>
              </p>
            ) : shiftContext.hasAnyWindows ? (
              <p className="mt-1 font-sans text-sm text-clay-brown">No shift right now</p>
            ) : (
              <p className="mt-1 font-sans text-sm text-clay-brown">No shift schedule set</p>
            )}
          </ElevatedCell>
        </div>

        {/* Ask Larder — Ink cell, Block J3's traveling-glow chit mark */}
        <button
          type="button"
          onClick={() => openAskLarderOverlay()}
          className={cellClassName("col-span-4 block w-full sm:col-span-1", remotionFrame)}
          style={cellEntranceStyle(remotionFrame, 260)}
        >
          <ElevatedCell
            glowColor="var(--color-saffron)"
            floatDurationS={6.2}
            floatDelayS={1.0}
            depth="secondary"
            tilt={false}
            className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-6"
          >
            <ChitMark size={32} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" />
            <p className="font-sans text-sm text-parchment">Ask something.</p>
          </ElevatedCell>
        </button>

        {/* Certificates — simplified to a single front card + a "+N more"
            pill (was a 3-layer fanned stack tuned for roughly double this
            width; the fan didn't hold up at this narrower footprint).
            Ghost/outline treatment — stays the sole ghost cell (Bento
            variety pass, confirmed). */}
        <div className={cellClassName("col-span-4 sm:col-span-1", remotionFrame)} style={cellEntranceStyle(remotionFrame, 320)}>
          <ElevatedCell
            glowColor={certGlowColor}
            floatDurationS={6.0}
            floatDelayS={0.6}
            depth="secondary"
            tilt={false}
            className="h-full rounded-2xl bg-parchment px-4 py-4"
          >
            <p className="mb-3 font-mono text-xs uppercase tracking-wide text-clay-brown">Certificates</p>
            {certRows.length === 0 ? (
              <p className="font-sans text-sm text-clay-brown">None required</p>
            ) : allCertsValid ? (
              <a href={`/${venueSlug}/certs`} className="block font-sans text-sm text-bay-green">
                All certificates valid
              </a>
            ) : (
              <a href={`/${venueSlug}/certs/${frontCert.id}`} className="block">
                <div className="rounded-xl border-2 bg-parchment px-3 py-2" style={{ borderColor: frontCert.color }}>
                  <p className="truncate font-sans text-sm text-ink">{frontCert.name}</p>
                  <p className="font-mono text-xs" style={{ color: frontCert.color }}>
                    {frontCert.status === "expired" && frontCert.days !== null ? (
                      <>
                        Expired <AnimatedNumber value={Math.abs(frontCert.days)} animate={ringAnimated} />d ago
                      </>
                    ) : frontCert.status === "expiring" && frontCert.days !== null ? (
                      <>
                        Expires in <AnimatedNumber value={frontCert.days} animate={ringAnimated} />d
                      </>
                    ) : (
                      frontCert.label
                    )}
                  </p>
                </div>
                {certRows.length > 1 && (
                  <span className="mt-2 inline-block rounded-full bg-ink px-2 py-0.5 font-mono text-xs text-parchment">
                    +{certRows.length - 1} more
                  </span>
                )}
              </a>
            )}
          </ElevatedCell>
        </div>

        {/* Next cert expiring — Bento variety pass, standalone urgent cell.
            Duplicates the soonest-expiring row from Certificates above with
            independent visual weight (textured/patterned: diagonal hatch in
            Saffron, matching the existing expiring-status color convention).
            Collapses entirely — not rendered, no placeholder -- when nothing
            is genuinely close to expiring. */}
        {nextCertExpiring && (
          <div className={cellClassName("col-span-4 sm:col-span-1", remotionFrame)} style={cellEntranceStyle(remotionFrame, 380)}>
            <a href={`/${venueSlug}/certs/${nextCertExpiring.id}`} className="block h-full">
              <ElevatedCell
                glowColor="var(--color-saffron)"
                floatDurationS={5.7}
                floatDelayS={0.15}
                depth="secondary"
                tilt={false}
                className="bento-texture-hatch h-full rounded-2xl bg-parchment px-4 py-4"
              >
                <div className="flex items-center gap-1.5">
                  <HourglassGlyph color="var(--color-saffron)" />
                  <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Next expiring</p>
                </div>
                <p className="mt-2 truncate font-display text-lg text-ink">{nextCertExpiring.name}</p>
                <p className="font-mono text-xs" style={{ color: "var(--color-saffron)" }}>
                  Expires in <AnimatedNumber value={nextCertExpiring.days ?? 0} animate={ringAnimated} />d
                </p>
              </ElevatedCell>
            </a>
          </div>
        )}

        {/* My Ask Larder activity — Bento variety pass. Personal, not the
            owner's venue-wide escalations digest: how many of THIS staff
            member's own questions needed the supervisor-fallback rule.
            Photo-backed with a bottom scrim (real venue photography once a
            venue has some uploaded, same accepted stock fallback as
            Continue until then). */}
        <div className={cellClassName("col-span-4 sm:col-span-2", remotionFrame)} style={cellEntranceStyle(remotionFrame, 440)}>
          <ElevatedCell
            glowColor="var(--color-ink)"
            floatDurationS={6.1}
            floatDelayS={0.75}
            depth="secondary"
            tilt={false}
            className="relative h-full overflow-hidden rounded-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- signed/temporary URL, not worth next/image's pipeline */}
            <img src={activityPhotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="bento-photo-scrim absolute inset-0" aria-hidden="true" />
            <div className="relative flex h-full flex-col justify-end gap-1 px-4 py-4">
              <div className="flex items-center gap-1.5">
                <ChitOutlineGlyph color="var(--color-parchment)" />
                <p className="font-mono text-xs uppercase tracking-wide text-parchment/70">Ask Larder activity</p>
              </div>
              {fallbackCount > 0 ? (
                <p className="font-sans text-sm text-parchment">
                  <span className="font-display text-2xl font-bold">
                    <AnimatedNumber value={fallbackCount} animate={ringAnimated} />
                  </span>{" "}
                  sent to your supervisor recently
                </p>
              ) : (
                <p className="font-sans text-sm text-parchment">Nothing needed a supervisor recently</p>
              )}
            </div>
          </ElevatedCell>
        </div>
      </div>

      <ParallaxPermissionPrompt visible={needsIOSPermission} onEnable={requestIOSPermission} />

      <StationsGallery venueSlug={venueSlug} stations={stations} />
    </main>
  );
}
