// Block Q4 — shared onboarding wizard constants. No side effects, safe to
// import from both server and client components.

export const AU_STATES = [
  { code: "VIC", label: "Victoria" },
  { code: "NSW", label: "New South Wales" },
  { code: "QLD", label: "Queensland" },
  { code: "WA", label: "Western Australia" },
  { code: "SA", label: "South Australia" },
  { code: "TAS", label: "Tasmania" },
  { code: "ACT", label: "Australian Capital Territory" },
  { code: "NT", label: "Northern Territory" },
] as const;

export type AuStateCode = (typeof AU_STATES)[number]["code"];

// Q1 catalog row 41 / D.1.5: WWCC naming is state-specific and must never be
// hardcoded across states. Every P1/P2 document to date is Victoria-only, so
// Victoria is the one state this app asserts a confirmed name for. Every
// other state falls back to freetext plus a founder-escalation note in
// CertificateTypesForm, rather than a guessed name.
export const VIC_WWCC_LABEL = "Working with Children Check (WWCC)";

// Q2 §"Page 10": constrained in the wizard UI even though venue_contacts's
// own contact_type column is unconstrained text at the DB layer.
export const CONTACT_TYPES = [
  { value: "electrician", label: "Electrician" },
  { value: "plumber", label: "Plumber" },
  { value: "locksmith", label: "Locksmith" },
  { value: "insurer", label: "Insurer" },
  { value: "regulator", label: "Regulator" },
  { value: "escalation", label: "Escalation contact" },
  { value: "fire_police_non_emergency", label: "Fire/police (non-emergency)" },
] as const;

// Written from Page 5 (crowd control), not Page 10, but the same table/enum
// vocabulary — kept here so both pages agree on the exact value strings.
export const SECURITY_FIRM_CONTACT_TYPE = "security_firm";
export const CROWD_CONTROL_LICENCES_CONTACT_TYPE = "crowd_control_licences";

export const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
] as const;

export const DEPARTMENTS = [
  { value: "FOH", label: "Front of house" },
  { value: "BOH", label: "Back of house" },
] as const;

export const FALLBACK_TIERS = [
  { value: "frontline", label: "Frontline" },
  { value: "authorized", label: "Authorized" },
] as const;

export const FOOD_SERVICE_LEVELS = [
  { value: "full_kitchen", label: "Full kitchen" },
  { value: "bar_snacks_low_risk", label: "Bar snacks or packaged, low risk food only" },
  { value: "no_food_service", label: "No food service" },
] as const;

export const LICENCE_TYPES = [
  { value: "general_club", label: "General/Club" },
  { value: "on_premises", label: "On premises" },
  { value: "other_unsure", label: "Other/unsure" },
] as const;

// Matches the live check constraint on venue_licence_profile.licence_status
// (migration 20260907130000 added 'unconfirmed' after the Q2 design doc was
// written, to distinguish "not yet asked" (null) from "asked, genuinely
// unresolved" — the latter routes to founder escalation, not a guess).
export const LICENCE_STATUSES = [
  { value: "none", label: "No licence, fully dry" },
  { value: "byo_unlicensed", label: "No licence, BYO only" },
  { value: "limited", label: "Limited licence" },
  { value: "full", label: "Full licence" },
  { value: "unconfirmed", label: "Not sure yet" },
] as const;

export const MENU_CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "drink", label: "Drink" },
] as const;

// Q1 Part B topics (16 rows), condensed to one wizard-facing list for the
// SOP intake hub. "appliesWhen" is a best-effort UI hint only (dims a topic
// that looks not-yet-relevant) — every topic stays reachable regardless, in
// keeping with Q2 §1's "never gate a page" rule.
export const PART_B_TOPICS: { key: string; label: string; appliesWhen?: (flags: { licensed?: boolean; crowd_control_required?: boolean; runs_happy_hour?: boolean; food_service_level?: string }) => boolean }[] = [
  { key: "welcome_and_how_we_work", label: "Welcome & how we work" },
  { key: "rsa_and_responsible_service", label: "RSA & responsible service", appliesWhen: (f) => f.licensed !== false },
  { key: "food_handling_and_allergens", label: "Food handling & allergens", appliesWhen: (f) => f.food_service_level !== "no_food_service" },
  { key: "food_safety_fundamentals", label: "Food safety fundamentals", appliesWhen: (f) => f.food_service_level === "full_kitchen" },
  { key: "equipment_operating_and_cleaning", label: "Equipment operating & cleaning" },
  { key: "cellar_and_gas_safety", label: "Cellar & gas safety, keg/tap lines" },
  { key: "workplace_health_and_safety", label: "Workplace health & safety" },
  { key: "cash_handling_and_reconciliation", label: "Cash handling & reconciliation" },
  { key: "closing_procedures_and_premises_security", label: "Closing procedures & premises security" },
  { key: "business_continuity_and_emergencies", label: "Business continuity & emergencies" },
  { key: "happy_hour_and_promotional_pricing", label: "Happy hour & promotional pricing", appliesWhen: (f) => f.runs_happy_hour === true },
  { key: "crowd_control_and_door_security", label: "Crowd control & door security", appliesWhen: (f) => f.crowd_control_required === true },
  { key: "trading_hours_licence_and_capacity", label: "Trading hours, licence & capacity", appliesWhen: (f) => f.licensed !== false },
  { key: "restricted_content_safe_and_alarm_access", label: "Restricted: safe & alarm access" },
  { key: "display_cabinet_and_grab_and_go_safety", label: "Display cabinet & grab-and-go safety" },
] as const;

export const COMMON_ALLERGENS = [
  "gluten",
  "dairy",
  "eggs",
  "nuts",
  "peanuts",
  "shellfish",
  "fish",
  "soy",
  "sesame",
] as const;
