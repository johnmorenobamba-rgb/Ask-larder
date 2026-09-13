"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ElevatedCell } from "@/components/shared/ElevatedCell";

// Real-inbox verification, added while confirming a real password reset for
// an existing owner account (2026-09-13) -- no reset-password confirmation
// page existed anywhere in this app before this. Handles both Supabase Auth
// link shapes: a `?code=` param (PKCE, needs exchangeCodeForSession) and a
// `#access_token=...&type=recovery` hash (implicit flow, the SDK's
// detectSessionInUrl already consumes it before this component mounts,
// surfacing as a PASSWORD_RECOVERY auth state change).
export function ResetPasswordForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setChecking(false);
      }
    });

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          setReady(true);
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (data.session) setReady(true);
      }
      setChecking(false);
    })();

    return () => subscription.unsubscribe();
  }, []);

  async function submit() {
    if (password.length < 8 || password !== confirmPassword || loading) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (checking) {
    return (
      <ElevatedCell depth="secondary" glowColor="var(--color-clay-brown)" className="rounded-3xl bg-parchment">
        <div className="px-6 py-6">
          <p className="font-sans text-ink">Checking your reset link…</p>
        </div>
      </ElevatedCell>
    );
  }

  if (!ready) {
    return (
      <ElevatedCell depth="secondary" glowColor="var(--color-preserve-red)" className="rounded-3xl bg-parchment">
        <div className="space-y-3 px-6 py-6">
          <p className="font-sans text-ink">
            This reset link is invalid or has expired. Request a new one from the login page.
          </p>
        </div>
      </ElevatedCell>
    );
  }

  if (done) {
    return (
      <ElevatedCell depth="secondary" glowColor="var(--color-bay-green)" className="rounded-3xl bg-parchment">
        <div className="space-y-4 px-6 py-6">
          <p className="font-sans text-ink">Password updated. You can log in with it now.</p>
          <button
            type="button"
            onClick={() => router.push(redirectTo)}
            className="w-full rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment"
          >
            Go to login
          </button>
        </div>
      </ElevatedCell>
    );
  }

  return (
    <ElevatedCell depth="secondary" glowColor="var(--color-clay-brown)" className="rounded-3xl bg-parchment">
      <div className="space-y-4 px-6 py-6">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (8+ characters)"
          className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Confirm new password"
          className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
        />
        {password.length > 0 && password.length < 8 && (
          <p className="font-sans text-sm text-preserve-red">Password needs to be at least 8 characters.</p>
        )}
        {confirmPassword.length > 0 && password !== confirmPassword && (
          <p className="font-sans text-sm text-preserve-red">Passwords don&apos;t match.</p>
        )}
        {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={loading || password.length < 8 || password !== confirmPassword}
          className="w-full rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
        >
          {loading ? "Saving…" : "Set new password"}
        </button>
      </div>
    </ElevatedCell>
  );
}
