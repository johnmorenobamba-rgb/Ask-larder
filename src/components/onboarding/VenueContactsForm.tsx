"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONTACT_TYPES } from "@/lib/onboarding/constants";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { inputClass, selectClass, cardClass, primaryButtonClass, secondaryButtonClass, errorClass, rowClass } from "./fieldStyles";

type Contact = { id: string; contact_type: string | null; name: string; phone: string | null; email: string | null; notes: string | null };

export function VenueContactsForm({ venueSlug, existing }: { venueSlug: string; existing: Contact[] }) {
  const router = useRouter();
  const [contactType, setContactType] = useState<string>(CONTACT_TYPES[0].value);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addContact() {
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/owner/onboarding/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactType, name, phone, email, notes }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save this contact.");
      return;
    }
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    router.refresh();
  }

  async function deleteContact(id: string) {
    await fetch(`/api/owner/onboarding/contacts?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  function continueWizard() {
    const flags: VenueTypeFlags = {};
    router.push(stepHref(venueSlug, getNextStep("contacts", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Business continuity</h2>
        <p className="font-sans text-sm text-ink/70">
          Electrician, plumber, locksmith, insurer, regulator, escalation contact, fire or police for
          non-emergencies.
        </p>
      </div>

      <div className={cardClass}>
        <select aria-label="Contact type" value={contactType} onChange={(e) => setContactType(e.target.value)} className={selectClass}>
          {CONTACT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={inputClass} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={inputClass} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className={inputClass} />
        {error && <p className={errorClass}>{error}</p>}
        <button type="button" onClick={addContact} disabled={loading || !name.trim()} className={secondaryButtonClass}>
          {loading ? "Adding…" : "Add contact"}
        </button>

        <div className="space-y-2">
          {existing.map((c) => (
            <div key={c.id} className={rowClass}>
              <div>
                <p className="font-sans text-ink">{c.name}</p>
                <p className="font-mono text-xs text-clay-brown">
                  {c.contact_type ?? "uncategorised"}
                  {c.phone ? ` · ${c.phone}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => deleteContact(c.id)} className="font-mono text-xs text-preserve-red underline">
                Delete
              </button>
            </div>
          ))}
          {existing.length === 0 && <p className="font-sans text-sm text-clay-brown">No contacts yet.</p>}
        </div>

        <button type="button" onClick={continueWizard} className={primaryButtonClass}>
          Continue
        </button>
      </div>
    </div>
  );
}
