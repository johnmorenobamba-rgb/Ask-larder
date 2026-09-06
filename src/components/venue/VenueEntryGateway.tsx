"use client";

import { useState } from "react";
import { LarderMark } from "@/components/shared/LarderMark";
import { ChitMark } from "@/components/shared/ChitMark";
import { ElevatedCell } from "@/components/shared/ElevatedCell";

// Custom line-icon glyphs, same 24x24/1.5-stroke language used everywhere
// else in this codebase (no stock icon library).
function StaffGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function OwnerGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="m8.5 15-1.5 6 5-2 5 2-1.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Block M — venue branding + a single "Login" button opening an inline
 * Owner/Staff picker, per the locked scope: routing/UI only, no new auth
 * flow. Both picker options link, unchanged, to the existing
 * `/[venueSlug]/login` (staff PIN) and `/[venueSlug]/owner/login` routes.
 * Modal pattern copied from `StationFocusOverlay.tsx` (the only existing
 * dialog in this codebase) rather than a new one.
 *
 * Creative pass (6 Sep 2026, John's call after the first version read as
 * flat next to the rest of the site): the venue identity now sits inside
 * an `ElevatedCell` (real tilt/glow/depth, same language as the staff
 * dashboard) with the real `ChitMark` reveal above it -- the same beat
 * the cold-load splash uses, reused rather than rebuilt, so this "front
 * door" moment carries the one brand mark like every other arrival point
 * does. The picker's two options get a small glyph + one-line caption
 * each instead of bare pill buttons.
 */
export function VenueEntryGateway({
  venueSlug,
  venueName,
  logoUrl,
}: {
  venueSlug: string;
  venueName: string;
  logoUrl: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">
        <ChitMark animateIn intensity="hero" size={64} />
        <ElevatedCell depth="hero" glowColor="var(--color-saffron)" className="w-full rounded-3xl bg-parchment">
          <div className="flex flex-col items-center gap-6 px-8 py-10 text-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- venue-supplied URL, no benefit from next/image at this size
              <img src={logoUrl} alt={venueName} className="h-16 w-auto" />
            ) : (
              <LarderMark size={32} />
            )}
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Welcome to</p>
              <h1 className="font-display text-4xl font-bold text-ink">{venueName}</h1>
            </div>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-full bg-ink px-7 py-3 font-sans text-sm font-medium text-parchment transition-colors hover:bg-ink/90"
            >
              Login
            </button>
          </div>
        </ElevatedCell>
      </div>

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 backdrop-blur-sm"
          onClick={() => setPickerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Choose how to log in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-surface animate-focus-in relative w-full max-w-sm overflow-hidden rounded-3xl p-6"
          >
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-parchment"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <p className="mb-4 font-display text-xl font-bold text-ink">How are you logging in?</p>
            <div className="flex flex-col gap-3">
              <a href={`/${venueSlug}/login`} className="block">
                <ElevatedCell depth="secondary" glowColor="var(--color-preserve-red)" className="rounded-2xl bg-ink">
                  <div className="flex items-center gap-3 px-5 py-4 text-left text-parchment">
                    <StaffGlyph />
                    <div>
                      <p className="font-sans text-sm font-medium">I&apos;m on shift</p>
                      <p className="font-sans text-xs text-parchment/60">Enter your PIN</p>
                    </div>
                  </div>
                </ElevatedCell>
              </a>
              <a href={`/${venueSlug}/owner/login`} className="block">
                <ElevatedCell depth="secondary" glowColor="var(--color-clay-brown)" className="rounded-2xl bg-parchment">
                  <div className="flex items-center gap-3 px-5 py-4 text-left text-ink">
                    <OwnerGlyph />
                    <div>
                      <p className="font-sans text-sm font-medium">I&apos;m the owner</p>
                      <p className="font-sans text-xs text-ink/60">Email and password</p>
                    </div>
                  </div>
                </ElevatedCell>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
