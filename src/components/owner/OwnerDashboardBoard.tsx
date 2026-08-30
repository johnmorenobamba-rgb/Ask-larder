"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ElevatedCell } from "@/components/shared/ElevatedCell";
import { ChitMark } from "@/components/shared/ChitMark";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { ParallaxPermissionPrompt } from "@/components/shared/ParallaxPermissionPrompt";
import { useViewportParallax } from "@/lib/hooks/useViewportParallax";
import { useMagneticPull } from "@/lib/hooks/useMagneticPull";
import { StationsGallery } from "@/components/staff/StationsGallery";
import { CompletionRing, type StaffCompletionRow } from "@/components/owner/StaffCompletionList";
import type { StationDisplay } from "@/lib/stations/getStationsWithDisplay";

export type FlagTier = "red" | "saffron" | "brown";
export type FlagGlyphKey = "cert" | "module" | "escalation";

export type FlagItem = {
  key: string;
  tier: FlagTier;
  href: string;
  glyph: FlagGlyphKey;
  primary: string;
  secondary?: string;
};

const TIER_COLOR: Record<FlagTier, string> = {
  red: "var(--color-preserve-red)",
  saffron: "var(--color-saffron)",
  brown: "var(--color-clay-brown)",
};

// Custom line-icon glyphs, matching the nav drawer / bento cell icon
// language (24x24 viewBox, ~1.5 stroke weight) -- no stock icon library,
// per the Branding Kit's standing rule.
function CertGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="10" r="6" stroke={color} strokeWidth="1.5" />
      <path d="M9 15.5L7.5 21l4.5-2 4.5 2-1.5-5.5" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function ModuleGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h9l3 3v15H6z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15 3v3h3" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="9" y1="12" x2="15" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="16" x2="13" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HazardGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l10 18H2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="12" y1="10" x2="12" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="18" r="1" fill={color} />
    </svg>
  );
}

function EscalationGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16v11H9l-4 4v-4H4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="14.5" r="1" fill={color} />
    </svg>
  );
}

const GLYPHS: Record<FlagGlyphKey, (props: { color: string }) => React.JSX.Element> = {
  cert: CertGlyph,
  module: ModuleGlyph,
  escalation: EscalationGlyph,
};

// The individual flag row, unchanged from J6 -- reused inside K1's popup
// rather than rebuilt, per the spec's explicit "the existing per-flag
// component isn't wasted, it moves into the popup instead."
function FlagCard({ flag, index }: { flag: FlagItem; index: number }) {
  const Glyph = GLYPHS[flag.glyph];
  const color = TIER_COLOR[flag.tier];
  const magneticRef = useMagneticPull<HTMLAnchorElement>();
  return (
    <Link
      ref={magneticRef}
      href={flag.href}
      className="animate-bento-cell-in block"
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      <ElevatedCell
        glowColor={color}
        floatDurationS={5.6 + (index % 5) * 0.15}
        floatDelayS={(index % 5) * 0.2}
        className="flex items-center gap-3 rounded-2xl bg-parchment px-4 py-3"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
        >
          <Glyph color={color} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-ink">{flag.primary}</p>
          {flag.secondary && (
            <p className="font-mono text-xs" style={{ color }}>
              {flag.secondary}
            </p>
          )}
        </div>
      </ElevatedCell>
    </Link>
  );
}

function CloseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// K1's popup -- every flag, same staggered ElevatedCell list J6 built,
// just reached via a tap instead of being the whole home screen.
function NeedsAttentionModal({ flags, onClose }: { flags: FlagItem[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Needs attention"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-surface animate-focus-in flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <p className="font-display text-xl font-bold text-ink">Needs attention</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/10 text-ink"
          >
            <CloseGlyph />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 py-5">
          {flags.map((flag, i) => (
            <FlagCard key={flag.key} flag={flag} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Block K1 — compact needs-attention cell. Shows only the single most
 * urgent flag's headline plus a count badge for the rest; tapping opens
 * the full list in NeedsAttentionModal above.
 */
function NeedsAttentionCell({ flags }: { flags: FlagItem[] }) {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const top = flags[0];
  const Glyph = GLYPHS[top.glyph];
  const color = TIER_COLOR[top.tier];

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full text-left">
        <ElevatedCell
          glowColor={color}
          floatDurationS={5.6}
          depth="hero"
          className="relative flex h-full min-h-[168px] flex-col justify-between rounded-2xl bg-parchment px-5 py-5"
        >
          <div className="flex items-start justify-between">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
            >
              <Glyph color={color} />
            </div>
            {flags.length > 1 && (
              <span
                className="rounded-full px-2.5 py-1 font-mono text-xs font-medium text-parchment"
                style={{ backgroundColor: color }}
              >
                +<AnimatedNumber value={flags.length - 1} animate={entered} />
              </span>
            )}
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Needs attention</p>
            <p className="mt-1 font-display text-lg leading-tight text-ink">{top.primary}</p>
          </div>
        </ElevatedCell>
      </button>
      {open && <NeedsAttentionModal flags={flags} onClose={() => setOpen(false)} />}
    </>
  );
}

// K2 — near-miss reports, pulled out of the general flag pile into its own
// dedicated cell, sized smaller/lighter than the two hero cells (same
// grid column width, tighter vertical padding, single line of content).
function NearMissCell({
  count,
  recentStation,
  href,
}: {
  count: number;
  recentStation: string | null;
  href: string;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Link href={href} className="block w-full">
      <ElevatedCell
        glowColor="var(--color-preserve-red)"
        floatDurationS={5.9}
        floatDelayS={0.3}
        depth="secondary"
        className="flex items-center gap-3 rounded-2xl bg-parchment px-5 py-4"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "color-mix(in srgb, var(--color-preserve-red) 16%, transparent)" }}
        >
          <HazardGlyph color="var(--color-preserve-red)" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Near-miss reports</p>
          <p className="truncate font-sans text-ink">
            <AnimatedNumber value={count} animate={entered} /> unresolved
            {recentStation ? ` — most recent at ${recentStation}` : ""}
          </p>
        </div>
      </ElevatedCell>
    </Link>
  );
}

// K5's quiet-state collapse: when there are truly no flags AND no
// unresolved near-misses, one small confident cell replaces both, rather
// than two mostly-empty cells taking up grid space.
function AllClearCell() {
  return (
    <ElevatedCell
      glowColor="var(--color-saffron)"
      floatDurationS={5.8}
      depth="hero"
      className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-8 text-center"
    >
      <ChitMark size={36} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" />
      <p className="font-display text-lg text-parchment">Nothing needs attention.</p>
      <p className="font-sans text-sm text-parchment/60">Certs, modules, and reports are all clear.</p>
    </ElevatedCell>
  );
}

// K3 — staff completion as a team-wide aggregate hero cell (single big
// ring + fraction, matching the staff dashboard's own "Overall progress"
// hero cell language) instead of every staff member individually elevated
// on the home grid. Tapping opens the full per-staff ring list (still
// StaffCompletionList's ElevatedCell rings) on the Staff detail screen.
function StaffCompletionSummaryCell({ staff, href }: { staff: StaffCompletionRow[]; href: string }) {
  const [entered, setEntered] = useState(false);
  const totalCompleted = staff.reduce((sum, s) => sum + s.completed, 0);
  const totalPossible = staff.reduce((sum, s) => sum + s.total, 0);
  const fraction = totalPossible > 0 ? totalCompleted / totalPossible : 0;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Link href={href} className="block w-full">
      <ElevatedCell
        glowColor="var(--color-bay-green)"
        floatDurationS={5.7}
        floatDelayS={0.15}
        depth="hero"
        className="flex h-full min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl bg-parchment px-5 py-6 text-center"
      >
        <CompletionRing fraction={fraction} animate={entered} size={72} />
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Staff completion</p>
          <p className="font-display text-lg text-ink">
            <AnimatedNumber value={staff.length} animate={entered} /> staff,{" "}
            <AnimatedNumber value={Math.round(fraction * 100)} animate={entered} />% complete
          </p>
        </div>
      </ElevatedCell>
    </Link>
  );
}

export function OwnerDashboardBoard({
  venueSlug,
  flags,
  nearMissCount,
  nearMissRecentStation,
  staff,
  stations,
}: {
  venueSlug: string;
  flags: FlagItem[];
  nearMissCount: number;
  nearMissRecentStation: string | null;
  staff: StaffCompletionRow[];
  stations: StationDisplay[];
}) {
  const showQuietState = flags.length === 0 && nearMissCount === 0;
  const { needsIOSPermission, requestIOSPermission } = useViewportParallax();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-ink">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        {showQuietState ? (
          <div className="col-span-2 sm:col-span-1">
            <AllClearCell />
          </div>
        ) : (
          flags.length > 0 && (
            <div className="col-span-2 sm:col-span-1">
              <NeedsAttentionCell flags={flags} />
            </div>
          )
        )}

        <div className={`col-span-2 ${showQuietState || flags.length > 0 ? "sm:col-span-1" : ""}`}>
          <StaffCompletionSummaryCell staff={staff} href={`/${venueSlug}/owner/staff`} />
        </div>

        {!showQuietState && nearMissCount > 0 && (
          <div className="col-span-2 sm:col-span-1">
            <NearMissCell
              count={nearMissCount}
              recentStation={nearMissRecentStation}
              href={`/${venueSlug}/owner/near-misses?status=unresolved`}
            />
          </div>
        )}
      </div>

      <StationsGallery venueSlug={venueSlug} stations={stations} />
      <ParallaxPermissionPrompt visible={needsIOSPermission} onEnable={requestIOSPermission} />
    </div>
  );
}
