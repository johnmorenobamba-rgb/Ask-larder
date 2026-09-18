"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ElevatedCell } from "@/components/shared/ElevatedCell";

export function OwnerLoginForm({ redirectTo, venueSlug }: { redirectTo: string; venueSlug: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Real gap closed 18 Sep 2026: the reset-password confirmation page
  // (/owner/reset-password) existed to handle the email link, but nothing
  // anywhere actually sent that email -- a locked-out owner had no real way
  // back in. This is that missing entry point.
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function sendResetEmail() {
    if (!email || loading) return;
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
    setResetSent(true);
  }

  if (forgotMode) {
    return (
      <ElevatedCell depth="secondary" glowColor="var(--color-clay-brown)" className="rounded-3xl bg-parchment">
        <div className="space-y-4 px-6 py-6">
          {resetSent ? (
            <p className="font-sans text-ink">Check {email} for a link to set a new password.</p>
          ) : (
            <>
              <p className="font-sans text-sm text-clay-brown">Enter your email and we&apos;ll send a reset link.</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendResetEmail()}
                placeholder="Email"
                autoFocus
                className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
              />
              {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}
              <button
                type="button"
                onClick={sendResetEmail}
                disabled={loading || !email}
                className="w-full rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setForgotMode(false);
              setResetSent(false);
              setError(null);
            }}
            className="font-mono text-xs uppercase tracking-wide text-clay-brown"
          >
            Back to log in
          </button>
        </div>
      </ElevatedCell>
    );
  }

  async function submit() {
    if (!email || !password || loading) return;
    setLoading(true);
    setError(null);

    // Owners already have a real Supabase Auth email+password identity from
    // bootstrap_owner() -- unlike staff PIN login, no bcrypt/magic-link
    // workaround is needed here.
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Incorrect email or password.");
      setLoading(false);
      return;
    }

    router.push(redirectTo);
  }

  return (
    <ElevatedCell depth="secondary" glowColor="var(--color-clay-brown)" className="rounded-3xl bg-parchment">
      <div className="space-y-4 px-6 py-6">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoFocus
          className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Password"
          className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
        />
        {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={loading || !email || !password}
          className="w-full rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
        >
          {loading ? "Checking…" : "Log in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setForgotMode(true);
            setError(null);
          }}
          className="block w-full text-center font-mono text-xs uppercase tracking-wide text-clay-brown"
        >
          Forgot password?
        </button>
      </div>
    </ElevatedCell>
  );
}
