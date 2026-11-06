"use client";

import { useState } from "react";
import { useBusyNavigation } from "@/lib/hooks/useBusyNavigation";
import { BusyLabel } from "@/components/shared/BusyLabel";
import { useRouter } from "next/navigation";

export function ApproveFaqButton({ faqId, disabled }: { faqId: string; disabled?: boolean }) {
  const router = useRouter();
  // Busy until the refreshed page has rendered, not just until the request
  // returns; one request per tap.
  const { busy: loading, begin, navigate, fail } = useBusyNavigation();
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    if (!begin()) return;
    setError(null);
    const res = await fetch(`/api/owner/station-faqs/${faqId}/approve`, { method: "POST" }).catch(() => null);
    if (!res || !res.ok) {
      const body = res ? await res.json().catch(() => null) : null;
      setError(body?.error ?? "Couldn't approve this. Check your connection and try again.");
      fail();
      return;
    }
    navigate(() => router.refresh());
  }

  return (
    <div>
      <button
        type="button"
        onClick={approve}
        disabled={loading || disabled}
        aria-busy={loading}
        title={disabled ? "Confirm this content above first." : undefined}
        className="rounded-full bg-preserve-red px-4 py-1.5 font-sans text-xs font-medium text-parchment disabled:opacity-50"
      >
        <BusyLabel busy={loading} idle="Approve" busyText="Approving" spinnerSize={12} />
      </button>
      {error && <p className="mt-1 font-sans text-xs text-preserve-red">{error}</p>}
    </div>
  );
}
