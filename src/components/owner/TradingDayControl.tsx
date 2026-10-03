"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const HOURS = Array.from({ length: 13 }, (_, h) => h);
const label = (h: number) => (h === 0 ? "Midnight" : h === 12 ? "12 noon" : `${h}am`);

// The hour a new trading day starts. A closing form made before it counts for the day that just ended.
export function TradingDayControl({ initialHour }: { initialHour: number }) {
  const router = useRouter();
  const [hour, setHour] = useState(initialHour);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(next: number) {
    setBusy(true);
    setMessage(null);
    const before = hour;
    setHour(next);
    try {
      const res = await fetch("/api/owner/compliance/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tradingDayCutoffHour: next }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setHour(before);
        setMessage(typeof data.error === "string" ? data.error : "Couldn't save that. Try again.");
      } else {
        setMessage("Saved.");
        router.refresh();
      }
    } catch {
      setHour(before);
      setMessage("Couldn't reach the server. Try again.");
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="trading-day" className="space-y-2 rounded-2xl border-2 border-clay-brown px-4 py-4">
      <h2 id="trading-day" className="font-display text-xl font-bold text-ink">
        Trading day
      </h2>
      <p className="font-sans text-sm text-ink/80">
        A new trading day starts at this hour. A closing form saved before it counts for the day that just ended, so a venue that closes at 1am is not marked as behind the next morning.
      </p>
      <label className="flex flex-wrap items-center gap-3 font-sans text-base text-ink">
        <span className="font-medium">New day starts at</span>
        <select
          value={hour}
          disabled={busy}
          onChange={(e) => save(Number(e.target.value))}
          className="min-h-12 rounded-xl border-2 border-clay-brown bg-parchment px-3 font-sans text-base text-ink"
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {label(h)}
            </option>
          ))}
        </select>
      </label>
      {message && (
        <p role="status" className="font-sans text-sm text-ink/80">
          {message}
        </p>
      )}
    </section>
  );
}
