"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DAYS_OF_WEEK, LICENCE_TYPES } from "@/lib/onboarding/constants";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { FounderEscalationPanel } from "./FounderEscalationPanel";
import { inputClass, selectClass, labelClass, cardClass, primaryButtonClass, errorClass } from "./fieldStyles";

type DayHours = { closed: boolean; open: string; close: string };
type TradingHours = Record<string, DayHours>;

function emptyHours(): TradingHours {
  return Object.fromEntries(DAYS_OF_WEEK.map((d) => [d.value, { closed: false, open: "", close: "" }])) as TradingHours;
}

export function LicenceDetailForm({
  venueSlug,
  initial,
}: {
  venueSlug: string;
  initial: {
    licenceType: string;
    licenceNumber: string;
    licensedCapacity: string;
    lateNightEndorsement: boolean;
    conditions: string;
    tradingHours: TradingHours;
    sourcedFromDocument: boolean;
  };
}) {
  const router = useRouter();
  const [licenceType, setLicenceType] = useState(initial.licenceType);
  const [licenceNumber, setLicenceNumber] = useState(initial.licenceNumber);
  const [licensedCapacity, setLicensedCapacity] = useState(initial.licensedCapacity);
  const [lateNightEndorsement, setLateNightEndorsement] = useState(initial.lateNightEndorsement);
  const [conditions, setConditions] = useState(initial.conditions);
  const [tradingHours, setTradingHours] = useState<TradingHours>({ ...emptyHours(), ...initial.tradingHours });
  // Previously local-only UI state, never sent to the server (Block Q9
  // found this: a real, unconfirmed-capacity venue had no way to actually
  // record that fact anywhere) -- now persisted to wizard_sessions via the
  // submit below and surfaced as an outstanding item on Review & activate.
  const [sourcedFromDocument, setSourcedFromDocument] = useState(initial.sourcedFromDocument);
  const [gamingEgm, setGamingEgm] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capacityNum = Number(licensedCapacity);
  const valid = licenceType && licenceNumber.trim() && Number.isInteger(capacityNum) && capacityNum > 0 && gamingEgm !== null;

  function updateDay(day: string, patch: Partial<DayHours>) {
    setTradingHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  async function submit() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/owner/onboarding/licence-detail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licenceType,
        licenceNumber,
        licensedCapacity: capacityNum,
        lateNightEndorsement,
        conditions,
        tradingHours,
        gamingEgm,
        sourcedFromDocument,
      }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save licence detail.");
      return;
    }

    const flags = body.flags as VenueTypeFlags;
    router.push(stepHref(venueSlug, getNextStep("licence-detail", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Licence detail</h2>
        <p className="font-sans text-sm text-ink/70">Capacity and trading hours are compliance critical. Source them from the actual licence document where possible, not memory.</p>
      </div>

      <div className={cardClass}>
        <div className="space-y-1">
          <label className={labelClass}>Licence type</label>
          <select aria-label="Licence type" value={licenceType} onChange={(e) => setLicenceType(e.target.value)} className={selectClass}>
            <option value="">Choose one</option>
            {LICENCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {licenceType === "other_unsure" && (
          <FounderEscalationPanel
            title="Licence type not yet clear"
            body="Flagged for the founder to confirm the right taxonomy for this venue rather than guessing."
          />
        )}

        <div className="space-y-1">
          <label className={labelClass}>Liquor licence number</label>
          <input type="text" value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} placeholder="Licence number" className={inputClass} />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Licensed patron capacity</label>
          <input
            type="number"
            min={1}
            value={licensedCapacity}
            onChange={(e) => setLicensedCapacity(e.target.value)}
            placeholder="Licensed capacity"
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-2 font-sans text-sm text-ink">
          <input type="checkbox" checked={sourcedFromDocument} onChange={(e) => setSourcedFromDocument(e.target.checked)} />
          Capacity and trading hours below are sourced from the actual licence document
        </label>
        {!sourcedFromDocument && (
          <p className="rounded-2xl bg-clay-brown/10 px-4 py-3 font-sans text-sm text-ink/80">
            Unconfirmed for now. A real venue interview once gave three different capacity numbers across one conversation and none
            was ever reconciled, so treat this as a follow-up until the licence document itself confirms it.
          </p>
        )}

        <div className="space-y-2">
          <label className={labelClass}>Approved trading hours</label>
          {DAYS_OF_WEEK.map((d) => {
            const day = tradingHours[d.value];
            return (
              <div key={d.value} className="flex flex-wrap items-center gap-3">
                <span className="w-24 font-sans text-sm text-ink">{d.label}</span>
                <label className="flex items-center gap-1 font-sans text-xs text-ink/70">
                  <input type="checkbox" checked={day.closed} onChange={(e) => updateDay(d.value, { closed: e.target.checked })} />
                  Closed
                </label>
                {!day.closed && (
                  <>
                    <input
                      type="time"
                      value={day.open}
                      onChange={(e) => updateDay(d.value, { open: e.target.value })}
                      className="rounded-xl border-2 border-clay-brown/40 px-2 py-1 font-mono text-xs text-ink"
                    />
                    <span className="font-sans text-xs text-ink/60">to</span>
                    <input
                      type="time"
                      value={day.close}
                      onChange={(e) => updateDay(d.value, { close: e.target.value })}
                      className="rounded-xl border-2 border-clay-brown/40 px-2 py-1 font-mono text-xs text-ink"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        <label className="flex items-center gap-2 font-sans text-sm text-ink">
          <input type="checkbox" checked={lateNightEndorsement} onChange={(e) => setLateNightEndorsement(e.target.checked)} />
          Late night endorsement
        </label>

        <div className="space-y-1">
          <label className={labelClass}>Licence conditions</label>
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={3}
            placeholder="Area or outdoor service limits, and anything else the licence itself specifies"
            className={inputClass}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className={labelClass}>Does this venue hold a gaming or EGM entitlement?</legend>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setGamingEgm(false)}
              className={`rounded-full border-2 px-4 py-2 font-sans text-sm ${gamingEgm === false ? "border-preserve-red text-preserve-red" : "border-clay-brown/40 text-ink"}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setGamingEgm(true)}
              className={`rounded-full border-2 px-4 py-2 font-sans text-sm ${gamingEgm === true ? "border-preserve-red text-preserve-red" : "border-clay-brown/40 text-ink"}`}
            >
              Yes
            </button>
          </div>
        </fieldset>
        {gamingEgm === true && (
          <FounderEscalationPanel
            title="Gaming or EGM entitlement"
            body="Larder doesn't model gaming/EGM compliance. This is flagged for the founder; nothing about gaming is written anywhere, and this new hire training won't attempt to cover it."
          />
        )}

        {error && <p className={errorClass}>{error}</p>}
        <button type="button" onClick={submit} disabled={loading || !valid} className={primaryButtonClass}>
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
