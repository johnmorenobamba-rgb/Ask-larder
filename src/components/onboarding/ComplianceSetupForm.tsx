"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HIGH_RISK_ACTIVITIES, TRADE_WASTE_OPTIONS, UNIT_TYPES, VENUE_TYPES } from "@/lib/onboarding/constants";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { inputClass, selectClass, labelClass, cardClass, primaryButtonClass, secondaryButtonClass, errorClass } from "./fieldStyles";

type UnitRow = {
  id: string | null;
  name: string;
  unitType: string;
  limitTempC: string;
  stationId: string;
  isActive: boolean;
};

function typeInfo(value: string) {
  return UNIT_TYPES.find((t) => t.value === value);
}

function newUnit(): UnitRow {
  const cold = UNIT_TYPES[0];
  return { id: null, name: "", unitType: cold.value, limitTempC: String(cold.defaultLimit), stationId: "", isActive: true };
}

export function ComplianceSetupForm({
  venueSlug,
  stations,
  initial,
}: {
  venueSlug: string;
  stations: { id: string; name: string }[];
  initial: {
    units: UnitRow[];
    highRiskActivities: string[];
    offersAccommodation: boolean;
    tradeWasteAgreement: string;
    venueType: string;
  };
}) {
  const router = useRouter();
  const [units, setUnits] = useState<UnitRow[]>(initial.units);
  const [activities, setActivities] = useState<string[]>(initial.highRiskActivities);
  const [offersAccommodation, setOffersAccommodation] = useState(initial.offersAccommodation);
  const [tradeWaste, setTradeWaste] = useState(initial.tradeWasteAgreement);
  const [venueType, setVenueType] = useState(initial.venueType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Retired units stay on file (past readings point at them) but don't need
  // a name or limit to be valid again.
  const activeUnits = units.filter((u) => u.isActive);
  const unitsValid = activeUnits.every((u) => u.name.trim() && u.limitTempC.trim() !== "" && Number.isFinite(Number(u.limitTempC)));
  const valid = !!tradeWaste && unitsValid;

  function updateUnit(index: number, patch: Partial<UnitRow>) {
    setUnits((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  }

  function changeType(index: number, unitType: string) {
    const info = typeInfo(unitType);
    updateUnit(index, { unitType, limitTempC: info ? String(info.defaultLimit) : "" });
  }

  function toggleActivity(value: string) {
    setActivities((prev) => (prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]));
  }

  async function submit() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/owner/onboarding/compliance-setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // clientIndex lets the server say which row got which id, so a retry
        // after a partial failure updates saved rows instead of duplicating.
        units: units.map((u, clientIndex) => ({ ...u, clientIndex })).filter((u) => u.isActive || u.id),
        highRiskActivities: activities,
        offersAccommodation,
        tradeWasteAgreement: tradeWaste,
        venueType,
      }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    const saved: { index: number; id: string }[] = Array.isArray(body?.saved) ? body.saved : [];
    if (saved.length > 0) {
      setUnits((prev) => prev.map((u, i) => (u.id ? u : { ...u, id: saved.find((s) => s.index === i)?.id ?? null })));
    }
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save fridges and compliance setup.");
      return;
    }

    const flags = body.flags as VenueTypeFlags;
    router.push(stepHref(venueSlug, getNextStep("compliance-setup", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Fridges and compliance</h2>
        <p className="font-sans text-sm text-ink/70">
          List every fridge, freezer and hot hold unit staff will log temperatures for. Each gets a suggested limit, prefilled.
          The cold and hot hold limits are suggested limits. The frozen limit follows Victorian FoodSmart guidance.
          Change a limit only if the venue&apos;s Food Safety Program says otherwise.
        </p>
      </div>

      <div className={cardClass}>
        <h3 className="font-display text-lg font-bold text-ink">Venue type</h3>
        <p className="font-sans text-sm text-ink/70">
          This sets which compliance forms start switched on. Cafes get the cafe forms, pubs and bars get the bar forms. You can switch any form on or off later on the Compliance forms page, and your choice there always wins.
        </p>
        <div className="space-y-1">
          <label htmlFor="venue-type" className={labelClass}>What kind of venue is this?</label>
          <select id="venue-type" value={venueType} onChange={(e) => setVenueType(e.target.value)} className={selectClass}>
            <option value="">Choose one</option>
            {VENUE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={cardClass}>
        <h3 className="font-display text-lg font-bold text-ink">Temperature controlled units</h3>
        <p className="font-sans text-sm text-ink/70">Cold and frozen units are checked against a suggested limit to stay at or below. Hot hold units are checked against a suggested limit to stay at or above.</p>
        {units.length === 0 && (
          <p className="font-sans text-sm text-ink/70">No units yet. Add each fridge, freezer and hot hold unit that staff will log.</p>
        )}

        {units.map((u, i) => {
          const info = typeInfo(u.unitType);
          const limitLabel = info?.limit === "min" ? "Safe minimum (°C)" : "Safe maximum (°C)";
          return (
            <div key={u.id ?? `new-${i}`} className={`space-y-3 rounded-2xl border-2 border-clay-brown/20 px-4 py-3 ${u.isActive ? "" : "opacity-60"}`}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Unit name</label>
                  {!u.isActive && <span className="font-mono text-[10px] uppercase tracking-wide text-clay-brown">Retired</span>}
                </div>
                <input
                  type="text"
                  aria-label={`Unit name ${i + 1}`}
                  value={u.name}
                  onChange={(e) => updateUnit(i, { name: e.target.value })}
                  placeholder="Unit name"
                  disabled={!u.isActive}
                  className={inputClass}
                />
              </div>
              <div className="grid gap-3 xl:grid-cols-3">
                <div className="space-y-1">
                  <label className={labelClass}>Type</label>
                  <select
                    aria-label={`Unit type ${i + 1}`}
                    value={u.unitType}
                    onChange={(e) => changeType(i, e.target.value)}
                    disabled={!u.isActive}
                    className={selectClass}
                  >
                    {UNIT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>{limitLabel}</label>
                  <input
                    type="number"
                    step="0.5"
                    aria-label={`${limitLabel} ${i + 1}`}
                    value={u.limitTempC}
                    onChange={(e) => updateUnit(i, { limitTempC: e.target.value })}
                    disabled={!u.isActive}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Station</label>
                  <select
                    aria-label={`Station ${i + 1}`}
                    value={u.stationId}
                    onChange={(e) => updateUnit(i, { stationId: e.target.value })}
                    disabled={!u.isActive}
                    className={selectClass}
                  >
                    <option value="">None</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                {u.id ? (
                  <button type="button" onClick={() => updateUnit(i, { isActive: !u.isActive })} className="-my-1 min-h-11 px-3 font-mono text-xs uppercase tracking-wide text-ink/80 hover:text-ink">
                    {u.isActive ? "Retire unit" : "Restore unit"}
                  </button>
                ) : (
                  <button type="button" onClick={() => setUnits((prev) => prev.filter((_, idx) => idx !== i))} className="-my-1 min-h-11 px-3 font-mono text-xs uppercase tracking-wide text-ink/80 hover:text-ink">
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button type="button" onClick={() => setUnits((prev) => [...prev, newUnit()])} className={secondaryButtonClass}>
          Add unit
        </button>
      </div>

      <div className={cardClass}>
        <h3 className="font-display text-lg font-bold text-ink">Compliance settings</h3>

        <fieldset className="space-y-2">
          <legend className={labelClass}>High risk food activities this venue does</legend>
          {HIGH_RISK_ACTIVITIES.map((a) => (
            <label key={a.value} className="flex min-h-11 items-center gap-2 font-sans text-sm text-ink">
              <input type="checkbox" checked={activities.includes(a.value)} onChange={() => toggleActivity(a.value)} />
              {a.label}
            </label>
          ))}
        </fieldset>

        <label className="flex min-h-11 items-center gap-2 font-sans text-sm text-ink">
          <input type="checkbox" checked={offersAccommodation} onChange={(e) => setOffersAccommodation(e.target.checked)} />
          This venue offers accommodation
        </label>

        <div className="space-y-1">
          <label className={labelClass}>Trade Waste Agreement</label>
          <select aria-label="Trade Waste Agreement" value={tradeWaste} onChange={(e) => setTradeWaste(e.target.value)} className={selectClass}>
            <option value="">Choose one</option>
            {TRADE_WASTE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {!valid && (
          <p className="font-sans text-sm text-ink/70">
            To continue, give every unit a name and a limit, and choose a Trade Waste Agreement answer.
          </p>
        )}
        {error && <p className={errorClass}>{error}</p>}
        <button type="button" onClick={submit} disabled={loading || !valid} className={primaryButtonClass}>
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
