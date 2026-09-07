"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputClass, primaryButtonClass, errorClass, labelClass } from "./fieldStyles";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Q2 Page 1 — pre-auth owner + venue creation. Calls the existing
 * bootstrap-owner route unchanged, then signs in client-side (bootstrap
 * creates the auth user but doesn't establish a session — see
 * bootstrapOwner.ts), then redirects into Page 2 of the wizard.
 */
export function OwnerVenueCreateForm() {
  const router = useRouter();
  const [venueName, setVenueName] = useState("");
  const [venueSlug, setVenueSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleVenueNameChange(value: string) {
    setVenueName(value);
    if (!slugTouched) setVenueSlug(slugify(value));
  }

  const valid =
    venueName.trim() &&
    SLUG_PATTERN.test(venueSlug) &&
    ownerName.trim() &&
    ownerEmail.trim() &&
    ownerPassword.length >= 8;

  async function submit() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/bootstrap-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueName, venueSlug, ownerName, ownerEmail, ownerPassword }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't create this venue.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: ownerEmail, password: ownerPassword });
    if (signInError) {
      setError("Venue created, but sign in failed. Log in from the owner login page instead.");
      setLoading(false);
      return;
    }

    router.push(`/${venueSlug}/owner/onboarding/venue-basics`);
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-clay-brown/40 px-6 py-6">
      <div className="space-y-1">
        <label className={labelClass}>Venue name</label>
        <input
          type="text"
          value={venueName}
          onChange={(e) => handleVenueNameChange(e.target.value)}
          placeholder="Trading name"
          autoFocus
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Web address</label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-clay-brown">asklarder.com.au/</span>
          <input
            type="text"
            value={venueSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setVenueSlug(slugify(e.target.value));
            }}
            placeholder="venue-slug"
            className="w-full rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-mono text-sm text-ink outline-none focus:border-preserve-red"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Owner name</label>
        <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Your name" className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Owner email</label>
        <input
          type="email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="you@venue.com.au"
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClass}>Password</label>
        <input
          type="password"
          value={ownerPassword}
          onChange={(e) => setOwnerPassword(e.target.value)}
          placeholder="At least 8 characters"
          className={inputClass}
        />
      </div>
      {error && <p className={errorClass}>{error}</p>}
      <button type="button" onClick={submit} disabled={loading || !valid} className={`w-full ${primaryButtonClass}`}>
        {loading ? "Creating…" : "Create venue and start onboarding"}
      </button>
    </div>
  );
}
