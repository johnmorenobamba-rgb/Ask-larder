"use client";

import { useState } from "react";

export function SectionContentEditor({ sectionId, initialContent }: { sectionId: string; initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/owner/module-sections/${sectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Couldn't save.");
      return;
    }
    setSaved(true);
  }

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setSaved(false);
        }}
        rows={4}
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={loading || saved}
          className="rounded-full bg-preserve-red px-4 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
        >
          {saved ? "Saved" : loading ? "Saving…" : "Save"}
        </button>
        {error && <p className="font-sans text-xs text-preserve-red">{error}</p>}
      </div>
    </div>
  );
}
