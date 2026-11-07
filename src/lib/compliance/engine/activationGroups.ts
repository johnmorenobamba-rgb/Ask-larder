import type { ActivationItem } from "@/components/owner/FormActivationList";
import { FORMS } from "./forms";
import { activationReason, isFormOn, type ActivationRow } from "./activation";
import { CADENCE_HEADINGS, CADENCE_ORDER, FORM_TAG_LABELS, type ActivationContext } from "./types";

// The compliance forms grouped by cadence, each with its on or off state and the reason. Shared by the owner
// forms page and the wizard's compliance forms step so both always show the same list. Pure and unit tested.

export type ActivationGroup = { heading: string; items: ActivationItem[] };

function audienceLabel(departments: readonly string[]): string {
  return (
    departments.map((d) => (d === "BOH" ? "back of house" : d === "BAR" ? "bar" : "front of house")).join(" and ") +
    " staff and managers"
  );
}

export function buildActivationGroups(rows: Map<string, ActivationRow>, ctx: ActivationContext): ActivationGroup[] {
  return CADENCE_ORDER.map((cadence) => ({
    heading: CADENCE_HEADINGS[cadence],
    items: FORMS.filter((f) => f.cadence === cadence).map<ActivationItem>((f) => ({
      id: f.id,
      title: f.title,
      summary: f.summary,
      cadenceLabel: f.cadenceNote,
      tagLabel: FORM_TAG_LABELS[f.tag],
      tagVerified: f.tagVerified,
      tagNote: f.tagNote,
      defaultList: !!f.defaultList,
      on: isFormOn(f, rows.get(f.id), ctx),
      reason: activationReason(f, rows.get(f.id), ctx),
      audience: audienceLabel(f.departments),
    })),
  })).filter((g) => g.items.length > 0);
}

/** Count of generic forms switched on (the temperature log is counted separately: it is always on). */
export function countFormsOn(rows: Map<string, ActivationRow>, ctx: ActivationContext): number {
  return FORMS.filter((f) => isFormOn(f, rows.get(f.id), ctx)).length;
}

/**
 * Answers the defaults depend on that are still missing, worded for the owner. A missing answer does not block
 * anything: the older defaults apply. It is flagged because it usually means a pub ends up without its bar forms
 * or a cafe without its cafe forms.
 */
export function missingActivationAnswers(ctx: ActivationContext): { message: string; step: "compliance-setup" | "food-service" }[] {
  const missing: { message: string; step: "compliance-setup" | "food-service" }[] = [];
  if (ctx.venueType === null) {
    missing.push({
      message: "Venue type isn't set. Pubs and bars start with the bar forms on and cafes with the cafe forms on only once it is.",
      step: "compliance-setup",
    });
  }
  if (ctx.foodService === null) {
    missing.push({
      message: "Food service level isn't set, so the full kitchen forms are on. Set it if this venue doesn't cook.",
      step: "food-service",
    });
  }
  if (ctx.tradeWaste === "unsure") {
    missing.push({
      message: "Trade Waste Agreement is unsure, so the grease trap log is off. Check with the venue's water retailer.",
      step: "compliance-setup",
    });
  }
  return missing;
}
