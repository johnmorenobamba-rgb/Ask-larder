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
import { ExportDataButton } from "@/components/owner/ExportDataButton";
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

// Weekly report glyph -- a simple bar chart, distinct from the escalation
// speech-bubble language since this cell is a standing insight surface, not
// an alert.
function ReportGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="5" y1="19" x2="5" y2="11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="19" x2="19" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Contacts glyph -- a phone handset, distinct from every other tile's
// document/hazard/chart vocabulary here.
function PhoneGlyph({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3.5c1.2 0 2.3.7 2.8 1.8l.6 1.4c.4.9.2 2-.5 2.7l-1 1c-.3.3-.3.7-.1 1 1 1.9 2.6 3.5 4.5 4.5.3.2.7.2 1-.1l1-1c.7-.7 1.8-.9 2.7-.5l1.4.6c1.1.5 1.8 1.6 1.8 2.8v1.3c0 1.5-1.3 2.6-2.8 2.4-8-1-14.4-7.4-15.4-15.4-.2-1.5.9-2.8 2.4-2.8z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
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
          className="relative flex h-full min-h-[168px] sm:min-h-[280px] flex-col justify-between rounded-2xl bg-parchment px-5 py-5"
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
    <Link href={href} className="block h-full w-full">
      <ElevatedCell
        glowColor="var(--color-preserve-red)"
        floatDurationS={5.9}
        floatDelayS={0.3}
        depth="secondary"
        className="bento-texture-hatch flex h-full items-center gap-3 rounded-2xl bg-parchment px-5 py-4"
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
            {recentStation ? ` (most recent at ${recentStation})` : ""}
          </p>
        </div>
      </ElevatedCell>
    </Link>
  );
}

// Escalations -- standing tile (unlike NearMissCell, always rendered, not
// only when count > 0): "what staff needed a supervisor for" is ongoing
// operational visibility, not just an alert pile. Bento-texture-dot marks it
// as the second "alert-family" material after Near-miss's flat treatment, so
// the two read as related but distinct rather than duplicates.
function EscalationsCell({
  count,
  recentStation,
  href,
}: {
  count: number;
  recentStation: string | null;
  href: string;
}) {
  const [entered, setEntered] = useState(false);
  const color = count > 0 ? "var(--color-saffron)" : "var(--color-bay-green)";

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Link href={href} className="block h-full w-full">
      <ElevatedCell
        glowColor={color}
        floatDurationS={5.7}
        floatDelayS={0.4}
        depth="secondary"
        className="bento-texture-dot flex h-full flex-col justify-between rounded-2xl bg-parchment px-4 py-4"
      >
        <div className="flex items-center gap-1.5">
          <EscalationGlyph color={color} />
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Escalations</p>
        </div>
        {count > 0 ? (
          <p className="font-sans text-sm text-ink">
            <span className="font-display text-2xl font-bold">
              <AnimatedNumber value={count} animate={entered} />
            </span>{" "}
            unresolved{recentStation ? `, most recent at ${recentStation}` : ""}
          </p>
        ) : (
          <p className="font-sans text-sm text-bay-green">Nothing unresolved</p>
        )}
      </ElevatedCell>
    </Link>
  );
}

// Weekly report -- standing tile, Ink flat treatment (matches staff
// dashboard's one dark cell language, reserved for a single always-there
// anchor point rather than an alert color). Gives owners the same "what
// staff are asking" glance the weekly digest email already sends, without
// waiting for Monday's email to see it.
function WeeklyReportCell({
  questionCount,
  outOfScopeCount,
  topQuestion,
  href,
}: {
  questionCount: number;
  outOfScopeCount: number;
  topQuestion: string | null;
  href: string;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Link href={href} className="block h-full w-full">
      <ElevatedCell
        glowColor="var(--color-saffron)"
        floatDurationS={6.1}
        floatDelayS={0.55}
        depth="secondary"
        className="flex h-full flex-col justify-between rounded-2xl bg-ink px-5 py-4"
      >
        <div className="flex items-center gap-1.5">
          <ReportGlyph color="var(--color-parchment)" />
          <p className="font-mono text-xs uppercase tracking-wide text-parchment/70">Weekly report</p>
        </div>
        <div>
          <p className="font-sans text-sm text-parchment">
            <span className="font-display text-2xl font-bold">
              <AnimatedNumber value={questionCount} animate={entered} />
            </span>{" "}
            question{questionCount === 1 ? "" : "s"} asked this week
          </p>
          {outOfScopeCount > 0 ? (
            <p className="mt-1 truncate font-sans text-sm text-parchment/70">
              {outOfScopeCount} not covered by any SOP{topQuestion ? `, including "${topQuestion}"` : ""}
            </p>
          ) : (
            <p className="mt-1 font-sans text-sm text-parchment/70">Everything asked was covered</p>
          )}
        </div>
      </ElevatedCell>
    </Link>
  );
}

