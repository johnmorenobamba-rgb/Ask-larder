"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AU_STATES } from "@/lib/onboarding/constants";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { FounderEscalationPanel } from "./FounderEscalationPanel";
import { inputClass, selectClass, labelClass, cardClass, primaryButtonClass, errorClass } from "./fieldStyles";

export function VenueBasicsForm({
  venueSlug,
  initial,
}: {
  venueSlug: string;
  initial: { tradingName: string; legalName: string; state: string; address: string; abn: string };
}) {
  const router = useRouter();
  const [tradingName, setTradingName] = useState(initial.tradingName);
  const [legalName, setLegalName] = useState(initial.legalName);
  const [state, setState] = useState(initial.state);
  const [address, setAddress] = useState(initial.address);
  const [abn, setAbn] = useState(initial.abn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = tradingName.trim() && state && address.trim() && /^\d{11}$/.test(abn.replace(/\s/g, ""));

  async function submit() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/owner/onboarding/venue-basics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradingName, legalName, state, address, abn }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save venue basics.");
      return;
    }

    const flags = body.flags as VenueTypeFlags;
    router.push(stepHref(venueSlug, getNextStep("venue-basics", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Venue basics</h2>
        <p className="font-sans text-sm text-ink/70">Trading name, legal name if different, address, and ABN.</p>
      </div>

      <div className={cardClass}>
        <div className="space-y-1">
          <label className={labelClass}>Trading name</label>
          <input type="text" value={tradingName} onChange={(e) => setTradingName(e.target.value)} placeholder="Trading name" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Legal or registered business name (if different)</label>
          <input
            type="text"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Leave blank if the same as trading name"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>State or territory</label>
          <select aria-label="State or territory" value={state} onChange={(e) => setState(e.target.value)} className={selectClass}>
            <option value="">Choose one</option>
            {AU_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        {state && state !== "VIC" && (
          <FounderEscalationPanel
            title="This venue is outside Victoria"
            body="Larder's licensing and food-safety content is calibrated for Victoria first. The founder will confirm the correct taxonomy for this state before this venue's compliance modules go live. You can keep going with the rest of onboarding."
          />
        )}
        <div className="space-y-1">
          <label className={labelClass}>Street address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>ABN</label>
          <input
            type="text"
            value={abn}
            onChange={(e) => setAbn(e.target.value)}
            placeholder="11 digits"
            className={inputClass}
          />
        </div>
        {error && <p className={errorClass}>{error}</p>}
        <button type="button" onClick={submit} disabled={loading || !valid} className={primaryButtonClass}>
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
