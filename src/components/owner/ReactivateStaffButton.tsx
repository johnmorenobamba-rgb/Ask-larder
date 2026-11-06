"use client";

import { useBusyState } from "@/lib/hooks/useBusyNavigation";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Block U1 -- the discoverable undo for deactivate, since leaving that
// action with no reverse would be a real gap.
export function ReactivateStaffButton({ staffUserId }: { staffUserId: string }) {
  const router = useRouter();
  // Stays busy until the refresh/navigation below has rendered.
  const [loading, setLoading, navigate] = useBusyState();
  const [error, setError] = useState<string | null>(null);

  async function reactivate() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/owner/staff/${staffUserId}/reactivate`, { method: "POST" });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't reactivate this staff member.");
      return;
    }
    navigate(() => router.refresh());
  }

  return (
    <div>
      <button
        type="button"
        onClick={reactivate}
        disabled={loading}
        className="rounded-full border-2 border-clay-brown/40 px-4 py-2 font-sans text-sm text-ink disabled:opacity-50"
      >
        {loading ? "Reactivating" : "Reactivate"}
      </button>
      {error && <p className="font-sans text-xs text-preserve-red">{error}</p>}
    </div>
  );
}
