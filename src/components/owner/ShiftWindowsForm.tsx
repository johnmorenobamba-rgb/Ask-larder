"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function toRangeInputs(range: string | undefined): { start: string; end: string } {
  if (!range) return { start: "", end: "" };
  const [start, end] = range.split("-");
  return { start: start ?? "", end: end ?? "" };
}

export function ShiftWindowsForm({ opening, closing }: { opening: string | undefined; closing: string | undefined }) {
  const router = useRouter();
  const initialOpening = toRangeInputs(opening);
  const initialClosing = toRangeInputs(closing);
  const [openingStart, setOpeningStart] = useState(initialOpening.start);
  const [openingEnd, setOpeningEnd] = useState(initialOpening.end);
  const [closingStart, setClosingStart] = useState(initialClosing.start);
  const [closingEnd, setClosingEnd] = useState(initialClosing.end);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/owner/venue/shift-windows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opening: openingStart && openingEnd ? `${openingStart}-${openingEnd}` : "",
        closing: closingStart && closingEnd ? `${closingStart}-${closingEnd}` : "",
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't save shift windows.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
      <div>
        <p className="font-display text-ink">Shift windows</p>
        <p className="font-mono text-xs text-clay-brown">
          Shown to staff on their home screen, and given to Ask Larder as context. Leave a window blank to remove it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="font-mono text-xs uppercase tracking-wide text-clay-brown">Opening</label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={openingStart}
              onChange={(e) => setOpeningStart(e.target.value)}
              className="w-full rounded-xl border-2 border-clay-brown/40 px-2 py-2 font-mono text-sm text-ink outline-none focus:border-preserve-red"
            />
            <span className="font-mono text-xs text-clay-brown">to</span>
            <input
              type="time"
              value={openingEnd}
              onChange={(e) => setOpeningEnd(e.target.value)}
              className="w-full rounded-xl border-2 border-clay-brown/40 px-2 py-2 font-mono text-sm text-ink outline-none focus:border-preserve-red"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase tracking-wide text-clay-brown">Closing</label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={closingStart}
              onChange={(e) => setClosingStart(e.target.value)}
              className="w-full rounded-xl border-2 border-clay-brown/40 px-2 py-2 font-mono text-sm text-ink outline-none focus:border-preserve-red"
            />
            <span className="font-mono text-xs text-clay-brown">to</span>
            <input
              type="time"
              value={closingEnd}
              onChange={(e) => setClosingEnd(e.target.value)}
              className="w-full rounded-xl border-2 border-clay-brown/40 px-2 py-2 font-mono text-sm text-ink outline-none focus:border-preserve-red"
            />
          </div>
        </div>
      </div>

      {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}
      {saved && !error && <p className="font-sans text-sm text-bay-green">Saved.</p>}

      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="rounded-full bg-preserve-red px-5 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save shift windows"}
      </button>
    </div>
  );
}
