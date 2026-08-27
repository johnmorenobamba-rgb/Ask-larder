"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PassSlide } from "./PassSlide";

export function SignatureForm({ venueSlug }: { venueSlug: string }) {
  const router = useRouter();
  const [typedName, setTypedName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Both the timestamp and device label depend on the client's clock/UA,
  // which never matches what the server rendered — computed after mount,
  // not during render, so hydration doesn't diff a server/client mismatch.
  const [signedLabel, setSignedLabel] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const deviceLabel = /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "tablet/desktop";
    setSignedLabel(`Signed ${now.toLocaleDateString()} at ${now.toLocaleTimeString()} on ${deviceLabel}.`);
  }, []);

  async function submit() {
    if (typedName.trim().length < 2) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/staff/complete-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typedName: typedName.trim() }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't record your signature. Check your connection and try again.");
      setLoading(false);
      return;
    }

    router.push(`/${venueSlug}/complete`);
  }

  return (
    <main className="min-h-screen bg-parchment flex items-center justify-center px-6">
      <PassSlide>
        <div className="w-full max-w-md space-y-6">
          <h1 className="font-display text-3xl font-bold text-ink">Sign to confirm</h1>
          <p className="font-sans text-ink">
            Type your full name to confirm you&apos;ve completed onboarding.
          </p>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Full name"
            autoFocus
            className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-4 font-display text-2xl text-ink focus:border-preserve-red outline-none"
          />
          {signedLabel && <p className="font-mono text-xs text-clay-brown">{signedLabel}</p>}
          {error && <p className="text-preserve-red font-sans text-sm">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={loading || typedName.trim().length < 2}
            className="w-full rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
          >
            {loading ? "Signing…" : "Confirm and sign"}
          </button>
        </div>
      </PassSlide>
    </main>
  );
}
