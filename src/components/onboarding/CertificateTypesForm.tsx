"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VIC_WWCC_LABEL } from "@/lib/onboarding/constants";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { FounderEscalationPanel } from "./FounderEscalationPanel";
import { inputClass, cardClass, primaryButtonClass, secondaryButtonClass, errorClass } from "./fieldStyles";

type CertType = { id: string; name: string };

/**
 * Q2 Page 13 — confirms the certificate types auto-created earlier (RSA,
 * Food Handling, Food Safety Supervisor) and adds WWCC + First Aid. WWCC
 * naming is state-specific (Q1 catalog row 41) — only Victoria gets a
 * confirmed label here; every other state is freetext plus a visible
 * founder-escalation note, never a guessed name.
 */
export function CertificateTypesForm({
  venueSlug,
  state,
  existing,
}: {
  venueSlug: string;
  state: string | null;
  existing: CertType[];
}) {
  const router = useRouter();
  const [customWwccName, setCustomWwccName] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasWwcc = existing.some((c) => c.name.toLowerCase().includes("working with children") || c.name.toLowerCase().includes("wwcc"));
  const hasFirstAid = existing.some((c) => c.name === "First Aid");

  async function addType(name: string) {
    if (!name.trim() || loading) return;
    setLoading(name);
    setError(null);
    const res = await fetch("/api/owner/onboarding/certificate-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await res.json().catch(() => null);
    setLoading(null);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't add that certificate type.");
      return;
    }
    setCustomWwccName("");
    router.refresh();
  }

  function continueWizard() {
    const flags: VenueTypeFlags = {};
    router.push(stepHref(venueSlug, getNextStep("certificate-types", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Certificate types</h2>
        <p className="font-sans text-sm text-ink/70">RSA, Food Handling, and Food Safety Supervisor are already set up if this venue's answers triggered them.</p>
      </div>

      <div className={cardClass}>
        <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Already configured</p>
        {existing.map((c) => (
          <p key={c.id} className="font-sans text-ink">
            {c.name}
          </p>
        ))}
        {existing.length === 0 && <p className="font-sans text-sm text-clay-brown">None yet.</p>}
      </div>

      <div className={cardClass}>
        <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Working with Children Check</p>
        {hasWwcc ? (
          <p className="font-sans text-sm text-ink/70">Already added.</p>
        ) : state === "VIC" ? (
          <button type="button" onClick={() => addType(VIC_WWCC_LABEL)} disabled={loading === VIC_WWCC_LABEL} className={secondaryButtonClass}>
            {loading === VIC_WWCC_LABEL ? "Adding…" : `Add ${VIC_WWCC_LABEL}`}
          </button>
        ) : (
          <>
            <FounderEscalationPanel
              title="This state's WWCC naming isn't confirmed yet"
              body="Larder only carries a confirmed name for Victoria. Enter the correct local name if known, or leave this for the founder to confirm."
            />
            <input
              value={customWwccName}
              onChange={(e) => setCustomWwccName(e.target.value)}
              placeholder="Local working-with-children check name"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => addType(customWwccName)}
              disabled={!customWwccName.trim() || loading === customWwccName}
              className={secondaryButtonClass}
            >
              Add
            </button>
          </>
        )}
      </div>

      <div className={cardClass}>
        <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">First aid</p>
        {hasFirstAid ? (
          <p className="font-sans text-sm text-ink/70">Already added.</p>
        ) : (
          <button type="button" onClick={() => addType("First Aid")} disabled={loading === "First Aid"} className={secondaryButtonClass}>
            {loading === "First Aid" ? "Adding…" : "Add First Aid"}
          </button>
        )}
      </div>

      {error && <p className={errorClass}>{error}</p>}
      <button type="button" onClick={continueWizard} className={primaryButtonClass}>
        Continue
      </button>
    </div>
  );
}
