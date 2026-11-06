"use client";

import { useState } from "react";
import { useBusyNavigation } from "@/lib/hooks/useBusyNavigation";
import { BusyLabel } from "@/components/shared/BusyLabel";
import { useRouter } from "next/navigation";

export function ModuleStatusActions({
  moduleId,
  status,
  blockedReason,
}: {
  moduleId: string;
  status: string;
  /** Non-null disables Approve and shows why -- an unconfirmed ai_recommended_pending section, per the provenance-aware approval gate. */
  blockedReason?: string | null;
}) {
  const router = useRouter();
  // Busy until the refreshed page has rendered, not just until the request
  // returns; one request per tap.
  const { busy: loading, begin, navigate, fail } = useBusyNavigation();
  // Which action is running, so only that button changes its label.
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function transition(nextAction: "submit-for-approval" | "approve" | "go-live") {
    const action = nextAction;
    if (!begin()) return;
    setAction(action);
    setError(null);
    const res = await fetch(`/api/owner/modules/${moduleId}/${action}`, { method: "POST" }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setError(body.error ?? "Couldn't update this module. Check your connection and try again.");
      fail();
      return;
    }
    navigate(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      {status === "draft" && (
        <button
          type="button"
          onClick={() => transition("submit-for-approval")}
          disabled={loading}
          aria-busy={loading}
          className="rounded-full border-2 border-clay-brown/40 px-4 py-2 font-sans text-sm font-medium text-ink disabled:opacity-50"
        >
          <BusyLabel busy={loading && action === "submit-for-approval"} idle="Submit for approval" busyText="Submitting" />
        </button>
      )}
      {status === "pending_approval" && (
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={() => transition("approve")}
            disabled={loading || Boolean(blockedReason)}
            aria-busy={loading}
            title={blockedReason ?? undefined}
            className="rounded-full bg-preserve-red px-4 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
          >
            <BusyLabel busy={loading && action === "approve"} idle="Approve" busyText="Approving" />
          </button>
          {blockedReason && <p className="font-sans text-xs text-saffron">{blockedReason}</p>}
        </div>
      )}
      {status === "approved" && (
        <button
          type="button"
          onClick={() => transition("go-live")}
          disabled={loading}
          aria-busy={loading}
          className="rounded-full bg-preserve-red px-4 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
        >
          <BusyLabel busy={loading && action === "go-live"} idle="Go live" busyText="Going live" />
        </button>
      )}
      {error && <p className="font-sans text-xs text-preserve-red">{error}</p>}
    </div>
  );
}
