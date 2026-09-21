"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EvidenceItem = { text: string; staffName: string; stationName?: string | null; at: string };
type Evidence = { clusterReasoning?: string; items?: EvidenceItem[]; distinctStaffCount?: number; fitReasoning?: string };

export type SuggestionRow = {
  id: string;
  status: string;
  signal_type: string;
  evidence: unknown;
  headline: string;
  reasoning: string;
  proposed_content: string | null;
  blocked_reason: string | null;
  created_at: string | null;
  modules: { id: string; title: string } | null;
};

const SIGNAL_LABEL: Record<string, string> = {
  repeated_gap: "Repeated question",
  escalation_pattern: "Escalation pattern",
  near_miss_pattern: "Near miss pattern",
};

function asEvidence(value: unknown): Evidence {
  return (value ?? {}) as Evidence;
}

function SuggestionCard({ suggestion, onResolved }: { suggestion: SuggestionRow; onResolved: () => void }) {
  const router = useRouter();
  const [showEvidence, setShowEvidence] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const evidence = asEvidence(suggestion.evidence);

  async function approve() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/owner/suggestions/${suggestion.id}/approve`, { method: "POST" });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't approve this suggestion.");
      return;
    }
    onResolved();
    router.refresh();
  }

  async function dismiss() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/owner/suggestions/${suggestion.id}/dismiss`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't dismiss this suggestion.");
      return;
    }
    onResolved();
    router.refresh();
  }

  const items = evidence.items ?? [];
  const canApprove = !suggestion.blocked_reason && !!suggestion.proposed_content && !!suggestion.modules;

  return (
    <div className="space-y-3 rounded-2xl border-2 border-clay-brown/40 bg-parchment px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">{SIGNAL_LABEL[suggestion.signal_type] ?? suggestion.signal_type}</p>
        {suggestion.created_at && <p className="font-mono text-xs text-clay-brown/70">{new Date(suggestion.created_at).toLocaleDateString()}</p>}
      </div>

      <p className="font-display text-lg text-ink">{suggestion.headline}</p>
      {evidence.clusterReasoning && <p className="font-sans text-sm text-ink/80">{evidence.clusterReasoning}</p>}

      <button type="button" onClick={() => setShowEvidence((v) => !v)} className="font-mono text-xs uppercase tracking-wide text-clay-brown underline">
        {showEvidence ? "Hide evidence" : `Show evidence (${items.length})`}
      </button>
      {showEvidence && (
        <div className="space-y-2 rounded-xl bg-clay-brown/5 px-3 py-3">
          {items.map((it, i) => (
            <div key={i} className="border-b border-clay-brown/10 pb-2 last:border-0 last:pb-0">
              <p className="font-mono text-xs text-clay-brown">
                {it.staffName}
                {it.stationName ? ` · ${it.stationName}` : ""}
                {it.at ? ` · ${new Date(it.at).toLocaleDateString()}` : ""}
              </p>
              <p className="font-sans text-sm text-ink/80">&ldquo;{it.text}&rdquo;</p>
            </div>
          ))}
          {items.length === 0 && <p className="font-sans text-xs text-clay-brown">No evidence recorded.</p>}
        </div>
      )}

      {canApprove ? (
        <div className="space-y-2 rounded-2xl border-2 border-saffron/50 bg-saffron/10 px-3 py-2.5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-clay-brown">Proposed addition to {suggestion.modules!.title}</p>
          <p className="font-sans text-sm text-ink">{suggestion.proposed_content}</p>
        </div>
      ) : (
        <div className="space-y-1 rounded-2xl border-2 border-clay-brown/30 bg-clay-brown/5 px-3 py-2.5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-clay-brown">
            {suggestion.blocked_reason === "credential_reference" ? "Needs a role restriction decision" : "No module to add this to"}
          </p>
          <p className="font-sans text-sm text-ink/80">{evidence.fitReasoning}</p>
        </div>
      )}

      {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}

      <div className="flex gap-3">
        {canApprove && (
          <button
            type="button"
            onClick={approve}
            disabled={loading}
            className="rounded-full bg-preserve-red px-5 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
          >
            {loading ? "Approving…" : "Approve"}
          </button>
        )}
        <button type="button" onClick={dismiss} disabled={loading} className="font-mono text-xs uppercase tracking-wide text-clay-brown underline disabled:opacity-50">
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function SuggestionFeed({ pending, resolved }: { pending: SuggestionRow[]; resolved: SuggestionRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(pending);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  async function checkForNew() {
    setRunning(true);
    setRunError(null);
    const res = await fetch("/api/owner/suggestions/run", { method: "POST" });
    const body = await res.json().catch(() => null);
    setRunning(false);
    if (!res.ok) {
      setRunError(body?.error ?? "Couldn't check for new suggestions.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={checkForNew}
          disabled={running}
          className="rounded-full border-2 border-clay-brown/40 px-5 py-2 font-sans text-sm font-medium text-ink disabled:opacity-50"
        >
          {running ? "Checking…" : "Check for new suggestions"}
        </button>
        {runError && <p className="font-sans text-sm text-preserve-red">{runError}</p>}
      </div>

      <div className="space-y-4">
        {items.map((s) => (
          <SuggestionCard key={s.id} suggestion={s} onResolved={() => setItems((prev) => prev.filter((x) => x.id !== s.id))} />
        ))}
        {items.length === 0 && <p className="font-sans text-sm text-clay-brown">No open suggestions right now.</p>}
      </div>

      {resolved.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Recently resolved</p>
          {resolved.map((s) => (
            <div key={s.id} className="rounded-xl border-2 border-clay-brown/20 px-3 py-2.5">
              <p className="font-mono text-[11px] uppercase tracking-wide text-clay-brown">
                {s.status === "approved" ? "Approved" : "Dismissed"} · {SIGNAL_LABEL[s.signal_type] ?? s.signal_type}
              </p>
              <p className="font-sans text-sm text-ink/80">{s.headline}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
