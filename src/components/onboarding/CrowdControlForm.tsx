"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { NotYetStructuredBadge } from "./NotYetStructuredBadge";
import { inputClass, labelClass, cardClass, primaryButtonClass, errorClass } from "./fieldStyles";

export function CrowdControlForm({
  venueSlug,
  initial,
}: {
  venueSlug: string;
  initial: { required: boolean; securityFirmName: string; controllerLicenceNumbers: string };
}) {
  const router = useRouter();
  const [required, setRequired] = useState<boolean | null>(initial.required || null);
  const [securityFirmName, setSecurityFirmName] = useState(initial.securityFirmName);
  const [controllerLicenceNumbers, setControllerLicenceNumbers] = useState(initial.controllerLicenceNumbers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = required !== null && (!required || securityFirmName.trim());

  async function submit() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/owner/onboarding/crowd-control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ required, securityFirmName, controllerLicenceNumbers }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save this.");
      return;
    }

    const flags = body.flags as VenueTypeFlags;
    router.push(stepHref(venueSlug, getNextStep("crowd-control", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Crowd control</h2>
        <p className="font-sans text-sm text-ink/70">Does capacity or trading hours trigger mandatory crowd control, or does this venue use controllers electively?</p>
      </div>

      <div className={cardClass}>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRequired(false)}
            className={`rounded-full border-2 px-4 py-2 font-sans text-sm ${required === false ? "border-preserve-red text-preserve-red" : "border-clay-brown/40 text-ink"}`}
          >
            No controllers used
          </button>
          <button
            type="button"
            onClick={() => setRequired(true)}
            className={`rounded-full border-2 px-4 py-2 font-sans text-sm ${required === true ? "border-preserve-red text-preserve-red" : "border-clay-brown/40 text-ink"}`}
          >
            Yes, mandatory or elective
          </button>
        </div>

        {required && (
          <>
            <div className="space-y-1">
              <label className={labelClass}>Security firm name</label>
              <input type="text" value={securityFirmName} onChange={(e) => setSecurityFirmName(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className={labelClass}>Individual crowd controller licence numbers</label>
                <NotYetStructuredBadge />
              </div>
              <textarea
                value={controllerLicenceNumbers}
                onChange={(e) => setControllerLicenceNumbers(e.target.value)}
                rows={2}
                placeholder="List each controller's licence number"
                className={inputClass}
              />
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
