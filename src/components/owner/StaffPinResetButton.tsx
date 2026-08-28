"use client";

import { useState } from "react";

export function StaffPinResetButton({ staffUserId }: { staffUserId: string }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (pin.length < 4 || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/staff/set-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffUserId, pin }),
    });
    const body = await res.json();

    if (!res.ok) {
      setError(body.error ?? "Couldn't reset PIN.");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border-2 border-clay-brown/40 px-4 py-2 font-sans text-sm text-ink"
      >
        Reset PIN
      </button>
    );
  }

  if (done) {
    return <p className="font-sans text-sm text-bay-green">PIN reset.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        placeholder="New PIN"
        className="w-24 rounded-full border-2 border-clay-brown/40 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-preserve-red"
      />
      <button
        type="button"
        onClick={submit}
        disabled={loading || pin.length < 4}
        className="rounded-full bg-preserve-red px-4 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
      >
        Save
      </button>
      {error && <p className="font-sans text-xs text-preserve-red">{error}</p>}
    </div>
  );
}
