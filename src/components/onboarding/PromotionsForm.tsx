"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DAYS_OF_WEEK } from "@/lib/onboarding/constants";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { inputClass, selectClass, labelClass, cardClass, primaryButtonClass, secondaryButtonClass, errorClass, rowClass } from "./fieldStyles";

type Promotion = { id: string; day_of_week: string; start_time: string; end_time: string; description: string | null };

export function PromotionsForm({ venueSlug, existing }: { venueSlug: string; existing: Promotion[] }) {
  const router = useRouter();
  const [runsHappyHour, setRunsHappyHour] = useState<boolean | null>(existing.length > 0 ? true : null);
  const [dayOfWeek, setDayOfWeek] = useState("monday");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPromotion() {
    if (!startTime || !endTime || loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/owner/onboarding/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek, startTime, endTime, description }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save this promotion.");
      return;
    }
    setStartTime("");
    setEndTime("");
    setDescription("");
    router.refresh();
  }

  async function deletePromotion(id: string) {
    await fetch(`/api/owner/onboarding/promotions?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  function continueWizard() {
    const flags: VenueTypeFlags = { runs_happy_hour: runsHappyHour ?? false };
    router.push(stepHref(venueSlug, getNextStep("promotions", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Promotions</h2>
        <p className="font-sans text-sm text-ink/70">Does this venue run happy hour or discounted pricing?</p>
      </div>

      <div className={cardClass}>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRunsHappyHour(false)}
            className={`rounded-full border-2 px-4 py-2 font-sans text-sm ${runsHappyHour === false ? "border-preserve-red text-preserve-red" : "border-clay-brown/40 text-ink"}`}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => setRunsHappyHour(true)}
            className={`rounded-full border-2 px-4 py-2 font-sans text-sm ${runsHappyHour === true ? "border-preserve-red text-preserve-red" : "border-clay-brown/40 text-ink"}`}
          >
            Yes
          </button>
        </div>

        {runsHappyHour && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select aria-label="Day of the week" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} className={selectClass}>
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's discounted" className={inputClass} />
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
            </div>
            {error && <p className={errorClass}>{error}</p>}
            <button type="button" onClick={addPromotion} disabled={loading || !startTime || !endTime} className={secondaryButtonClass}>
              {loading ? "Adding…" : "Add promotion"}
            </button>

            <div className="space-y-2">
              {existing.map((p) => (
                <div key={p.id} className={rowClass}>
                  <div>
                    <p className="font-sans text-ink capitalize">{p.day_of_week}</p>
                    <p className="font-mono text-xs text-clay-brown">
                      {p.start_time} to {p.end_time}
                      {p.description ? ` · ${p.description}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => deletePromotion(p.id)} className="font-mono text-xs text-preserve-red underline">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <p className={labelClass}>Regulatory research on numeric happy-hour limits is still weak. State a discount only if it's confirmed, never a guessed threshold.</p>
        <button type="button" onClick={continueWizard} disabled={runsHappyHour === null} className={primaryButtonClass}>
          Continue
        </button>
      </div>
    </div>
  );
}
