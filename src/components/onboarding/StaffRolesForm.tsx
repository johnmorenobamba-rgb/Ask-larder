"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEPARTMENTS, FALLBACK_TIERS } from "@/lib/onboarding/constants";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { inputClass, selectClass, labelClass, cardClass, primaryButtonClass, secondaryButtonClass, errorClass, rowClass } from "./fieldStyles";

type Role = { id: string; name: string; department: string | null; fallback_tier: string | null };

export function StaffRolesForm({
  venueSlug,
  existing,
  initialRosterLocation,
}: {
  venueSlug: string;
  existing: Role[];
  initialRosterLocation: string;
}) {
  const router = useRouter();
  const [rosterLocation, setRosterLocation] = useState(initialRosterLocation);
  const [rosterSaved, setRosterSaved] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [fallbackTier, setFallbackTier] = useState("frontline");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveRosterLocation() {
    await fetch("/api/owner/onboarding/staff-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rosterLocation }),
    });
    setRosterSaved(true);
    router.refresh();
  }

  async function addRole() {
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/owner/onboarding/staff-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, department, fallbackTier }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save this role.");
      return;
    }
    setName("");
    setDepartment("");
    setFallbackTier("frontline");
    router.refresh();
  }

  function continueWizard() {
    const flags: VenueTypeFlags = {};
    router.push(stepHref(venueSlug, getNextStep("staff-roles", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Staff roles</h2>
        <p className="font-sans text-sm text-ink/70">The roles actually used at this venue, and where staff check who is on shift.</p>
      </div>

      <div className={cardClass}>
        <div className="space-y-1">
          <label className={labelClass}>Roster location</label>
          <p className="font-sans text-xs text-ink/60">Where staff actually check who is on shift, e.g. physical board, shared doc, or an app name.</p>
          <div className="flex gap-2">
            <input
              value={rosterLocation}
              onChange={(e) => {
                setRosterLocation(e.target.value);
                setRosterSaved(false);
              }}
              placeholder="Roster location"
              className={inputClass}
            />
            <button type="button" onClick={saveRosterLocation} className={secondaryButtonClass}>
              {rosterSaved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <p className={labelClass}>Add a role</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Role name" className={inputClass} />
        <select aria-label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} className={selectClass}>
          <option value="">No department</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <div className="space-y-1">
          <label className={labelClass}>Fallback tier</label>
          <select aria-label="Fallback tier" value={fallbackTier} onChange={(e) => setFallbackTier(e.target.value)} className={selectClass}>
            {FALLBACK_TIERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="font-sans text-xs text-ink/60">
            Authorized is a deliberate elevation for restricted content like safe or alarm codes. Leave this as
            Frontline unless this role should genuinely hold that access.
          </p>
        </div>
        {error && <p className={errorClass}>{error}</p>}
        <button type="button" onClick={addRole} disabled={loading || !name.trim()} className={secondaryButtonClass}>
          {loading ? "Adding…" : "Add role"}
        </button>

        <div className="space-y-2">
          {existing.map((r) => (
            <div key={r.id} className={rowClass}>
              <p className="font-sans text-ink">{r.name}</p>
              <p className="font-mono text-xs text-clay-brown">
                {r.department ?? "no department"} · {r.fallback_tier ?? "frontline"}
              </p>
            </div>
          ))}
          {existing.length === 0 && <p className="font-sans text-sm text-clay-brown">No roles yet.</p>}
        </div>

        <button type="button" onClick={continueWizard} disabled={existing.length === 0} className={primaryButtonClass}>
          Continue
        </button>
      </div>
    </div>
  );
}
