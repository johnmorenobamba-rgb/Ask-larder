"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Real gap found while scoping the Settings rebuild (18 Sep 2026): nothing
 * anywhere in the app could ever send a password reset email -- the
 * confirmation page (/owner/reset-password) existed to handle the email
 * link, but nothing sent it. Login page's "Forgot password?" covers the
 * locked-out case; this is the same mechanism for an owner who's still
 * signed in and just wants to change their password.
 */
export function ChangePasswordCard({ email, venueSlug }: { email: string; venueSlug: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function sendResetEmail() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${venueSlug}/owner/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError("Couldn't send the reset email right now. Try again in a moment.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
      <p className="font-display text-ink">Change password</p>
      {sent ? (
        <p className="font-sans text-sm text-bay-green">Check {email} for a link to set a new password.</p>
      ) : (
        <>
          <p className="font-sans text-sm text-clay-brown">Sends a reset link to {email}.</p>
          {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}
          <button
            type="button"
            onClick={sendResetEmail}
            disabled={loading}
            className="rounded-full border-2 border-clay-brown px-5 py-2 font-sans text-sm font-medium text-ink disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </>
      )}
    </div>
  );
}
