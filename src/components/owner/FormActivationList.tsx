"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ActivationItem = {
  id: string;
  title: string;
  summary: string;
  cadenceLabel: string;
  tagLabel: string;
  tagVerified: boolean;
  tagNote: string;
  defaultList: boolean;
  on: boolean;
  reason: string;
  audience: string;
};

// Owner switches for the compliance forms. A switch saves straight away (manager tier only, enforced by
// the database), then the page refreshes. The reason line says why a form is on or off.
// headingLevel: the cadence group headings sit under the page title on Owner, Forms (h2, the default) and under
// the step title inside the onboarding wizard (h3).
export function FormActivationList({
  groups,
  headingLevel = 2,
  refreshAfterSave = true,
}: {
  groups: { heading: string; items: ActivationItem[] }[];
  headingLevel?: 2 | 3;
  /**
   * Re-render the server page after a toggle. The owner Compliance forms page passes false: after a save the switch
   * state and its reason line ("Switched on/off by the owner", activationReason) are already known here, and nothing
   * else on that page depends on them, so a refresh would only re-run the whole layout for nothing. The onboarding
   * wizard step keeps it.
   */
  refreshAfterSave?: boolean;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, boolean>>({});

  async function toggle(item: ActivationItem, next: boolean) {
    setBusy(item.id);
    setError(null);
    try {
      const res = await fetch("/api/owner/compliance/forms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: item.id, enabled: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Couldn't save that. Try again.");
      } else {
        setState((s) => ({ ...s, [item.id]: next }));
        if (refreshAfterSave) router.refresh();
      }
    } catch {
      setError("Couldn't reach the server. Try again.");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-8">
      {error && (
        <p role="alert" className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-preserve-red">
          {error}
        </p>
      )}
      {groups.map((g) => (
        <section key={g.heading} aria-labelledby={`g-${g.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="space-y-3">
          <Heading id={`g-${g.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="font-display text-xl font-bold text-ink">
            {g.heading}
          </Heading>
          <ul className="space-y-3">
            {g.items.map((item) => {
              const on = state[item.id] ?? item.on;
              // Same wording as activationReason() once the owner has an explicit choice on record.
              const reason = state[item.id] === undefined ? item.reason : state[item.id] ? "Switched on by the owner" : "Switched off by the owner";
              return (
                <li key={item.id} className={`flex flex-wrap items-start justify-between gap-4 rounded-2xl border-2 px-4 py-4 ${on ? "border-bay-green" : "border-clay-brown/50"}`}>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-sans text-lg font-medium text-ink">{item.title}</p>
                    <p className="font-sans text-sm text-ink/80">{item.summary}</p>
                    <p className="font-sans text-sm text-ink/70">
                      <span className="mr-2 inline-block rounded-full border border-clay-brown px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-clay-brown">{item.tagLabel}</span>
                      {item.cadenceLabel.replace(/.$/, "")}. Filled by {item.audience}.{item.defaultList ? " Default list, review before use." : ""}
                    </p>
                    <p className="font-sans text-sm text-ink/70">{item.tagNote}</p>
                    <p className="font-sans text-sm text-ink/70">{reason}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={item.title}
                    disabled={busy === item.id}
                    onClick={() => toggle(item, !on)}
                    className={`min-h-12 min-w-24 shrink-0 rounded-full border-2 px-5 font-sans text-base font-medium ${
                      on ? "border-bay-green bg-bay-green text-parchment" : "border-clay-brown bg-parchment text-ink hover:border-ink"
                    }`}
                  >
                    {busy === item.id ? "Saving" : on ? "On" : "Off"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
