"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ElevatedCell } from "@/components/shared/ElevatedCell";
import { ChitMark } from "@/components/shared/ChitMark";
import { FounderEscalationPanel } from "./FounderEscalationPanel";
import { primaryButtonClass, secondaryButtonClass, errorClass } from "./fieldStyles";
import type { VenueTypeFlags } from "@/lib/onboarding/steps";

type Summary = {
  staffCount: number;
  staffRoleCount: number;
  moduleCount: number;
  pendingModuleCount: number;
  certificateTypeCount: number;
  menuItemCount: number;
  contactCount: number;
};

const ESCALATION_LABELS: Record<string, string> = {
  non_vic_state: "This venue's state is outside Victoria",
  gaming_egm: "Gaming or EGM entitlement",
  licence_type_other_unsure: "Licence type not yet clear",
  licence_status_unconfirmed: "Licence status not yet resolved",
};

/**
 * Q2 Page 14 — review & activate. The wizard's one hero moment: ElevatedCell
 * per the task brief, wrapped around a multi-child layout of its own (the
 * "className lands outside .elevated-cell-content" gotcha), and Stamp is
 * deliberately NOT used here — this is a review moment, not module
 * completion, cert verification, or e-signature confirmation.
 */
export function ReviewAndActivateStep({
  venueSlug,
  venueName,
  flags,
  summary,
  outstandingItems,
}: {
  venueSlug: string;
  venueName: string;
  flags: VenueTypeFlags;
  summary: Summary;
  outstandingItems: string[];
}) {
  const router = useRouter();
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const escalations = flags.founder_escalation ?? [];

  async function activate() {
    setActivating(true);
    setError(null);
    const res = await fetch("/api/owner/onboarding/activate", { method: "POST" });
    setActivating(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't activate this venue.");
      return;
    }
    setActivated(true);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Review & activate</h2>
        <p className="font-sans text-sm text-ink/70">A last look before this venue goes live.</p>
      </div>

      <ElevatedCell depth="hero" glowColor="var(--color-preserve-red)" className="rounded-3xl bg-parchment">
        <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
          <ChitMark size={72} intensity={activated ? "hero" : "default"} />
          <h3 className="font-display text-2xl font-bold text-ink">{venueName}</h3>
          {activated ? (
            <p className="font-sans text-bay-green">Onboarding marked complete.</p>
          ) : (
            <p className="font-sans text-sm text-ink/70">Ready to move on to day-to-day use.</p>
          )}

          <div className="grid w-full grid-cols-2 gap-3 pt-4 text-left sm:grid-cols-3">
            <Stat label="Staff invited" value={summary.staffCount} />
            <Stat label="Roles" value={summary.staffRoleCount} />
            <Stat label="Modules" value={summary.moduleCount} />
            <Stat label="Pending approval" value={summary.pendingModuleCount} />
            <Stat label="Certificate types" value={summary.certificateTypeCount} />
            <Stat label="Menu items" value={summary.menuItemCount} />
            <Stat label="Contacts" value={summary.contactCount} />
          </div>

          {escalations.length > 0 && (
            <div className="w-full space-y-2 pt-4 text-left">
              {escalations.map((key) => (
                <FounderEscalationPanel key={key} title={ESCALATION_LABELS[key] ?? key} body="Still flagged for the founder to follow up before this venue relies on it." />
              ))}
            </div>
          )}

          {outstandingItems.length > 0 && (
            <div className="w-full space-y-1 rounded-2xl border-2 border-clay-brown/40 px-4 py-3 text-left">
              <p className="font-mono text-[10px] uppercase tracking-wide text-clay-brown">Still open</p>
              <ul className="list-disc space-y-1 pl-4 font-sans text-sm text-ink">
                {outstandingItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className={errorClass}>{error}</p>}

          {activated ? (
            <div className="flex gap-3 pt-2">
              <Link href={`/${venueSlug}/owner/modules`} className={secondaryButtonClass}>
                Review modules
              </Link>
              <Link href={`/${venueSlug}/owner/dashboard`} className={primaryButtonClass}>
                Go to dashboard
              </Link>
            </div>
          ) : (
            <button type="button" onClick={activate} disabled={activating} className={`${primaryButtonClass} mt-2`}>
              {activating ? "Activating…" : "Mark onboarding complete"}
            </button>
          )}
        </div>
      </ElevatedCell>

      <p className="font-sans text-xs text-ink/60">
        Modules still go live one at a time from the Modules page, each with your explicit approval. Marking
        onboarding complete here does not skip that gate.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-clay-brown/10 px-3 py-2">
      <p className="font-display text-xl text-ink">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-wide text-clay-brown">{label}</p>
    </div>
  );
}
