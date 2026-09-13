"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ElevatedCell } from "@/components/shared/ElevatedCell";

type RosterStaff = { id: string; name: string };

export function PinLoginForm({
  venueSlug,
  staff,
  redirectTo,
}: {
  venueSlug: string;
  staff: RosterStaff[];
  redirectTo: string;
}) {
  const router = useRouter();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Block U -- set by a 428 from login-pin (PIN never set, or just cleared
  // by an owner's "Reset PIN"). The staff member sets their own new PIN
  // here rather than an owner ever choosing it for them.
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [confirmPin, setConfirmPin] = useState("");

  async function submitPin() {
    if (!selectedStaffId || pin.length < 4) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/staff/login-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueSlug, staffUserId: selectedStaffId, pin }),
    });
    const body = await res.json();

    if (!res.ok) {
      if (res.status === 428) {
        setNeedsPinSetup(true);
        setLoading(false);
        setPin("");
        return;
      }
      setError(body.error ?? "Couldn't log in. Check your connection and try again.");
      setLoading(false);
      setPin("");
      return;
    }

    const supabase = createClient();
    await supabase.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    });
    router.push(redirectTo);
  }

  async function submitNewPin() {
    if (!selectedStaffId || pin.length < 4 || pin !== confirmPin) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/staff/set-own-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueSlug, staffUserId: selectedStaffId, pin }),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setError(body?.error ?? "Couldn't set your PIN. Try again.");
      setLoading(false);
      setPin("");
      setConfirmPin("");
      return;
    }

    // Now log in for real with the PIN just set, same flow as normal login.
    setNeedsPinSetup(false);
    setConfirmPin("");
    await submitPin();
  }

  if (!selectedStaffId) {
    return (
      <div className="space-y-3">
        <p className="font-mono text-sm text-clay-brown">Who&apos;s this?</p>
        <div className="grid grid-cols-2 gap-3">
          {staff.map((member, i) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelectedStaffId(member.id)}
              className="block w-full text-left"
            >
              <ElevatedCell
                glowColor="var(--color-clay-brown)"
                floatDurationS={5.6 + (i % 4) * 0.15}
                floatDelayS={(i % 4) * 0.15}
                depth="secondary"
                className="rounded-2xl bg-parchment px-4 py-4"
              >
                <span className="font-display text-ink">{member.name}</span>
              </ElevatedCell>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selectedName = staff.find((s) => s.id === selectedStaffId)?.name;

  function backToPicker() {
    setSelectedStaffId(null);
    setPin("");
    setConfirmPin("");
    setNeedsPinSetup(false);
    setError(null);
  }

  if (needsPinSetup) {
    return (
      <ElevatedCell depth="secondary" glowColor="var(--color-preserve-red)" className="rounded-3xl bg-parchment">
        <div className="space-y-4 px-6 py-6">
          <button type="button" onClick={backToPicker} className="font-mono text-xs text-clay-brown underline">
            Not {selectedName}?
          </button>
          <p className="font-display text-xl text-ink">Set your PIN</p>
          <p className="font-sans text-sm text-ink/70">
            Choose a 4 to 6 digit PIN. Only you will know it, your manager can&apos;t see or set it for you.
          </p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="New PIN"
            className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-mono text-2xl tracking-[0.5em] text-center text-ink focus:border-preserve-red outline-none"
            autoFocus
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Confirm PIN"
            className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-mono text-2xl tracking-[0.5em] text-center text-ink focus:border-preserve-red outline-none"
          />
          {pin.length >= 4 && confirmPin.length >= 4 && pin !== confirmPin && (
            <p className="text-preserve-red font-sans text-sm">PINs don&apos;t match.</p>
          )}
          {error && <p className="text-preserve-red font-sans text-sm">{error}</p>}
          <button
            type="button"
            onClick={submitNewPin}
            disabled={loading || pin.length < 4 || pin !== confirmPin}
            className="w-full rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
          >
            {loading ? "Saving…" : "Set PIN and log in"}
          </button>
        </div>
      </ElevatedCell>
    );
  }

  return (
    <ElevatedCell depth="secondary" glowColor="var(--color-preserve-red)" className="rounded-3xl bg-parchment">
      <div className="space-y-4 px-6 py-6">
        <button type="button" onClick={backToPicker} className="font-mono text-xs text-clay-brown underline">
          Not {selectedName}?
        </button>
        <p className="font-display text-xl text-ink">Enter your PIN</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-mono text-2xl tracking-[0.5em] text-center text-ink focus:border-preserve-red outline-none"
          autoFocus
        />
        {error && <p className="text-preserve-red font-sans text-sm">{error}</p>}
        <button
          type="button"
          onClick={submitPin}
          disabled={loading || pin.length < 4}
          className="w-full rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
        >
          {loading ? "Checking…" : "Log in"}
        </button>
      </div>
    </ElevatedCell>
  );
}
