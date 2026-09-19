"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONTACT_TYPES } from "@/lib/onboarding/constants";

export type Contact = {
  id: string;
  contact_type: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  check_first_step: string | null;
};

const TYPE_LABEL = new Map<string, string>(CONTACT_TYPES.map((t) => [t.value, t.label]));

type Draft = {
  contactType: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  checkFirstStep: string;
};

const EMPTY_DRAFT: Draft = { contactType: CONTACT_TYPES[0].value, name: "", phone: "", email: "", notes: "", checkFirstStep: "" };

function toDraft(c: Contact): Draft {
  return {
    contactType: c.contact_type ?? CONTACT_TYPES[0].value,
    name: c.name,
    phone: c.phone ?? "",
    email: c.email ?? "",
    notes: c.notes ?? "",
    checkFirstStep: c.check_first_step ?? "",
  };
}

function DraftFields({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <select
        aria-label="Contact type"
        value={draft.contactType}
        onChange={(e) => onChange({ ...draft, contactType: e.target.value })}
        className="rounded-xl border-2 border-clay-brown/40 px-3 py-2 font-sans text-sm text-ink outline-none focus:border-preserve-red"
      >
        {CONTACT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <input
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        placeholder="Name"
        className="rounded-xl border-2 border-clay-brown/40 px-3 py-2 font-sans text-sm text-ink outline-none focus:border-preserve-red"
      />
      <input
        value={draft.phone}
        onChange={(e) => onChange({ ...draft, phone: e.target.value })}
        placeholder="Phone"
        className="rounded-xl border-2 border-clay-brown/40 px-3 py-2 font-sans text-sm text-ink outline-none focus:border-preserve-red"
      />
      <input
        value={draft.email}
        onChange={(e) => onChange({ ...draft, email: e.target.value })}
        placeholder="Email (optional)"
        className="rounded-xl border-2 border-clay-brown/40 px-3 py-2 font-sans text-sm text-ink outline-none focus:border-preserve-red"
      />
      <input
        value={draft.notes}
        onChange={(e) => onChange({ ...draft, notes: e.target.value })}
        placeholder="What they're for"
        className="rounded-xl border-2 border-clay-brown/40 px-3 py-2 font-sans text-sm text-ink outline-none focus:border-preserve-red sm:col-span-2"
      />
      <input
        value={draft.checkFirstStep}
        onChange={(e) => onChange({ ...draft, checkFirstStep: e.target.value })}
        placeholder="Check first, before calling (optional)"
        className="rounded-xl border-2 border-clay-brown/40 px-3 py-2 font-sans text-sm text-ink outline-none focus:border-preserve-red sm:col-span-2"
      />
    </div>
  );
}

/**
 * The real, ongoing Contacts page (Part 2, 20 Sep 2026) -- venue_contacts
 * existed already from the pub validation pass, with a real wizard intake
 * step, but no post-launch place to see or manage it. This is that place:
 * a normal owner-dashboard CRUD screen, not a second onboarding step.
 * Reuses the wizard's own API route (/api/owner/onboarding/contacts) --
 * same table, same shape, same precedent as content-intake staying
 * reachable post-launch rather than every revisitable wizard step getting
 * a duplicate non-onboarding route.
 */
export function ContactsManager({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addContact() {
    if (!draft.name.trim() || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/owner/onboarding/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save this contact.");
      return;
    }
    setDraft(EMPTY_DRAFT);
    router.refresh();
  }

  function startEdit(c: Contact) {
    setEditingId(c.id);
    setEditDraft(toDraft(c));
    setError(null);
  }

  async function saveEdit() {
    if (!editingId || !editDraft.name.trim() || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/owner/onboarding/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editDraft }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save this contact.");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function deleteContact(id: string) {
    await fetch(`/api/owner/onboarding/contacts?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
        <p className="font-display text-ink">Add a contact</p>
        <DraftFields draft={draft} onChange={setDraft} />
        {error && !editingId && <p className="font-sans text-sm text-preserve-red">{error}</p>}
        <button
          type="button"
          onClick={addContact}
          disabled={loading || !draft.name.trim()}
          className="rounded-full bg-preserve-red px-5 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
        >
          {loading && !editingId ? "Adding…" : "Add contact"}
        </button>
      </div>

      <div className="space-y-3">
        {contacts.map((c) =>
          editingId === c.id ? (
            <div key={c.id} className="space-y-3 rounded-2xl border-2 border-preserve-red/50 px-4 py-4">
              <DraftFields draft={editDraft} onChange={setEditDraft} />
              {error && <p className="font-sans text-sm text-preserve-red">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={loading}
                  className="rounded-full bg-preserve-red px-5 py-2 font-sans text-sm font-medium text-parchment disabled:opacity-50"
                >
                  {loading ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="font-mono text-xs uppercase tracking-wide text-clay-brown"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
              <div className="space-y-1">
                <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">
                  {TYPE_LABEL.get(c.contact_type ?? "") ?? "Uncategorised"}
                </p>
                <p className="font-display text-ink">{c.name}</p>
                {c.phone && <p className="font-sans text-sm text-ink/80">{c.phone}</p>}
                {c.notes && <p className="font-sans text-sm text-ink/70">{c.notes}</p>}
                {c.check_first_step && (
                  <p className="font-sans text-xs text-clay-brown">Check first: {c.check_first_step}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => startEdit(c)} className="font-mono text-xs uppercase tracking-wide text-ink underline">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteContact(c.id)}
                  className="font-mono text-xs uppercase tracking-wide text-preserve-red underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
        {contacts.length === 0 && <p className="font-sans text-sm text-clay-brown">No contacts yet.</p>}
      </div>
    </div>
  );
}