// Contacts -- solid Clay Brown fill, the one brand color not otherwise used
// as a tile background on this screen (Ink and Parchment cover everything
// else here), so the phone book reads as its own distinct surface rather
// than another parchment card with a different glyph.
function ContactsCell({ href }: { href: string }) {
  return (
    <Link href={href} className="block h-full w-full">
      <ElevatedCell
        glowColor="var(--color-clay-brown)"
        floatDurationS={6.3}
        floatDelayS={0.85}
        depth="secondary"
        className="flex h-full flex-col justify-between rounded-2xl bg-clay-brown px-4 py-4"
      >
        <div className="flex items-center gap-1.5">
          <PhoneGlyph color="var(--color-parchment)" />
          <p className="font-mono text-xs uppercase tracking-wide text-parchment/70">Contacts</p>
        </div>
        <p className="font-sans text-sm text-parchment">Suppliers, tradies, and who to call</p>
      </ElevatedCell>
    </Link>
  );
}

// Suggestions -- the one tile on this screen meant to read as alive rather
// than a static status card, in the same spirit as Contacts' distinct
// fill (Block on the suggestion assistant, 21 Sep 2026). Reuses ChitMark's
// real continuous idle animation (the traveling-glow trace already built
// for Ask Larder's own loading state) instead of a static glyph -- an
// always-on assistant quietly watching venue activity, not another alert
// tile. Ink fill (matches Ask Larder's own tile language) with a Saffron
// trace, distinguishing it from Weekly report's plain Ink cell.
function SuggestionsCell({ count, preview, href }: { count: number; preview: string | null; href: string }) {
  return (
    <Link href={href} className="block h-full w-full">
      <ElevatedCell
        glowColor="var(--color-saffron)"
        floatDurationS={6.0}
        floatDelayS={0.5}
        depth="secondary"
        className="flex h-full flex-col justify-between rounded-2xl bg-ink px-4 py-4"
      >
        <div className="flex items-center gap-1.5">
          <ChitMark size={22} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" />
          <p className="font-mono text-xs uppercase tracking-wide text-parchment/70">Suggestions</p>
        </div>
        {count > 0 ? (
          <div>
            <p className="font-sans text-sm text-parchment">
              <span className="font-display text-2xl font-bold">
                <AnimatedNumber value={count} animate />
              </span>{" "}
              open suggestion{count === 1 ? "" : "s"}
            </p>
            {preview && <p className="mt-1 truncate font-sans text-sm text-parchment/70">{preview}</p>}
          </div>
        ) : (
          <p className="font-sans text-sm text-parchment/70">Nothing to suggest right now</p>
        )}
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
      className="flex h-full min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-8 text-center sm:min-h-[280px]"
    >
      <ChitMark size={36} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" />
      <p className="font-display text-lg text-parchment">Nothing needs attention.</p>
      <p className="font-sans text-sm text-parchment/60">Certs, modules, and reports are all clear.</p>
    </ElevatedCell>
  );
}

