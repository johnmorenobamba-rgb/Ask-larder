"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { KeyRoleLoginNote } from "./KeyRoleLoginNote";
import { inputClass, labelClass, cardClass, primaryButtonClass, errorClass } from "./fieldStyles";

export function RsaMarshalForm({
  venueSlug,
  staffRoles,
  initial,
}: {
  venueSlug: string;
  staffRoles: { id: string; name: string }[];
  initial: { roleIds: string[]; marshalDesignated: boolean; marshalName: string; marshalPhone: string; marshalEmail: string };
}) {
  const router = useRouter();
  const [roleIds, setRoleIds] = useState<string[]>(initial.roleIds);
  const [marshalDesignated, setMarshalDesignated] = useState<boolean | null>(initial.marshalDesignated || null);
  const [marshalName, setMarshalName] = useState(initial.marshalName);
  const [marshalPhone, setMarshalPhone] = useState(initial.marshalPhone);
  const [marshalEmail, setMarshalEmail] = useState(initial.marshalEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = roleIds.length > 0 && marshalDesignated !== null && (!marshalDesignated || marshalName.trim());

  function toggleRole(id: string) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  async function submit() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/owner/onboarding/rsa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleIds, marshalDesignated, marshalName, marshalPhone, marshalEmail }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save RSA setup.");
      return;
    }

    const flags = body.flags as VenueTypeFlags;
    router.push(stepHref(venueSlug, getNextStep("rsa", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">RSA</h2>
        <p className="font-sans text-sm text-ink/70">Which roles need RSA certification, and does this venue designate an RSA marshal?</p>
      </div>

      <div className={cardClass}>
        <fieldset className="space-y-2">
          <legend className={labelClass}>Roles that require RSA</legend>
          {staffRoles.length === 0 && (
            <p className="font-sans text-sm text-ink/70">Add staff roles first on the Staff roles page, then come back here.</p>
          )}
          {staffRoles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 font-sans text-sm text-ink">
              <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
              {r.name}
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className={labelClass}>Does this venue designate an RSA marshal?</legend>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMarshalDesignated(false)}
              className={`rounded-full border-2 px-4 py-2 font-sans text-sm ${marshalDesignated === false ? "border-preserve-red text-preserve-red" : "border-clay-brown/40 text-ink"}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setMarshalDesignated(true)}
              className={`rounded-full border-2 px-4 py-2 font-sans text-sm ${marshalDesignated === true ? "border-preserve-red text-preserve-red" : "border-clay-brown/40 text-ink"}`}
            >
              Yes
            </button>
          </div>
        </fieldset>

        {marshalDesignated && (
          <>
            <KeyRoleLoginNote />
            <div className="space-y-1">
              <label className={labelClass}>Marshal's name</label>
              <input type="text" value={marshalName} onChange={(e) => setMarshalName(e.target.value)} placeholder="Marshal's name" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Phone</label>
              <input type="text" value={marshalPhone} onChange={(e) => setMarshalPhone(e.target.value)} placeholder="Phone" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Email</label>
              <input type="email" value={marshalEmail} onChange={(e) => setMarshalEmail(e.target.value)} placeholder="Email" className={inputClass} />
            </div>
          </>
        )}

        {error && <p className={errorClass}>{error}</p>}
        <button type="button" onClick={submit} disabled={loading || !valid} className={primaryButtonClass}>
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
