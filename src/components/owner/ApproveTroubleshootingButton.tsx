"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApproveTroubleshootingButton({ issueId, disabled }: { issueId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/owner/station-troubleshooting/${issueId}/approve`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't approve this.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={approve}
        disabled={loading || disabled}
        title={disabled ? "Confirm this content above first." : undefined}
        className="rounded-full bg-preserve-red px-4 py-1.5 font-sans text-xs font-medium text-parchment disabled:opacity-50"
      >
        {loading ? "Approving…" : "Approve"}
      </button>
      {error && <p className="mt-1 font-sans text-xs text-preserve-red">{error}</p>}
    </div>
  );
}
