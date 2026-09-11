// Block Q4 — the wizard's page order and branch logic, per
// docs/block-q/q2-wizard-flow-and-schema.md §2/§3. Kept as one small,
// framework-free module so both server pages (computing "what's next") and
// the client-side WizardStepNav can import it without pulling in
// server-only Supabase code.

export type VenueTypeFlags = {
  licensed?: boolean;
  crowd_control_required?: boolean;
  rsa_marshal_designated?: boolean;
  food_service_level?: "full_kitchen" | "bar_snacks_low_risk" | "no_food_service";
  runs_happy_hour?: boolean;
  founder_escalation?: string[];
  // Whether licensed_capacity/approved_trading_hours are confirmed against
  // the actual licence document per Q1's D.1.2 compliance-critical bar, or
  // are still a best-available figure pending that document. Q1/Q2's design
  // (q2-wizard-flow-and-schema.md §3, Page 4) deliberately left this as a
  // UI-only distinction rather than a schema column -- Block Q9's real
  // onboarding run found the UI checkbox for it was never actually wired to
  // anything, so it's persisted here (matching every other non-schema
  // branching/outstanding-item flag) and surfaced on Review & activate.
  capacity_sourced_from_document?: boolean;
};

export const WIZARD_STEP_SLUGS = [
  "venue-basics",
  "licensing",
  "licence-detail",
  "crowd-control",
  "rsa",
  "food-service",
  "menu",
  "equipment",
  "promotions",
  "contacts",
  "staff-roles",
  "staff-invite",
  "content-intake",
  "certificate-types",
  "review",
] as const;

export type WizardStepSlug = (typeof WIZARD_STEP_SLUGS)[number];

export const WIZARD_STEPS: { slug: WizardStepSlug; label: string }[] = [
  { slug: "venue-basics", label: "Venue basics" },
  { slug: "licensing", label: "Licensing" },
  { slug: "licence-detail", label: "Licence detail" },
  { slug: "crowd-control", label: "Crowd control" },
  { slug: "rsa", label: "RSA" },
  { slug: "food-service", label: "Food service" },
  { slug: "menu", label: "Menu" },
  { slug: "equipment", label: "Equipment" },
  { slug: "promotions", label: "Promotions" },
  { slug: "contacts", label: "Business continuity" },
  { slug: "staff-roles", label: "Staff roles" },
  { slug: "staff-invite", label: "Invite staff" },
  { slug: "content-intake", label: "SOPs & training content" },
  { slug: "certificate-types", label: "Certificate types" },
  { slug: "review", label: "Review & activate" },
];

// Whether the given step is relevant given branch flags collected so far.
// "Not applicable" never means "not reachable" — Q2 §1 is explicit that
// every step page stays independently reachable/editable regardless of
// current_step or branch flags. This only drives a muted "not needed based
// on your answers so far" treatment in the step nav, and the default
// forward-navigation target from each page's Continue button.
export function isStepApplicable(slug: WizardStepSlug, flags: VenueTypeFlags): boolean {
  // Unknown (LIC0 not yet answered) defaults to true so licensed-only pages
  // aren't prematurely greyed out before the venue has actually said no.
  const licensed = flags.licensed !== false;
  switch (slug) {
    case "licence-detail":
    case "crowd-control":
    case "rsa":
    case "promotions":
      return licensed;
    default:
      return true;
  }
}

export function getNextStep(slug: WizardStepSlug, flags: VenueTypeFlags): WizardStepSlug {
  const licensed = flags.licensed !== false;
  switch (slug) {
    case "venue-basics":
      return "licensing";
    case "licensing":
      // Q2 Page 3 branch: no licence skips straight to Food service level,
      // no licence-detail/crowd-control/rsa/promotions pages shown at all.
      return licensed ? "licence-detail" : "food-service";
    case "licence-detail":
      return "crowd-control";
    case "crowd-control":
      return "rsa";
    case "rsa":
      return "food-service";
    case "food-service":
      return "menu";
    case "menu":
      return "equipment";
    case "equipment":
      return licensed ? "promotions" : "contacts";
    case "promotions":
      return "contacts";
    case "contacts":
      return "staff-roles";
    case "staff-roles":
      return "staff-invite";
    case "staff-invite":
      return "content-intake";
    case "content-intake":
      return "certificate-types";
    case "certificate-types":
      return "review";
    case "review":
      return "review";
  }
}

export function stepHref(venueSlug: string, slug: WizardStepSlug): string {
  return `/${venueSlug}/owner/onboarding/${slug}`;
}
