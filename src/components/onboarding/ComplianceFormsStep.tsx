"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBusyState } from "@/lib/hooks/useBusyNavigation";
import { FormActivationList } from "@/components/owner/FormActivationList";
import type { ActivationGroup } from "@/lib/compliance/engine/activationGroups";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { cardClass, errorClass, labelClass, primaryButtonClass } from "./fieldStyles";

type Missing = { message: string; step: "compliance-setup" | "food-service" };
type Listed = { id: string; title: string; note: string };

/**
 * Wizard step: the compliance forms review. Shows every form with the on or off state the venue's answers
 * produced and the reason, lets the owner switch any of them (saved straight away, same route as Owner,
 * Forms), and lists what is linked to other features and what is held back. Continue records that the
 * list was reviewed. Nothing here is a gate: the owner can come back to Owner, Forms at any time.
 */
export function ComplianceFormsStep({
  venueSlug,
  groups,
  formsOn,
  formsTotal,
  activeUnitCount,
  missing,
  linked,
  held,
  degraded,
}: {
  venueSlug: string;
  groups: ActivationGroup[];
  formsOn: number;
  formsTotal: number;
  activeUnitCount: number;
  missing: Missing[];
  linked: Listed[];
  held: Listed[];
  degraded: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving, navigate] = useBusyState();
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError(null);
    let res: Response;
    try {
      res = await fetch("/api/owner/onboarding/compliance-forms", { method: "POST" });
    } catch {
      setSaving(false);
      setError("Couldn't reach the server. Try again.");
      return;
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setSaving(false);
      setError(body?.error ?? "Couldn't save that. Try again.");
      return;
    }
    const flags = (body?.flags ?? {}) as VenueTypeFlags;
    navigate(() => router.push(stepHref(venueSlug, getNextStep("compliance-forms", flags))));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold text-ink">Compliance forms</h2>
        <p className="font-sans text-sm text-ink/70">
          These are the records your team fills in on the iPad. Each one starts on or off from your answers so far. Switch any of
          them to suit how this venue runs. Your choice always wins, and you can change it later under Owner, Forms.
        </p>
      </div>

      {degraded && (
        <p role="alert" className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-preserve-red">
          Couldn&apos;t load every setting. What you see may be incomplete. Reload the page to try again.
        </p>
      )}

      <div className={cardClass}>
        <p className={labelClass}>Summary</p>
        <p className="font-sans text-base text-ink">
          {formsOn} of {formsTotal} forms on, plus the temperature log.
        </p>
        <p className="font-sans text-sm text-ink/70">
          {activeUnitCount > 0
            ? `The temperature log is always on and covers ${activeUnitCount} ${activeUnitCount === 1 ? "unit" : "units"}.`
            : "The temperature log is always on, but no fridges, freezers or hot hold units are listed yet, so staff have nothing to log."}
          {activeUnitCount === 0 && (
            <>
              {" "}
              <Link href={stepHref(venueSlug, "compliance-setup")} className="underline hover:text-ink">
                Add units
              </Link>
            </>
          )}
        </p>
      </div>

      {missing.length > 0 && (
        <section aria-labelledby="check-answers" className="space-y-3 rounded-2xl border-2 border-saffron px-4 py-5 md:px-6">
          <p id="check-answers" className={labelClass}>
            Check these answers
          </p>
          <ul className="space-y-2">
            {missing.map((m) => (
              <li key={m.message} className="font-sans text-sm text-ink">
                {m.message}{" "}
                <Link href={stepHref(venueSlug, m.step)} className="underline hover:text-ink/70">
                  Go to {m.step === "food-service" ? "Food service" : "Fridges and compliance"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FormActivationList groups={groups} headingLevel={3} />

      <section aria-labelledby="linked-forms" className="space-y-3">
        <h3 id="linked-forms" className="font-display text-xl font-bold text-ink">
          Covered by other parts of Larder
        </h3>
        <p className="font-sans text-sm text-ink/70">Nothing to switch on. These come from certificates, the menu and training.</p>
        <ul className="space-y-2">
          {linked.map((f) => (
            <li key={f.id} className="rounded-2xl border-2 border-clay-brown/20 px-4 py-3">
              <p className="font-sans text-base font-medium text-ink">{f.title}</p>
              <p className="font-sans text-sm text-ink/70">{f.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="held-forms" className="space-y-3">
        <h3 id="held-forms" className="font-display text-xl font-bold text-ink">
          Not in Larder yet
        </h3>
        <p className="font-sans text-sm text-ink/70">
          Keep these on paper or in your current system for now. Each one is held back for the reason shown.
        </p>
        <ul className="space-y-2">
          {held.map((f) => (
            <li key={f.id} className="rounded-2xl border-2 border-clay-brown/20 px-4 py-3">
              <p className="font-sans text-base font-medium text-ink">{f.title}</p>
              <p className="font-sans text-sm text-ink/70">{f.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      <div>
        <button type="button" onClick={confirm} disabled={saving} aria-busy={saving} className={primaryButtonClass}>
          {saving ? "Saving" : "Confirm forms and continue"}
        </button>
      </div>
    </div>
  );
}
