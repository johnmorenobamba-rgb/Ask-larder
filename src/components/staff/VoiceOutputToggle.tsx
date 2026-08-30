"use client";

import { useState } from "react";

export function VoiceOutputToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    await fetch("/api/staff/set-voice-output", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    setSaving(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      aria-pressed={enabled}
      className={`flex h-7 w-12 items-center rounded-full border-2 px-0.5 transition-colors ${
        enabled ? "border-bay-green bg-bay-green" : "border-clay-brown/40 bg-transparent"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-parchment transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}
