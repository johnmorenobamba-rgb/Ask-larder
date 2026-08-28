"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateStationForm({ modules }: { modules: { id: string; title: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [qrCodeSlug, setQrCodeSlug] = useState("");
  const [primaryModuleId, setPrimaryModuleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !qrCodeSlug.trim() || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/owner/stations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, qrCodeSlug, primaryModuleId: primaryModuleId || null }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Couldn't create station.");
      return;
    }

    setName("");
    setQrCodeSlug("");
    setPrimaryModuleId("");
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
      <p className="font-display text-ink">New station</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Station name"
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      />
      <input
        type="text"
        value={qrCodeSlug}
        onChange={(e) => setQrCodeSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))}
        placeholder="qr-code-slug"
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-mono text-sm text-ink outline-none focus:border-preserve-red"
      />
      <select
        value={primaryModuleId}
        onChange={(e) => setPrimaryModuleId(e.target.value)}
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      >
        <option value="">No module</option>
        {modules.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={loading || !name.trim() || !qrCodeSlug.trim()}
        className="rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create station"}
      </button>
    </div>
  );
}
