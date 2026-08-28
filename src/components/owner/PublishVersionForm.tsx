"use client";

import { useState } from "react";

export function PublishVersionForm({ moduleId }: { moduleId: string }) {
  const [changelog, setChangelog] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!changelog.trim() || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/owner/modules/${moduleId}/publish-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changelog }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Couldn't publish.");
      return;
    }
    setDone(true);
    setChangelog("");
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
      <p className="font-display text-ink">Publish an update</p>
      <p className="font-sans text-sm text-clay-brown">
        Bumps this module&apos;s version and requires every staff member to re-acknowledge it.
      </p>
      <input
        type="text"
        value={changelog}
        onChange={(e) => {
          setChangelog(e.target.value);
          setDone(false);
        }}
        placeholder="What changed?"
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      />
      <button
        type="button"
        onClick={submit}
        disabled={loading || !changelog.trim()}
        className="rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
      >
        {loading ? "Publishing…" : "Publish update"}
      </button>
      {done && <p className="font-sans text-sm text-bay-green">Published.</p>}
      {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}
    </div>
  );
}
