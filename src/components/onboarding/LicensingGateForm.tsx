"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LICENCE_STATUSES } from "@/lib/onboarding/constants";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { FounderEscalationPanel } from "./FounderEscalationPanel";
import { cardClass, primaryButtonClass, errorClass, labelClass, rowClass } from "./fieldStyles";

/**
 * Q2 Page 3 — LIC0, the root licensing gate. This is the branch that a
 * cafe-derived flow with no upstream licence gate got wrong (Q1 catalog
 * row 22/23): an honestly-unlicensed venue must be a real, first-class
 * answer here, not funnelled into "Other/unsure."
 */
export function LicensingGateForm({ venueSlug, initial }: { venueSlug: string; initial: string }) {
  const router = useRouter();
  const [licenceStatus, setLicenceStatus] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!licenceStatus || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/owner/onboarding/licence-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenceStatus }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save this answer.");
      return;
    }

    const flags = body.flags as VenueTypeFlags;
    router.push(stepHref(venueSlug, getNextStep("licensing", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Licensing</h2>
        <p className="font-sans text-sm text-ink/70">
          Does this venue hold, or plan to hold, any liquor licence at all, including an informal BYO
          setup where the venue never sells alcohol?
        </p>
      </div>

      <div className={cardClass}>
        <fieldset className="space-y-2">
          {LICENCE_STATUSES.map((s) => (
            <label key={s.value} className={`${rowClass} cursor-pointer`}>
              <span className="font-sans text-ink">{s.label}</span>
              <input
                type="radio"
                name="licenceStatus"
                value={s.value}
                checked={licenceStatus === s.value}
                onChange={() => setLicenceStatus(s.value)}
              />
            </label>
          ))}
        </fieldset>

        {licenceStatus === "unconfirmed" && (
          <FounderEscalationPanel
            title="Licence status not yet resolved"
            body="Flagged so the founder can follow up directly rather than the wizard guessing. Licence-detail, crowd control, RSA, and happy hour pages stay hidden until this is confirmed."
          />
        )}

        {error && <p className={errorClass}>{error}</p>}
        <button type="button" onClick={submit} disabled={loading || !licenceStatus} className={primaryButtonClass}>
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
      <p className={labelClass}>This answer decides which later pages apply to this venue.</p>
    </div>
  );
}
