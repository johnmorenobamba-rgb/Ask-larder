import type { ComplianceStatusTag, RefrigerationUnitType } from "./types";

// Static catalog of compliance form definitions (Stage 0b, first real use).
// These are fixed regulatory content, so they live in code, not the database
// (locked decision, 29 Sep 2026). Only B2 exists so far.
//
// The status tags come from the primary source research done for the Stage 0b
// plan (1 Oct 2026), not just the Build Reference:
//   cold 5 C or below and hot hold 60 C or above are legal limits
//     (Food Standards Code, Standard 3.2.2, potentially hazardous food);
//   the frozen limit of -15 C is Victorian FoodSmart guidance, not a Code limit;
//   a written log is one accepted way to show compliance under Standard 3.2.2A
//     (the evidence tool), not the only way;
//   once a day is guidance ("should be made each day"), and a daily record is
//     required where the venue's Food Safety Program follows FoodSmart.
// Retention and frequency are NEVER described as legal minimums in the UI.

export type Department = "BOH" | "FOH" | "BAR";

// Owner facing wording per tag. The tag values (M, M*, C, BP) stay as stored data. Until a person has read the standards
// and the FoodSmart record sheets, every tag is shown with the one neutral label below (display layer only).
export const STATUS_TAG_LABELS: Record<ComplianceStatusTag, string> = {
  M: "Recommended record",
  "M*": "Recommended record",
  C: "Recommended record",
  BP: "Recommended record",
};

export type LimitInfo = {
  tag: ComplianceStatusTag;
  /** Short label shown next to a unit's limit. */
  label: string;
  /** One plain sentence explaining the basis. */
  basis: string;
};

export type ComplianceFormDef = {
  id: "B2";
  title: string;
  category: "BOH";
  statusTag: ComplianceStatusTag;
  statusNote: string;
  /** staff_roles.department values that may submit and see this form. */
  visibleToRoles: readonly Department[];
  /** Manager tier staff and owners can always submit and see it. */
  managerTierAlways: true;
  limits: Record<RefrigerationUnitType, LimitInfo>;
  frequency: { tag: ComplianceStatusTag; note: string };
  retentionNote: string;
};

export const COMPLIANCE_FORMS = {
  B2: {
    id: "B2",
    title: "Temperature log",
    category: "BOH",
    statusTag: "M*",
    statusNote: "Food businesses must be able to show their temperature controls work. A written log is one accepted way to do that.",
    visibleToRoles: ["BOH"],
    managerTierAlways: true,
    limits: {
      cold: {
        tag: "M",
        label: "Recommended limit",
        basis: "Suggested limit: keep potentially hazardous food at 5°C or colder.",
      },
      frozen: {
        tag: "BP",
        label: "Recommended limit",
        basis: "Suggested limit: keep frozen food frozen hard. The limit of −15°C follows Victorian FoodSmart guidance.",
      },
      hot_hold: {
        tag: "M",
        label: "Recommended limit",
        basis: "Suggested limit: keep potentially hazardous food at 60°C or hotter.",
      },
    },
    frequency: {
      tag: "BP",
      note: "A reading for every unit once a day is suggested. Check what your venue's Food Safety Program asks for.",
    },
    retentionNote: "Larder keeps these records for at least 2 years by default.",
  },
} as const satisfies Record<string, ComplianceFormDef>;

export type ComplianceFormId = keyof typeof COMPLIANCE_FORMS;

export function getForm(id: ComplianceFormId): ComplianceFormDef {
  return COMPLIANCE_FORMS[id];
}

/** Who may submit (and see) a form: manager tier and owners always, otherwise the form's departments. */
export function canSubmitForm(
  form: ComplianceFormDef,
  who: { isManagerTier: boolean; department: string | null | undefined },
): boolean {
  if (who.isManagerTier) return true;
  return !!who.department && (form.visibleToRoles as readonly string[]).includes(who.department);
}
