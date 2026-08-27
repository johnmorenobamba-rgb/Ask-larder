"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stamp } from "./Stamp";

const AUTO_ADVANCE_DELAY_MS = 1800;

/**
 * End-of-onboarding screen. Reuses the e-signature's Stamp visually (large,
 * centered) rather than firing a fourth distinct trust moment — per the
 * Branding Kit, the Stamp fires at exactly three moments (module
 * completion, cert upload, e-signature), and this screen is the very next
 * beat after the third, not a new one.
 */
export function CompleteScreen({
  venueSlug,
  staffName,
  venueName,
  completedDate,
  hasSeenIntro,
}: {
  venueSlug: string;
  staffName: string;
  venueName: string;
  completedDate: string;
  hasSeenIntro: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (hasSeenIntro) return;
    const timer = setTimeout(() => {
      router.push(`/${venueSlug}/intro`);
    }, AUTO_ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasSeenIntro, router, venueSlug]);

  return (
    <main className="min-h-screen bg-parchment flex items-center justify-center px-6">
      <div className="text-center space-y-6">
        <h1 className="font-display text-4xl font-bold text-ink">You&apos;re set up.</h1>
        <Stamp size="large" label="Onboarding complete" />
        <p className="font-mono text-sm text-clay-brown">
          APPROVED · {staffName} · {venueName} · {completedDate}
        </p>
        <p className="font-sans text-ink max-w-sm mx-auto">
          Everything you just went through stays available — come back any time to check it
          again.
        </p>
        <button
          type="button"
          disabled
          className="rounded-full border-2 border-clay-brown/40 px-6 py-2 font-sans text-sm text-clay-brown opacity-60"
        >
          Ask Larder — coming soon
        </button>
        {!hasSeenIntro && (
          <p className="font-mono text-xs text-clay-brown">One more thing before you start…</p>
        )}
        {hasSeenIntro && (
          <button
            type="button"
            onClick={() => router.push(`/${venueSlug}/modules`)}
            className="block mx-auto rounded-full bg-preserve-red px-8 py-3 font-sans font-medium text-parchment"
          >
            Back to modules
          </button>
        )}
      </div>
    </main>
  );
}
