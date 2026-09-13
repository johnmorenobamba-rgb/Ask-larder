"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Block U1 -- the first real owner-facing "add staff" action; previously
// this only ever happened through the onboarding wizard or a direct script.
export function InviteStaffForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || (!email.trim() && !phone.trim()) || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/owner/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setError(body?.error ?? "Couldn't add this staff member.");
      setLoading(false);
      return;
    }

    setName("");
    setEmail("");
    setPhone("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment"
      >
        Invite staff
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        autoFocus
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
      />
      {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={loading || !name.trim() || (!email.trim() && !phone.trim())}
          className="rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add staff member"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={loading}
          className="rounded-full border-2 border-clay-brown/40 px-6 py-3 font-sans font-medium text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
