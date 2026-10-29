"use client";

import Link from "next/link";
import { LarderMark } from "@/components/shared/LarderMark";
import { SessionActions } from "@/components/staff/SessionActions";

// Header for the shared venue iPad account: no personal pages, just the venue home, read only training and the way
// to log in with a PIN.
export function DeviceHeader({ venueSlug, venueName }: { venueSlug: string; venueName: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-4 bg-ink px-4 py-3 md:px-6">
      <Link href={`/${venueSlug}/device`} className="flex items-center gap-2">
        <LarderMark size={22} color="var(--color-parchment)" />
        <span className="font-display text-base font-bold text-parchment">Larder</span>
        <span className="hidden font-sans text-sm text-parchment/80 sm:inline">{venueName}</span>
      </Link>
      <nav className="flex items-center gap-4">
        <Link href={`/${venueSlug}/device`} className="font-mono text-xs uppercase tracking-wide text-parchment">
          Stations
        </Link>
        <Link href={`/${venueSlug}/modules`} className="font-mono text-xs uppercase tracking-wide text-parchment">
          Training
        </Link>
        <div className="w-40">
          <SessionActions venueSlug={venueSlug} isDevice />
        </div>
      </nav>
    </header>
  );
}
