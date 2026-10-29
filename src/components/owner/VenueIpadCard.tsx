"use client";

import { useState } from "react";

type Device = { id: string; label: string; created_at: string; last_seen_at: string | null };

// Owner settings card for venue iPad mode. "Set up this iPad" pairs the device the owner is signed in on, so it can
// sign itself in as the shared venue iPad account. "Stop all iPads" revokes every pairing for the venue.
export function VenueIpadCard({ devices: initial }: { devices: Device[] }) {
  const [devices, setDevices] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function pair() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/owner/ipad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Venue iPad" }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage(body?.error ?? "Couldn't pair this iPad. Try again.");
    } else {
      setMessage("This iPad is paired. Log out, then open the staff login to see the venue iPad home.");
      setDevices((d) => [{ id: crypto.randomUUID(), label: "Venue iPad", created_at: new Date().toISOString(), last_seen_at: null }, ...d]);
    }
    setBusy(false);
  }

  async function revokeAll() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/owner/ipad", { method: "DELETE" });
    if (res.ok) {
      setDevices([]);
      setMessage("All paired iPads are stopped.");
    } else {
      setMessage("Couldn't stop the iPads. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
      <p className="font-display text-ink">Venue iPad</p>
      <p className="font-sans text-sm text-ink/80">
        Open Larder on the venue iPad, log in as the owner here, then tap Set up this iPad. After that the iPad opens to
        stations, FAQs, read only training and Ask Larder with no PIN. Staff log in with their own PIN for anything
        personal, and the iPad logs them out after five minutes of no use.
      </p>
      <p className="font-sans text-sm text-clay-brown">
        {devices.length === 0 ? "No iPads paired." : `${devices.length} iPad${devices.length === 1 ? "" : "s"} paired.`}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={pair}
          className="rounded-xl bg-ink px-4 py-2 font-mono text-xs uppercase tracking-wide text-parchment disabled:opacity-60"
        >
          Set up this iPad
        </button>
        {devices.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={revokeAll}
            className="rounded-xl border-2 border-clay-brown/50 px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink disabled:opacity-60"
          >
            Stop all iPads
          </button>
        )}
      </div>
      {message && <p role="status" className="font-sans text-sm text-ink">{message}</p>}
    </div>
  );
}
