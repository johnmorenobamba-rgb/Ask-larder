"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClientDetailsForm({
  tradingName,
  legalName,
  abn,
  address,
  ownerName,
  ownerEmail,
  ownerPhone,
}: {
  tradingName: string;
  legalName: string;
  abn: string;
  address: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ tradingName, legalName, abn, address, ownerName, ownerPhone });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setLoading(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/owner/settings/client-details", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't save these details.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
      <p className="font-display text-ink">Client details</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Trading name" value={form.tradingName} onChange={(v) => set("tradingName", v)} />
        <Field label="Legal business name" value={form.legalName} onChange={(v) => set("legalName", v)} />
        <Field label="ABN" value={form.abn} onChange={(v) => set("abn", v)} />
        <Field label="Address" value={form.address} onChange={(v) => set("address", v)} />
        <Field label="Your name" value={form.ownerName} onChange={(v) => set("ownerName", v)} />
        <Field label="Your phone" value={form.ownerPhone} onChange={(v) => set("ownerPhone", v)} />
      </div>

      <div>
        <label className="font-mono text-xs uppercase tracking-wide text-clay-brown">Your login email</label>
        <p className="mt-1 font-sans text-sm text-ink/70">{ownerEmail || "Not set"}</p>
        <p className="font-mono text-xs text-clay-brown">Contact us to change the email you log in with.</p>
      </div>

      {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}
      {saved && !error && <p className="font-sans text-sm text-bay-green">Saved.</p>}

      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="rounded-full bg-preserve-red px-5 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
      >
        {loading ? "Saving…" : "Save client details"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="font-mono text-xs uppercase tracking-wide text-clay-brown">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-clay-brown/40 px-3 py-2 font-sans text-sm text-ink outline-none focus:border-preserve-red"
      />
    </div>
  );
}
