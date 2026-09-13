"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Block U1 -- replaces StaffPinResetButton.tsx. That component let the
// owner type a staff member's new PIN directly and submit it -- the exact
// thing this block was asked to stop doing (same principle as never
// letting an admin see or set a password). Reset now only ever clears the
// PIN; the staff member sets their own new one on next login.
export function StaffLifecycleActions({ staffUserId, staffName }: { staffUserId: string; staffName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"reset" | "deactivate" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);

  async function resetPin() {
    setLoading("reset");
    setMessage(null);
    const res = await fetch(`/api/owner/staff/${staffUserId}/reset-pin`, { method: "POST" });
    const body = await res.json().catch(() => null);
    setLoading(null);
    if (!res.ok) {
      setMessage(body?.error ?? "Couldn't reset PIN.");
      return;
    }
    setMessage("PIN cleared. They'll set a new one next time they log in.");
  }

  async function deactivate() {
    setLoading("deactivate");
    setMessage(null);
    const res = await fetch(`/api/owner/staff/${staffUserId}/deactivate`, { method: "POST" });
    const body = await res.json().catch(() => null);
    setLoading(null);
    setConfirmingDeactivate(false);
    if (!res.ok) {
      setMessage(body?.error ?? "Couldn't deactivate this staff member.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={resetPin}
          disabled={loading !== null}
          className="rounded-full border-2 border-clay-brown/40 px-4 py-2 font-sans text-sm text-ink disabled:opacity-50"
        >
          {loading === "reset" ? "Resetting…" : "Reset PIN"}
        </button>
        {!confirmingDeactivate ? (
          <button
            type="button"
            onClick={() => setConfirmingDeactivate(true)}
            disabled={loading !== null}
            className="rounded-full border-2 border-preserve-red/60 px-4 py-2 font-sans text-sm text-preserve-red disabled:opacity-50"
          >
            Deactivate
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={deactivate}
              disabled={loading !== null}
              className="rounded-full bg-preserve-red px-4 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
            >
              {loading === "deactivate" ? "Deactivating…" : `Confirm: remove ${staffName}?`}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDeactivate(false)}
              className="font-mono text-xs text-clay-brown underline"
            >
              Cancel
            </button>
          </>
        )}
      </div>
      {message && <p className="font-sans text-xs text-clay-brown">{message}</p>}
    </div>
  );
}
