"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FOOD_SERVICE_LEVELS } from "@/lib/onboarding/constants";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { KeyRoleLoginNote } from "./KeyRoleLoginNote";
import { inputClass, selectClass, labelClass, cardClass, primaryButtonClass, errorClass } from "./fieldStyles";

export function FoodServiceGateForm({
  venueSlug,
  staffRoles,
  initial,
}: {
  venueSlug: string;
  staffRoles: { id: string; name: string }[];
  initial: {
    level: string;
    fssName: string;
    fssPhone: string;
    fssEmail: string;
    foodHandlingRoleIds: string[];
  };
}) {
  const router = useRouter();
  const [level, setLevel] = useState(initial.level);
  const [fssName, setFssName] = useState(initial.fssName);
  const [fssPhone, setFssPhone] = useState(initial.fssPhone);
  const [fssEmail, setFssEmail] = useState(initial.fssEmail);
  const [foodHandlingRoleIds, setFoodHandlingRoleIds] = useState<string[]>(initial.foodHandlingRoleIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggered = level === "full_kitchen";
  const valid = !!level && (!triggered || (fssName.trim() && foodHandlingRoleIds.length > 0));

  function toggleRole(id: string) {
    setFoodHandlingRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  async function submit() {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/owner/onboarding/food-service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, fssName, fssPhone, fssEmail, foodHandlingRoleIds }),
    });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(body?.error ?? "Couldn't save food service setup.");
      return;
    }

    const flags = body.flags as VenueTypeFlags;
    router.push(stepHref(venueSlug, getNextStep("food-service", flags)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Food service</h2>
        <p className="font-sans text-sm text-ink/70">
          This is about food safety risk class, not kitchen size. A small prep area can land in the same
          risk class as a full kitchen.
        </p>
      </div>

      <div className={cardClass}>
        <div className="space-y-1">
          <label className={labelClass}>Food service level</label>
          <select aria-label="Food service level" value={level} onChange={(e) => setLevel(e.target.value)} className={selectClass}>
            <option value="">Choose one</option>
            {FOOD_SERVICE_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {triggered && (
          <>
            <KeyRoleLoginNote />
            <div className="space-y-1">
              <label className={labelClass}>Food Safety Supervisor's name</label>
              <input type="text" value={fssName} onChange={(e) => setFssName(e.target.value)} placeholder="Food Safety Supervisor's name" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Phone</label>
              <input type="text" value={fssPhone} onChange={(e) => setFssPhone(e.target.value)} placeholder="Phone" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Email</label>
              <input type="email" value={fssEmail} onChange={(e) => setFssEmail(e.target.value)} placeholder="Email" className={inputClass} />
            </div>

            <fieldset className="space-y-2">
              <legend className={labelClass}>Roles that require Food Handling certification</legend>
              {staffRoles.length === 0 && (
                <p className="font-sans text-sm text-ink/70">Add staff roles first on the Staff roles page, then come back here.</p>
              )}
              {staffRoles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 font-sans text-sm text-ink">
                  <input type="checkbox" checked={foodHandlingRoleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                  {r.name}
                </label>
              ))}
            </fieldset>
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
