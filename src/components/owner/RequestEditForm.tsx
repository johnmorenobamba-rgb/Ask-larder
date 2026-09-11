"use client";

import { useState } from "react";

export function RequestEditForm({ moduleId }: { moduleId: string }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/owner/modules/${moduleId}/request-edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't submit the edit request.");
      return;
    }
    setDone(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="print:hidden rounded-full border-2 border-clay-brown px-5 py-2 font-sans text-sm font-medium text-ink"
      >
        Request edit
      </button>
    );
  }

  return (
    <div className="print:hidden rounded-2xl border-2 border-clay-brown/40 bg-parchment px-4 py-4">
      {done ? (
        <div className="space-y-2">
          <p className="font-sans text-ink">Edit request submitted. The founder has been notified.</p>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setDone(false);
              setDescription("");
            }}
            className="font-mono text-xs uppercase tracking-wide text-clay-brown"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="edit-description" className="font-mono text-xs uppercase tracking-wide text-clay-brown">
              What needs to change
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border-2 border-clay-brown/40 bg-parchment px-3 py-2 font-sans text-ink"
              placeholder="Describe what's changed or what needs correcting, and any relevant detail."
              required
            />
          </div>
          {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-preserve-red px-5 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit request"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono text-xs uppercase tracking-wide text-clay-brown"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