// Fixed 14 Sep 2026: a genuinely brand-new venue (no staff invited yet)
// hit the exact same showQuietState branch as a real venue that's fully
// caught up, so "Nothing needs attention, certs/modules/reports are all
// clear" read as false reassurance -- there was nothing to be clear
// about yet. This cell only fires when the venue has zero staff; the
// moment a real venue starts, it falls back to AllClearCell/
// NeedsAttentionCell like normal.
function GettingStartedCell({ venueSlug }: { venueSlug: string }) {
  return (
    <ElevatedCell
      glowColor="var(--color-clay-brown)"
      floatDurationS={5.8}
      depth="hero"
      className="flex h-full min-h-[168px] flex-col items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-8 text-center sm:min-h-[280px]"
    >
      <ChitMark size={36} fillColor="var(--color-parchment)" traceColor="var(--color-clay-brown)" />
      <p className="font-display text-lg text-parchment">Nothing set up yet.</p>
      <p className="font-sans text-sm text-parchment/60">
        Build your first module, then invite staff once there&apos;s something for them to complete.
      </p>
      <Link href={`/${venueSlug}/owner/modules`} className="mt-1 font-mono text-xs uppercase tracking-wide text-saffron underline">
        Go to Modules
      </Link>
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
    <Link href={href} className="block h-full w-full">
      <ElevatedCell
        glowColor="var(--color-bay-green)"
        floatDurationS={5.7}
        floatDelayS={0.15}
        depth="hero"
        className="flex h-full min-h-[168px] sm:min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl bg-parchment px-5 py-6 text-center"
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
  escalationCount,
  escalationRecentStation,
  weeklyQuestionCount,
  weeklyOutOfScopeCount,
  weeklyTopQuestion,
  suggestionCount,
  suggestionPreview,
}: {
  venueSlug: string;
  flags: FlagItem[];
  nearMissCount: number;
  nearMissRecentStation: string | null;
  staff: StaffCompletionRow[];
  stations: StationDisplay[];
  escalationCount: number;
  escalationRecentStation: string | null;
  weeklyQuestionCount: number;
  weeklyOutOfScopeCount: number;
  weeklyTopQuestion: string | null;
  suggestionCount: number;
  suggestionPreview: string | null;
}) {
  const showQuietState = flags.length === 0 && nearMissCount === 0;
  const isGenuinelyNewVenue = staff.length === 0;
  const { needsIOSPermission, requestIOSPermission } = useViewportParallax();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-ink">Dashboard</h1>
        <ExportDataButton />
      </div>

      {/*
        grid-cols-4 with real row-spans, matching the staff dashboard's own
        bento treatment (BentoGrid.tsx) instead of a uniform grid-cols-2
        where every cell only differed by glow color. Needs-attention and
        Staff completion pair up as the two hero cells (2x2, flat Parchment,
        same "genuinely bigger, not just brighter" language as staff's
        Overall-progress hero); Near-miss/Escalations/Weekly report fill the
        row underneath at 1/1/2 columns, each carrying a different material
        (hatch texture, dot texture, flat Ink) so they read as distinct
        surfaces rather than three copies of the same card.
      */}
      <div className="grid grid-cols-4 gap-4">
        {showQuietState ? (
          <div className="col-span-4 sm:col-span-2 sm:row-span-2">
            {isGenuinelyNewVenue ? <GettingStartedCell venueSlug={venueSlug} /> : <AllClearCell />}
          </div>
        ) : (
          flags.length > 0 && (
            <div className="col-span-4 sm:col-span-2 sm:row-span-2">
              <NeedsAttentionCell flags={flags} />
            </div>
          )
        )}

        <div className="col-span-4 sm:col-span-2 sm:row-span-2">
          <StaffCompletionSummaryCell staff={staff} href={`/${venueSlug}/owner/staff`} />
        </div>

        {!showQuietState && nearMissCount > 0 && (
          <div className="col-span-4 sm:col-span-1">
            <NearMissCell
              count={nearMissCount}
              recentStation={nearMissRecentStation}
              href={`/${venueSlug}/owner/near-misses?status=unresolved`}
            />
          </div>
        )}

        <div className="col-span-4 sm:col-span-1">
          <EscalationsCell
            count={escalationCount}
            recentStation={escalationRecentStation}
            href={`/${venueSlug}/owner/escalations`}
          />
        </div>

        <div className="col-span-4 sm:col-span-1">
          <ContactsCell href={`/${venueSlug}/owner/contacts`} />
        </div>

        <div className="col-span-4 sm:col-span-1">
          <SuggestionsCell count={suggestionCount} preview={suggestionPreview} href={`/${venueSlug}/owner/suggestions`} />
        </div>

        <div className="col-span-4 sm:col-span-2">
          <WeeklyReportCell
            questionCount={weeklyQuestionCount}
            outOfScopeCount={weeklyOutOfScopeCount}
            topQuestion={weeklyTopQuestion}
            href={`/${venueSlug}/owner/weekly-report`}
          />
        </div>
      </div>

      <StationsGallery venueSlug={venueSlug} stations={stations} viewerContext="owner" />
      <ParallaxPermissionPrompt visible={needsIOSPermission} onEnable={requestIOSPermission} />
    </div>
  );
}
