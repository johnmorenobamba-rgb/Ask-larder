"use client";

import { useRouter } from "next/navigation";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { primaryButtonClass } from "./fieldStyles";

/**
 * Page 8c reuses the existing /api/owner/stations route unchanged (it has
 * no reason to know about wizard_sessions), so there's no domain POST here
 * to hand back updated flags the way every other step's Continue button
 * gets them. flags are read server-side by the page instead and passed in.
 */
export function EquipmentContinueButton({ venueSlug, flags }: { venueSlug: string; flags: VenueTypeFlags }) {
  const router = useRouter();

  async function handleContinue() {
    await fetch("/api/owner/onboarding/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStep: "equipment" }),
    });
    router.push(stepHref(venueSlug, getNextStep("equipment", flags)));
  }

  return (
    <button type="button" onClick={handleContinue} className={primaryButtonClass}>
      Continue
    </button>
  );
}
