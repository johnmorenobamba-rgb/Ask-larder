import type { ChecklistItem, FailRule, FieldDef, FormDef, RulesObject, StageDef } from "./types";

// Compiles a catalog form (or one stage of it) into the rules object the database function checks.
// The route is the only place this runs on the request path; a client cannot supply or change it.
// evaluateFail is a TypeScript mirror used for the live pass or fail indicator on screen and for
// unit tests. The DATABASE decides the stored result; this never does.

export type CompileOptions = {
  stageKey?: string;
  /** Resolved checklist items from the venue's stations, per checklist field key. */
  stationItems?: Record<string, ChecklistItem[]>;
};

export function findStage(def: FormDef, stageKey: string | undefined): StageDef | null {
  if (!def.stages || def.stages.length === 0) return null;
  const key = stageKey ?? def.stages[0].key;
  return def.stages.find((s) => s.key === key) ?? null;
}

export function fieldsFor(def: FormDef, stage: StageDef | null): FieldDef[] {
  return stage ? stage.fields : def.fields;
}

export function failFor(def: FormDef, stage: StageDef | null): FailRule[] {
  return stage ? stage.fail : def.fail;
}

/** Checklist items for a field: the venue's station items first, then the fixed items. */
export function resolvedItems(field: Extract<FieldDef, { type: "checklist" }>, stationItems: ChecklistItem[] | undefined): ChecklistItem[] {
  return [...(stationItems ?? []), ...field.items];
}

function compileField(field: FieldDef, opts: CompileOptions): Record<string, unknown> {
  const base: Record<string, unknown> = { key: field.key, type: field.type, required: field.required !== false };
  switch (field.type) {
    case "number":
      return { ...base, min: field.min, max: field.max };
    case "money":
      return { ...base, ...(field.min !== undefined ? { min: field.min } : {}), ...(field.max !== undefined ? { max: field.max } : {}) };
    case "choice":
      return { ...base, options: field.options.map((o) => o.value) };
    case "text":
      return { ...base, maxLength: field.maxLength ?? 300 };
    case "checklist":
      return { ...base, items: resolvedItems(field, opts.stationItems?.[field.key]) };
    default:
      return base;
  }
}

function compileFail(rule: FailRule): Record<string, unknown> {
  const out: Record<string, unknown> = { field: rule.field, op: rule.op, label: rule.label };
  if (rule.value !== undefined) out.value = rule.value;
  if (rule.min !== undefined) out.min = rule.min;
  if (rule.max !== undefined) out.max = rule.max;
  if (rule.values) out.values = rule.values;
  if (rule.other) out.other = rule.other;
  if (rule.when) out.when = rule.when;
  return out;
}

export function compileRules(def: FormDef, opts: CompileOptions = {}): RulesObject {
  const stage = findStage(def, opts.stageKey);
  if (def.stages && !stage) throw new Error(`Unknown stage for form ${def.id}`);
  const rules: RulesObject = {
    version: 1,
    form_version: def.version,
    event: !!def.event,
    note_on_fail: true,
    allow_correction: def.allowCorrection && !stage,
    cosign: !!def.cosign,
    fields: fieldsFor(def, stage).map((f) => compileField(f, opts)),
    fail: failFor(def, stage).map(compileFail),
  };
  if (def.subjectField) rules.subject = { field: def.subjectField };
  if (stage) {
    rules.stage = {
      key: stage.key,
      chain: stage.chain,
      ...(stage.requires ? { requires: stage.requires } : {}),
      ...(stage.requiresPrior ? { requires_prior: stage.requiresPrior } : {}),
      ...(stage.elapsedMaxMin !== undefined ? { elapsed_max_min: stage.elapsedMaxMin } : {}),
      ...(stage.elapsedLabel ? { elapsed_label: stage.elapsedLabel } : {}),
    };
  }
  return rules;
}

export type FieldValue = number | string | Record<string, string> | null | undefined;

/** Mirror of the database's fail rules. Returns the labels of every rule that fails. */
export function evaluateFail(rules: FailRule[], values: Record<string, FieldValue>): string[] {
  const reasons: string[] = [];
  for (const r of rules) {
    const v = values[r.field];
    if (v === undefined || v === null || v === "") continue;
    if (r.when) {
      const w = values[r.when.field];
      if (String(w) !== r.when.value) continue;
    }
    let hit = false;
    const n = typeof v === "number" ? v : Number(v);
    switch (r.op) {
      case "gt":
        hit = n > Number(r.value);
        break;
      case "gte":
        hit = n >= Number(r.value);
        break;
      case "lt":
        hit = n < Number(r.value);
        break;
      case "lte":
        hit = n <= Number(r.value);
        break;
      case "outside":
        hit = n < Number(r.min) || n > Number(r.max);
        break;
      case "eq":
        hit = String(v) === String(r.value);
        break;
      case "neq":
        hit = String(v) !== String(r.value);
        break;
      case "in":
        hit = (r.values ?? []).includes(String(v));
        break;
      case "any_fail":
        hit = typeof v === "object" && Object.values(v).some((x) => x === "fail");
        break;
      case "differs": {
        const o = values[r.other ?? ""];
        if (o === undefined || o === null || o === "") break;
        hit = Math.abs(n - Number(o)) > Number(r.value ?? 0);
        break;
      }
    }
    if (hit) reasons.push(r.label);
  }
  return reasons;
}
