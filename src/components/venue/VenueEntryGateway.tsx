"use client";

import { useState } from "react";
import { LarderMark } from "@/components/shared/LarderMark";

/**
 * Block M — venue branding + a single "Login" button opening an inline
 * Owner/Staff picker, per the locked scope: routing/UI only, no new auth
 * flow. Both picker options link, unchanged, to the existing
 * `/[venueSlug]/login` (staff PIN) and `/[venueSlug]/owner/login` routes.
 * Modal pattern copied from `StationFocusOverlay.tsx` (the only existing
 * dialog in this codebase) rather than a new one: `bg-ink/70
 * backdrop-blur-sm` scrim, `glass-surface animate-focus-in` panel,
 * click-outside and an explicit close button both dismiss it.
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
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- venue-supplied URL, no benefit from next/image at this size
          <img src={logoUrl} alt={venueName} className="h-16 w-auto" />
        ) : (
          <LarderMark size={40} />
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
              <a
                href={`/${venueSlug}/login`}
                className="rounded-full bg-ink px-5 py-3 text-center font-sans text-sm font-medium text-parchment transition-colors hover:bg-ink/90"
              >
                I&apos;m on shift
              </a>
              <a
                href={`/${venueSlug}/owner/login`}
                className="rounded-full border border-ink/20 px-5 py-3 text-center font-sans text-sm font-medium text-ink transition-colors hover:bg-ink/5"
              >
                I&apos;m the owner
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
