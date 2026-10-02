import type { Department } from "../catalog";

// Compliance engine types (Stage 0). A form is fixed content in code, never owner editable data.
// Everything the database needs to judge a record is compiled from these definitions by rules.ts
// and handed to submit_compliance_record by the route; a client never supplies any of it.

export type Cadence = "shift" | "daily" | "weekly" | "monthly" | "annual" | "event";

export const CADENCE_ORDER: Cadence[] = ["shift", "daily", "weekly", "monthly", "annual", "event"];

export const CADENCE_HEADINGS: Record<Cadence, string> = {
  shift: "Every shift",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "Yearly",
  event: "When it happens",
};

/**
 * What an owner is told about a form. Only "legal" and "required_if" are shown where the researcher
 * confirmed the claim from a primary source (tagVerified). Everything else is a recommended record.
 */
export type FormTag = "legal" | "required_if" | "recommended";

export const FORM_TAG_LABELS: Record<FormTag, string> = {
  legal: "Legally required",
  required_if: "Required if",
  recommended: "Recommended record",
};

export type ChecklistItem = { key: string; label: string };

type FieldBase = { key: string; label: string; hint?: string; required?: boolean };

export type NumberField = FieldBase & {
  type: "number";
  unit?: string;
  min: number;
  max: number;
  /** Phones show a plus or minus toggle because the iOS decimal keypad has no minus key. */
  allowNegative?: boolean;
};
export type MoneyField = FieldBase & { type: "money"; min?: number; max?: number };
export type TimeField = FieldBase & { type: "time" };
export type PassFailField = FieldBase & { type: "passfail"; passLabel?: string; failLabel?: string };
export type ChoiceField = FieldBase & { type: "choice"; options: { value: string; label: string }[] };
export type TextField = FieldBase & { type: "text"; maxLength?: number; multiline?: boolean };
export type ChecklistField = FieldBase & {
  type: "checklist";
  /** Fixed items, or a source resolved at request time (kitchen stations) plus fixed items. */
  items: ChecklistItem[];
  fromStations?: { prefix: string; stationItemLabel: (stationName: string) => string };
};

export type FieldDef = NumberField | MoneyField | TimeField | PassFailField | ChoiceField | TextField | ChecklistField;

export type FailRule = {
  field: string;
  op: "gt" | "gte" | "lt" | "lte" | "outside" | "eq" | "neq" | "in" | "any_fail" | "differs";
  value?: number | string;
  min?: number;
  max?: number;
  values?: string[];
  /** differs: the other field compared against, with value as the allowed gap. */
  other?: string;
  /** The rule only applies when another field has this value (for example hot versus cold). */
  when?: { field: string; value: string };
  /** Plain words shown to staff and on the record when this rule fails. */
  label: string;
};

export type StageDef = {
  key: string;
  label: string;
  /** "new" starts a chain, "existing" continues one. */
  chain: "new" | "existing";
  requires?: string;
  requiresPrior?: string[];
  /** Earlier steps that SHOULD exist: a missing one does not block this step, it makes the record a fail. */
  softPrior?: string[];
  softPriorLabel?: string;
  /** Minutes allowed since the start, measured on the server clock. */
  elapsedMaxMin?: number;
  elapsedLabel?: string;
  departments: Department[];
  fields: FieldDef[];
  fail: FailRule[];
  blurb: string;
};

/** What a venue's compliance settings say, used only to pick which forms start switched on. */
export type ActivationContext = {
  foodService: "full_kitchen" | "bar_snacks_low_risk" | "no_food_service" | null;
  licenceType: string | null;
  offersAccommodation: boolean;
  tradeWaste: "yes" | "no" | "unsure";
  highRiskActivities: string[];
};

export type FormGroup = "kitchen" | "front" | "bar" | "venue" | "cafe";

export type FormDef = {
  id: string;
  title: string;
  /** One plain sentence: what this record is for. */
  summary: string;
  group: FormGroup;
  /** Departments allowed to fill it. Manager tier and owners always can. */
  departments: Department[];
  /** Who can see the records (RLS visible_to_roles). Defaults to departments. */
  visibleTo?: Department[];
  cadence: Cadence;
  cadenceNote: string;
  /** daily or shift forms turn Overdue on the same day once the local hour reaches this. */
  dueAfterHour?: number;
  estMinutes: number;
  tag: FormTag;
  tagVerified: boolean;
  tagNote: string;
  /** A separate legal note about the limits or timings inside the form, where one is confirmed. */
  ruleTag?: { tag: "legal" | "required_if"; text: string };
  /** The list of checks or the limits are Larder defaults that the venue should review. */
  defaultList?: boolean;
  fields: FieldDef[];
  fail: FailRule[];
  /** What happens when a record fails, in words for staff and the guide. */
  failBehaviour: string;
  event?: boolean;
  allowCorrection: boolean;
  /** subject_key comes from this field (registers, thermometers). */
  subjectField?: string;
  stages?: StageDef[];
  cosign?: boolean;
  kind?: "record" | "register";
  /** The default for a venue with no explicit choice. */
  defaultOn: (ctx: ActivationContext) => boolean;
  defaultOnNote: string;
  version: string;
};

export type RulesObject = {
  version: 1;
  form_version: string;
  event: boolean;
  note_on_fail: boolean;
  allow_correction: boolean;
  cosign: boolean;
  subject?: { field: string };
  stage?: {
    key: string;
    chain: "new" | "existing";
    requires?: string;
    requires_prior?: string[];
    soft_prior?: string[];
    soft_prior_label?: string;
    elapsed_max_min?: number;
    elapsed_label?: string;
  };
  fields: unknown[];
  fail: unknown[];
};
