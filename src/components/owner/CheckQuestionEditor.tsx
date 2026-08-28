"use client";

import { useState } from "react";

export function CheckQuestionEditor({ questionId, initialQuestion }: { questionId: string; initialQuestion: string }) {
  const [question, setQuestion] = useState(initialQuestion);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/owner/check-questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
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
    <div className="flex items-center gap-3">
      <input
        type="text"
        value={question}
        onChange={(e) => {
          setQuestion(e.target.value);
          setSaved(false);
        }}
        className="flex-1 rounded-2xl border-2 border-clay-brown/40 px-4 py-2 font-sans text-sm text-ink outline-none focus:border-preserve-red"
      />
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
  );
}
