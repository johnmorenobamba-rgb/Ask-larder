/**
 * Victoria-specific cert tracking rules, locked 15 Sep 2026 build session.
 * WWCC is a hard legal deadline under VIC's Worker Screening Act (5 years
 * from issue) -- it stays exactly as urgent as it is today. RSA, Food
 * Handling, Food Safety Supervisor, and First Aid are industry-recommended
 * refreshers in VIC, not mandatory renewals with a legal cutoff, and must
 * read that way in the product (never "expired"/"non-compliant").
 *
 * MUST be re-verified per state before any interstate venue onboards --
 * WWCC in particular is state/territory-specific (different regulator,
 * different name per state, see CLAUDE.md) and there is no guarantee the
 * 5-year period or the "recommended, not mandatory" framing for the other
 * four holds outside Victoria.
 */

export type CertKind = "wwcc" | "rsa" | "food_safety_supervisor" | "food_handling" | "first_aid" | "other";
export type TrackingType = "hard_expiry" | "recommended_refresher";

export const CERT_KIND_CONFIG: Record<Exclude<CertKind, "other">, { trackingType: TrackingType; validityYears: number }> = {
  wwcc: { trackingType: "hard_expiry", validityYears: 5 },
  rsa: { trackingType: "recommended_refresher", validityYears: 3 },
  food_safety_supervisor: { trackingType: "recommended_refresher", validityYears: 3 },
  food_handling: { trackingType: "recommended_refresher", validityYears: 3 },
  first_aid: { trackingType: "recommended_refresher", validityYears: 3 },
};

/** issuedDate is an ISO date string (YYYY-MM-DD). Returns the same shape. */
export function computeCertDueDate(issuedDate: string, validityYears: number): string {
  const d = new Date(`${issuedDate}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + validityYears);
  return d.toISOString().slice(0, 10);
}
