"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PassSlide } from "./PassSlide";
import type { OutstandingAcknowledgement } from "@/lib/staff/outstandingAcknowledgements";

/**
 * Lightweight re-confirmation for a changed procedure, not a full
 * re-signature — deliberately not Stamp-based, since Stamp is locked to
 * exactly three moments (module completion, cert upload, e-signature) and
 * this isn't one of them.
 */
export function ModuleUpdateNotice({
  venueSlug,
  outstanding,
}: {
  venueSlug: string;
  outstanding: OutstandingAcknowledgement[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acknowledge() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/staff/acknowledge-module-version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleVersionIds: outstanding.map((o) => o.moduleVersionId),
      }),
    });

    if (!res.ok) {
      setError("Couldn't save that — check your connection and try again.");
      setLoading(false);
      return;
    }

    router.push(`/${venueSlug}/modules`);
  }

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <PassSlide>
        <div className="mx-auto w-full max-w-lg space-y-6">
          <h1 className="font-display text-3xl font-bold text-ink">
            Something changed since you last checked
          </h1>
          <p className="font-sans text-ink">
            Review what&apos;s changed below before your next shift.
          </p>
          <ul className="space-y-4">
            {outstanding.map((item) => (
              <li
                key={item.moduleVersionId}
                className="rounded-2xl border-2 border-clay-brown/20 px-4 py-4"
              >
                <p className="font-display text-lg text-ink">{item.moduleTitle}</p>
                <p className="font-sans text-sm text-clay-brown">
                  {item.changelog ?? "This procedure was updated."}
                </p>
              </li>
            ))}
          </ul>
          {error && <p className="text-preserve-red font-sans text-sm">{error}</p>}
          <button
            type="button"
            onClick={acknowledge}
            disabled={loading}
            className="w-full rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
          >
            {loading ? "Saving…" : "Got it — continue"}
          </button>
        </div>
      </PassSlide>
    </main>
  );
}
