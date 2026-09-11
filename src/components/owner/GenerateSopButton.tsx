"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateSopButton({
  moduleId,
  hasExisting,
}: {
  moduleId: string;
  hasExisting: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/owner/modules/${moduleId}/generate-sop-document`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't generate the SOP document.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="rounded-full bg-preserve-red px-5 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
      >
        {busy ? "Generating…" : hasExisting ? "Regenerate" : "Generate SOP document"}
      </button>
      {error && <p className="mt-2 font-sans text-sm text-preserve-red">{error}</p>}
    </div>
  );
}
