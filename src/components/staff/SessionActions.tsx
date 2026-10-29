"use client";

import { useState } from "react";
import { signOutEverywhere } from "@/components/staff/signOutClient";

// Venue iPad mode: how a person leaves the shared iPad. "Log out" returns to the venue iPad home (the login page signs
// the paired iPad straight back in as the device account). "Switch user" goes to the PIN picker for the next person.
// For the device account the single action is "Log in with PIN".
export function SessionActions({ venueSlug, isDevice, onDone }: { venueSlug: string; isDevice: boolean; onDone?: () => void }) {
  const [busy, setBusy] = useState(false);

  async function leave(to: "home" | "pin") {
    setBusy(true);
    onDone?.();
    await signOutEverywhere();
    // A full page load so no signed in state from the old session survives in memory.
    window.location.assign(to === "pin" ? `/${venueSlug}/login?pin=1` : `/${venueSlug}/login`);
  }

  const base = "w-full rounded-xl border-2 px-4 py-3 font-mono text-xs uppercase tracking-wide disabled:opacity-60";
  if (isDevice) {
    return (
      <button type="button" disabled={busy} onClick={() => leave("pin")} className={`${base} border-ink bg-ink text-parchment`}>
        Log in with PIN
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <button type="button" disabled={busy} onClick={() => leave("home")} className={`${base} border-ink bg-ink text-parchment`}>
        Log out
      </button>
      <button type="button" disabled={busy} onClick={() => leave("pin")} className={`${base} border-clay-brown/50 text-ink`}>
        Switch user
      </button>
    </div>
  );
}
