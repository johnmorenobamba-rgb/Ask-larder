"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveNearMissButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/owner/near-miss/${reportId}/resolve`, { method: "PATCH" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Couldn't resolve.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={resolve}
        disabled={loading}
        className="rounded-full bg-preserve-red px-4 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
      >
        Mark resolved
      </button>
      {error && <p className="font-sans text-xs text-preserve-red">{error}</p>}
    </div>
  );
}
