"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { inputClass, selectClass, cardClass, primaryButtonClass, secondaryButtonClass, errorClass, rowClass } from "./fieldStyles";

type StaffRow = { id: string; name: string; email: string | null; phone: string | null; staff_roles: { name: string } | null; auth_id: string | null };

export function StaffInviteForm({
  venueSlug,
  staffRoles,
  existing,
}: {
  venueSlug: string;
  staffRoles: { id: string; name: string }[];
  existing: StaffRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffRoleId, setStaffRoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addStaff() {
    if (!name.trim() || (!email.trim() && !phone.trim()) || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/owner/onboarding/staff-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, staffRoleId: staffRoleId || null }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't invite this person.");
      return;
    }
    setName("");
    setEmail("");
    setPhone("");
    router.refresh();
  }

  async function removeStaff(id: string) {
    await fetch(`/api/owner/onboarding/staff-invite?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  function continueWizard() {
    const flags: VenueTypeFlags = {};
    router.push(stepHref(venueSlug, getNextStep("staff-invite", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Invite staff</h2>
        <p className="font-sans text-sm text-ink/70">Add each person by name and at least an email or phone. They log in separately once invited.</p>
      </div>

      <div className={cardClass}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={inputClass} />
        <select aria-label="Staff role" value={staffRoleId} onChange={(e) => setStaffRoleId(e.target.value)} className={selectClass}>
          <option value="">No role yet</option>
          {staffRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={inputClass} />
        {error && <p className={errorClass}>{error}</p>}
        <button type="button" onClick={addStaff} disabled={loading || !name.trim() || (!email.trim() && !phone.trim())} className={secondaryButtonClass}>
          {loading ? "Adding…" : "Add staff member"}
        </button>

        <div className="space-y-2">
          {existing.map((s) => (
            <div key={s.id} className={rowClass}>
              <div>
                <p className="font-sans text-ink">{s.name}</p>
                <p className="font-mono text-xs text-clay-brown">
                  {s.staff_roles?.name ?? "No role set"} · {s.auth_id ? "logged in" : "not yet logged in"}
                </p>
              </div>
              {!s.auth_id && (
                <button type="button" onClick={() => removeStaff(s.id)} className="font-mono text-xs text-preserve-red underline">
                  Remove
                </button>
              )}
            </div>
          ))}
          {existing.length === 0 && <p className="font-sans text-sm text-clay-brown">No staff invited yet.</p>}
        </div>

        <button type="button" onClick={continueWizard} className={primaryButtonClass}>
          Continue
        </button>
      </div>
    </div>
  );
}
