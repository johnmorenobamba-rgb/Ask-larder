"use client";

import { useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  isEscalation?: boolean;
};

/**
 * Persistent chat entry point, per the PRD's "general Ask Larder view" —
 * mounted both floating in the protected layout (no stationId) and on a
 * station page (with stationId, for role/station-context scoping). Follows
 * NearMissReportButton's convention: floating trigger + modal panel, route
 * re-derives identity server-side, never trusts a client-supplied venue/user
 * id. Positioned bottom-left so it doesn't collide with the near-miss
 * button's bottom-right placement.
 */
export function AskLarderChat({ stationId }: { venueSlug: string; stationId?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/staff/ask-larder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, stationId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't get an answer right now.");

      setMessages((prev) => [...prev, { role: "assistant", text: body.answer, isEscalation: body.isEscalation }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get an answer right now.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 rounded-full bg-preserve-red px-5 py-3 font-sans text-sm font-medium text-parchment shadow-lg"
      >
        Ask Larder
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-6 sm:items-center">
      <div className="flex w-full max-w-md flex-col space-y-4 rounded-2xl bg-parchment p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Ask Larder</h2>
          <button type="button" onClick={() => setOpen(false)} className="font-mono text-xs text-clay-brown">
            Close
          </button>
        </div>

        <div className="max-h-80 space-y-3 overflow-y-auto">
          {messages.length === 0 && (
            <p className="font-sans text-sm text-clay-brown">Ask anything from your training.</p>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <p key={i} className="font-sans text-sm italic text-ink">
                {m.text}
              </p>
            ) : (
              <div
                key={i}
                className={`rounded-2xl border-2 px-4 py-3 ${
                  m.isEscalation ? "border-preserve-red" : "border-bay-green"
                }`}
              >
                <p className="font-sans text-sm text-ink">{m.text}</p>
              </div>
            ),
          )}
          {loading && <p className="font-sans text-sm text-clay-brown">Thinking…</p>}
        </div>

        {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}

        <div className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Type your question"
            className="flex-1 rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading || !question.trim()}
            className="rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
