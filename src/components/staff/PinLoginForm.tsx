"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  if (!selectedStaffId) {
    return (
      <div className="space-y-3">
        <p className="font-mono text-sm text-clay-brown">Who&apos;s this?</p>
        <div className="grid grid-cols-2 gap-3">
          {staff.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelectedStaffId(member.id)}
              className="rounded-2xl border-2 border-clay-brown/40 px-4 py-4 text-left font-display text-ink transition-transform duration-150 hover:scale-[1.03] hover:border-preserve-red"
            >
              {member.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selectedName = staff.find((s) => s.id === selectedStaffId)?.name;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setSelectedStaffId(null);
          setPin("");
          setError(null);
        }}
        className="font-mono text-xs text-clay-brown underline"
      >
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
  );
}
