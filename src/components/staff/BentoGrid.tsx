"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { openAskLarderOverlay } from "@/lib/askLarderBus";
import { ElevatedCell } from "@/components/shared/ElevatedCell";
import { ChitMark } from "@/components/shared/ChitMark";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { ParallaxPermissionPrompt } from "@/components/shared/ParallaxPermissionPrompt";
import { useViewportParallax } from "@/lib/hooks/useViewportParallax";
import { StationsGallery } from "@/components/staff/StationsGallery";

type CertRow = { id: string; name: string; status: string; label: string; color: string; days: number | null };
type ContinueModule = { id: string; title: string; status: string };

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Custom line-icon glyphs only, per the Branding Kit's standing rule — no
// stock icon library. StationGlyph matches the nav drawer's icon language
// (24x24 viewBox, 1.5 stroke weight) rather than being a one-off style.
function StationGlyph({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="8" width="18" height="3" rx="1" stroke={color} strokeWidth="1.5" />
      <line x1="6.5" y1="11" x2="6.5" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17.5" y1="11" x2="17.5" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Segmented step-progress -- real section count, decorative fill state.
 * Per-section completion isn't persisted anywhere (ModuleRunner only
 * tracks step client-side), the same limitation already accepted for the
 * checklist's in-progress ring, so "in progress" renders as roughly half
 * filled rather than an invented exact count.
 */
function SegmentedProgress({ total, done }: { total: number; done: number }) {
  if (total === 0) return null;
  return (
    <div className="mt-2 flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < done ? "bg-bay-green" : "bg-clay-brown/20"}`} />
      ))}
    </div>
  );
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
  stations,
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
  stations: { id: string; name: string; qrCodeSlug: string; qrDataUrl: string; photoUrl: string }[];
}) {
  const router = useRouter();
  const [ringAnimated, setRingAnimated] = useState(false);
  const { needsIOSPermission, requestIOSPermission } = useViewportParallax();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setRingAnimated(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const fraction = totalCount > 0 ? completedCount / totalCount : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - (ringAnimated ? fraction : 0));

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
      <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-4">
        {/* Greeting — flat Ink, full width, no photo */}
        <div
          className="animate-bento-cell-in col-span-2 rounded-2xl bg-ink px-6 py-6"
          style={{ animationDelay: "0ms" }}
        >
          <h1 className="font-display text-2xl font-bold text-parchment">
            {timeGreeting}, {staffName}.
          </h1>
          <p className="font-sans text-sm text-parchment/60">{venueName}</p>
        </div>

        {/* Overall progress — large cell, hero ring (Block J1) */}
        <div className="animate-bento-cell-in col-span-2 sm:col-span-1" style={{ animationDelay: "80ms" }}>
          <ElevatedCell
            glowColor="var(--color-bay-green)"
            floatDurationS={5.8}
            floatDelayS={0.3}
            depth="hero"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-parchment px-6 py-8"
          >
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r={RING_RADIUS} fill="none" stroke="var(--color-clay-brown)" strokeOpacity="0.2" strokeWidth="8" />
                <circle
                  cx="64"
                  cy="64"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--color-bay-green)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  style={{ transition: "stroke-dashoffset 600ms ease-out" }}
                />
              </svg>
              <span className="absolute font-display text-2xl font-bold text-ink">
                <AnimatedNumber value={completedCount} animate={ringAnimated} /> of{" "}
                <AnimatedNumber value={totalCount} animate={ringAnimated} />
              </span>
            </div>
            <p className="font-sans text-sm text-clay-brown">modules complete</p>
          </ElevatedCell>
        </div>

        {/* Continue — station glyph + segmented step-progress (Block J2) */}
        <button
          type="button"
          onClick={() => continueModule && router.push(`/${venueSlug}/modules/${continueModule.id}`)}
          disabled={!continueModule}
          className="animate-bento-cell-in col-span-2 block w-full text-left disabled:opacity-60 sm:col-span-1"
          style={{ animationDelay: "140ms" }}
        >
          <ElevatedCell
            glowColor="var(--color-clay-brown)"
            floatDurationS={5.6}
            floatDelayS={0}
            depth="secondary"
            className="rounded-2xl bg-parchment"
          >
            {continueModule ? (
              <>
                <div className="px-4 pt-4">
                  <StationGlyph color="var(--color-clay-brown)" />
                </div>
                {continuePhotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- signed/temporary URL, not worth next/image's pipeline
                  <img src={continuePhotoUrl} alt="" className="mt-2 h-24 w-full object-cover" />
                )}
                <div className="px-4 py-3">
                  <p className="font-display text-lg text-ink">{continueModule.title}</p>
                  <p className="font-sans text-xs text-clay-brown">{continueModule.status}</p>
                  <SegmentedProgress total={continueSectionsTotal} done={continueSectionsDone} />
                </div>
              </>
            ) : (
              <div className="px-4 py-8 text-center">
                <StationGlyph color="var(--color-clay-brown)" />
                <p className="mt-2 font-sans text-sm text-clay-brown">All modules complete</p>
              </div>
            )}
          </ElevatedCell>
        </button>

        {/* Certificates — fanned card-stack (Block J2) */}
        <div className="animate-bento-cell-in col-span-2 sm:col-span-1" style={{ animationDelay: "200ms" }}>
          <ElevatedCell
            glowColor={certGlowColor}
            floatDurationS={6.0}
            floatDelayS={0.6}
            depth="secondary"
            className="rounded-2xl bg-parchment px-4 py-4"
          >
            <p className="mb-3 font-mono text-xs uppercase tracking-wide text-clay-brown">Certificates</p>
            {certRows.length === 0 ? (
              <p className="font-sans text-sm text-clay-brown">None required</p>
            ) : allCertsValid ? (
              <a href={`/${venueSlug}/certs`} className="block font-sans text-sm text-bay-green">
                All certificates valid
              </a>
            ) : (
              <a href={`/${venueSlug}/certs/${frontCert.id}`} className="relative mt-2 block h-24 overflow-hidden">
                {certRows[2] && (
                  <div className="absolute inset-x-8 top-2 h-14 rotate-3 rounded-xl border-2 border-clay-brown/20 bg-parchment" />
                )}
                {certRows[1] && (
                  <div className="absolute inset-x-5 top-4 h-14 -rotate-2 rounded-xl border-2 border-clay-brown/30 bg-parchment" />
                )}
                <div
                  className="absolute inset-x-0 top-7 flex h-16 items-center justify-between rounded-xl border-2 bg-parchment px-3"
                  style={{ borderColor: frontCert.color }}
                >
                  <div>
                    <p className="font-sans text-sm text-ink">{frontCert.name}</p>
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
                    <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-xs text-parchment">
                      +{certRows.length - 1}
                    </span>
                  )}
                </div>
              </a>
            )}
          </ElevatedCell>
        </div>

        {/* Ask Larder — Ink cell, Block J3's traveling-glow chit mark */}
        <button
          type="button"
          onClick={() => openAskLarderOverlay()}
          className="animate-bento-cell-in col-span-2 block w-full sm:col-span-1"
          style={{ animationDelay: "260ms" }}
        >
          <ElevatedCell
            glowColor="var(--color-saffron)"
            floatDurationS={6.2}
            floatDelayS={1.0}
            depth="secondary"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-6"
          >
            <ChitMark size={32} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" />
            <p className="font-sans text-sm text-parchment">Ask something.</p>
          </ElevatedCell>
        </button>
      </div>

      <ParallaxPermissionPrompt visible={needsIOSPermission} onEnable={requestIOSPermission} />

      <StationsGallery venueSlug={venueSlug} stations={stations} />
    </main>
  );
}
