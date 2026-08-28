"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ModuleStatusActions({ moduleId, status }: { moduleId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function transition(action: "approve" | "go-live") {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/owner/modules/${moduleId}/${action}`, { method: "POST" });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Couldn't update this module.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {status === "pending_approval" && (
        <button
          type="button"
          onClick={() => transition("approve")}
          disabled={loading}
          className="rounded-full bg-preserve-red px-4 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
        >
          Approve
        </button>
      )}
      {status === "approved" && (
        <button
          type="button"
          onClick={() => transition("go-live")}
          disabled={loading}
          className="rounded-full bg-preserve-red px-4 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
        >
          Go live
        </button>
      )}
      {error && <p className="font-sans text-xs text-preserve-red">{error}</p>}
    </div>
  );
}
