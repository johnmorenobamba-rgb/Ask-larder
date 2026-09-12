"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StationModuleSelect({
  stationId,
  currentModuleId,
  modules,
}: {
  stationId: string;
  currentModuleId: string | null;
  modules: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentModuleId ?? "");
  const [saving, setSaving] = useState(false);

  async function onChange(next: string) {
    setValue(next);
    setSaving(true);
    await fetch(`/api/owner/stations/${stationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryModuleId: next || null }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={saving}
      className="w-full rounded-xl border-2 border-clay-brown/40 px-3 py-2 font-sans text-sm text-ink outline-none focus:border-preserve-red disabled:opacity-60"
    >
      <option value="">No module linked</option>
      {modules.map((m) => (
        <option key={m.id} value={m.id}>
          {m.title}
        </option>
      ))}
    </select>
  );
}
