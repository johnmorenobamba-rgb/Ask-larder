"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { ElevatedCell } from "@/components/shared/ElevatedCell";
import { ChitMark } from "@/components/shared/ChitMark";
import { CertGlyph, EscalationGlyph, ReportGlyph, PhoneGlyph } from "@/components/owner/OwnerDashboardBoard";
import { CompletionRing } from "@/components/owner/StaffCompletionList";
import twoFiresDemo from "@/data/two-fires-demo.json";

export type HeroBentoPreviewHandle = {
  // needs-attention / staff-completion / escalations / contacts / suggestions / weekly-report, fall order
  cardEls: [unknown, unknown, unknown, unknown, unknown, unknown];
};

const { ownerDashboard } = twoFiresDemo;
const TIER_COLOR: Record<string, string> = {
  red: "var(--color-preserve-red)",
  saffron: "var(--color-saffron)",
  brown: "var(--color-clay-brown)",
};
const needsAttentionColor = TIER_COLOR[ownerDashboard.needsAttention.tier] ?? "var(--color-saffron)";

/**
 * Reverted to live, scroll-scrubbed GSAP (6 Sep 2026) -- John's call after
 * seeing the baked-Remotion-video version live. Rebuilt 22 Sep 2026 (2nd
 * pass, same day) from the staff dashboard preview into a real, tile-by-
 * tile replica of the actual owner/manager dashboard (OwnerDashboardBoard.tsx),
 * at John's explicit request -- a real screenshot of the live Two Fires
 * owner dashboard was taken first, then every cell here rebuilt to match
 * it exactly: same 6 real cell types, same grid shape (2x2 hero pair, a
 * 3-cell row, a 2-col standing tile), same real glyphs (CertGlyph,
 * EscalationGlyph, ReportGlyph, PhoneGlyph, exported from
 * OwnerDashboardBoard.tsx for this reuse, same convention as
 * StationGlyph/SegmentedProgress's export from BentoGrid.tsx), same real
 * CompletionRing component, and the real current Two Fires values
 * (`two-fires-demo.json`'s `ownerDashboard` field, captured live from the
 * real dashboard, not invented). Near-miss reports isn't shown here because
 * the real dashboard doesn't render that cell when the count is genuinely
 * zero, which it currently is -- this preview should go stale exactly the
 * way the real dashboard would, not stay frozen on whatever was true the
 * day this was built.
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
  const needsAttentionRef = useRef<HTMLDivElement | null>(null);
  const staffCompletionRef = useRef<HTMLDivElement | null>(null);
  const escalationsRef = useRef<HTMLDivElement | null>(null);
  const contactsRef = useRef<HTMLDivElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const weeklyReportRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      get cardEls() {
        return [
          needsAttentionRef.current,
          staffCompletionRef.current,
          escalationsRef.current,
          contactsRef.current,
          suggestionsRef.current,
          weeklyReportRef.current,
        ] as [unknown, unknown, unknown, unknown, unknown, unknown];
      },
    }),
    [],
  );

  const cardClass = reducedMotion ? "" : "opacity-0";

  return (
    <div className="grid h-full w-full grid-cols-4 grid-rows-4 gap-[3%] p-[4%]" style={{ transformStyle: "preserve-3d" }} data-hero-bento-preview>
      {/* Needs attention -- the real hero cell, same tier-colored glow/badge logic */}
      <div ref={needsAttentionRef} data-hero-card="needs-attention" className={`col-span-2 row-span-2 ${cardClass}`}>
        <ElevatedCell glowColor={needsAttentionColor} floatDurationS={5.6} floatDelayS={0} depth="hero" className="h-full rounded-md bg-parchment">
          <div className="flex h-full flex-col justify-between px-[8%] py-[6%]">
            <div className="flex items-start justify-between">
              <div
                className="flex h-4 w-4 items-center justify-center rounded-full"
                style={{ backgroundColor: `color-mix(in srgb, ${needsAttentionColor} 16%, transparent)` }}
              >
                <CertGlyph color={needsAttentionColor} />
              </div>
              <span
                className="rounded-full px-1 font-mono text-[4px] font-medium text-parchment sm:text-[5px]"
                style={{ backgroundColor: needsAttentionColor }}
              >
                +{ownerDashboard.needsAttention.extraCount}
              </span>
            </div>
            <div>
              <p className="font-mono text-[4px] uppercase tracking-wide text-clay-brown sm:text-[5px]">Needs attention</p>
              <p className="mt-0.5 truncate font-display text-[6px] leading-tight text-ink sm:text-[7px]">
                {ownerDashboard.needsAttention.primary}
              </p>
            </div>
          </div>
        </ElevatedCell>
      </div>

      {/* Staff completion -- the real team-wide aggregate hero cell */}
      <div ref={staffCompletionRef} data-hero-card="staff-completion" className={`col-span-2 row-span-2 ${cardClass}`}>
        <ElevatedCell glowColor="var(--color-bay-green)" floatDurationS={5.7} floatDelayS={0.15} depth="hero" className="h-full rounded-md bg-parchment">
          <div className="flex h-full flex-col items-center justify-center gap-1">
            <CompletionRing fraction={ownerDashboard.staffCompletionFraction} animate size={26} />
            <p className="font-mono text-[4px] uppercase tracking-wide text-clay-brown sm:text-[5px]">Staff completion</p>
            <p className="font-display text-[6px] text-ink sm:text-[7px]">
              {ownerDashboard.staffCompletionCount} staff, {Math.round(ownerDashboard.staffCompletionFraction * 100)}% complete
            </p>
          </div>
        </ElevatedCell>
      </div>

      {/* Escalations */}
      <div ref={escalationsRef} data-hero-card="escalations" className={`col-span-1 row-span-1 ${cardClass}`}>
        <ElevatedCell glowColor="var(--color-saffron)" floatDurationS={5.8} floatDelayS={0.3} depth="secondary" className="h-full rounded-md bg-parchment">
          <div className="flex h-full flex-col justify-center gap-0.5 px-[10%]">
            <div className="flex items-center gap-0.5">
              <EscalationGlyph color="var(--color-saffron)" />
              <p className="font-mono text-[4px] uppercase tracking-wide text-clay-brown sm:text-[5px]">Escalations</p>
            </div>
            <p className="font-display text-[6px] font-bold text-ink sm:text-[7px]">{ownerDashboard.escalationCount} unresolved</p>
          </div>
        </ElevatedCell>
      </div>

      {/* Contacts -- solid Clay Brown fill, matches the real cell's one distinct-fill treatment */}
      <div ref={contactsRef} data-hero-card="contacts" className={`col-span-1 row-span-1 ${cardClass}`}>
        <ElevatedCell glowColor="var(--color-clay-brown)" floatDurationS={6.1} floatDelayS={0.5} depth="secondary" className="h-full rounded-md bg-clay-brown">
          <div className="flex h-full flex-col justify-center gap-0.5 px-[10%]">
            <div className="flex items-center gap-0.5">
              <PhoneGlyph color="var(--color-parchment)" />
              <p className="font-mono text-[4px] uppercase tracking-wide text-parchment/70 sm:text-[5px]">Contacts</p>
            </div>
            <p className="font-sans text-[5px] leading-tight text-parchment sm:text-[6px]">Suppliers, tradies, who to call</p>
          </div>
        </ElevatedCell>
      </div>

      {/* Suggestions -- Ink fill, real ChitMark idle trace, real current zero-count state */}
      <div ref={suggestionsRef} data-hero-card="suggestions" className={`col-span-1 row-span-1 ${cardClass}`}>
        <ElevatedCell glowColor="var(--color-saffron)" floatDurationS={6.0} floatDelayS={0.65} depth="secondary" className="h-full rounded-md bg-ink">
          <div className="flex h-full flex-col justify-center gap-0.5 px-[10%]">
            <div className="flex items-center gap-0.5">
              <ChitMark size={12} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" />
              <p className="font-mono text-[4px] uppercase tracking-wide text-parchment/70 sm:text-[5px]">Suggestions</p>
            </div>
            <p className="font-sans text-[5px] leading-tight text-parchment/70 sm:text-[6px]">Nothing to suggest right now</p>
          </div>
        </ElevatedCell>
      </div>

      {/* Weekly report -- Ink fill, 2-col standing tile */}
      <div ref={weeklyReportRef} data-hero-card="weekly-report" className={`col-span-2 row-span-1 ${cardClass}`}>
        <ElevatedCell glowColor="var(--color-saffron)" floatDurationS={6.2} floatDelayS={0.8} depth="secondary" className="h-full rounded-md bg-ink">
          <div className="flex h-full flex-col justify-center gap-0.5 px-[6%]">
            <div className="flex items-center gap-0.5">
              <ReportGlyph color="var(--color-parchment)" />
              <p className="font-mono text-[4px] uppercase tracking-wide text-parchment/70 sm:text-[5px]">Weekly report</p>
            </div>
            <p className="font-display text-[6px] font-bold text-parchment sm:text-[7px]">
              {ownerDashboard.weeklyQuestionCount} question asked this week
            </p>
            <p className="font-sans text-[4px] text-parchment/70 sm:text-[5px]">Everything asked was covered</p>
          </div>
        </ElevatedCell>
      </div>
    </div>
  );
});
