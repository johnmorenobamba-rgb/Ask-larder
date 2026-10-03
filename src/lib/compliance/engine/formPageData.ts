import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logQueryError } from "@/lib/supabase/logQueryError";
import { formatLocalDateTime, formatLocalTime, formatTemp, venueTimeZone } from "../b2";
import { localMidnightInstant, periodStart } from "./due";
import { CHAIN_WINDOW_MS, DEFAULT_CUTOFF_HOUR } from "./hubData";
import { fieldsFor, failFor, findStage, resolvedItems } from "./rules";
import type { ChecklistItem, FieldDef, FormDef, StageDef } from "./types";

// Everything a generic form page needs, loaded through the CALLER's client (RLS applies) except the list
// of possible second signers, which is names only and read with the admin client (the login page
// already shows the same roster).

type Client = SupabaseClient<Database>;

export type RecordSummary = {
  id: string;
  time: string;
  by: string;
  failed: boolean;
  reasons: string[];
  note: string | null;
  headline: string;
  isLatest: boolean;
};

export type OpenChain = {
  chainId: string;
  title: string;
  detail: string;
  startedAt: string;
  startedMs: number;
  nextStage: string;
  nextStageLabel: string;
  dueNote: string | null;
  overdue: boolean;
};

export type RegisterRow = {
  subject: string;
  title: string;
  detail: string;
  retired: boolean;
  values: Record<string, string>;
  time: string;
};

type Rec = {
  id: string;
  submitted_at: string;
  submitted_by_name: string;
  out_of_range: boolean;
  corrective_action: string | null;
  corrects_submission_id: string | null;
  payload: {
    subject_key?: string;
    values?: Record<string, unknown>;
    labels?: Record<string, string>;
    fail_reasons?: string[];
    stage?: string;
    chain_id?: string;
    comment?: string;
    cosigned_by_name?: string;
  };
};

function optionLabel(field: FieldDef, value: unknown): string {
  if (field.type === "choice") return field.options.find((o) => o.value === value)?.label ?? String(value);
  return String(value);
}

/** One line describing what a record holds, for lists. */
export function headlineOf(fields: FieldDef[], payload: Rec["payload"]): string {
  const values = payload.values ?? {};
  const parts: string[] = [];
  for (const f of fields) {
    const v = values[f.key];
    if (v === undefined || v === null) continue;
    if (f.type === "checklist") {
      const entries = Object.values(v as Record<string, string>);
      const passed = entries.filter((x) => x === "pass").length;
      const failedN = entries.filter((x) => x === "fail").length;
      parts.push(failedN > 0 ? `${failedN} of ${entries.length} checks failed` : `${passed} of ${entries.length} checks passed`);
    } else if (f.type === "number") {
      parts.push(`${f.label}: ${f.unit === "°C" ? formatTemp(Number(v)) : `${v}${f.unit ? ` ${f.unit}` : ""}`}`);
    } else if (f.type === "money") {
      parts.push(`${f.label}: $${Number(v).toFixed(2)}`);
    } else if (f.type === "passfail") {
      parts.push(`${f.label}: ${v === "pass" ? (f.passLabel ?? "Pass") : (f.failLabel ?? "Fail")}`);
    } else if (f.type === "choice") {
      parts.push(optionLabel(f, v));
    } else {
      parts.push(String(v));
    }
    if (parts.length >= 3) break;
  }
  return parts.join(", ") || "Record";
}

export function stationItemsFor(
  def: FormDef,
  stage: StageDef | null,
  stations: { id: string; name: string }[],
): Record<string, ChecklistItem[]> {
  const out: Record<string, ChecklistItem[]> = {};
  for (const f of fieldsFor(def, stage)) {
    if (f.type === "checklist" && f.fromStations) {
      out[f.key] = stations.map((s) => ({ key: f.fromStations!.prefix + s.id, label: f.fromStations!.stationItemLabel(s.name) }));
    }
  }
  return out;
}

/** Fields with checklist items resolved (stations plus fixed items), safe to hand to the browser. */
export function resolveFields(def: FormDef, stage: StageDef | null, stations: { id: string; name: string }[]): FieldDef[] {
  const stationItems = stationItemsFor(def, stage, stations);
  return fieldsFor(def, stage).map((f) =>
    f.type === "checklist" ? { ...f, items: resolvedItems(f, stationItems[f.key]), fromStations: undefined } : f,
  );
}

export type FormPageData = {
  degraded: boolean;
  timeZone: string;
  stage: StageDef | null;
  fields: FieldDef[];
  failRules: ReturnType<typeof failFor>;
  records: RecordSummary[];
  registerRows: RegisterRow[];
  openChains: OpenChain[];
  cosigners: { id: string; name: string }[];
  doneNote: string | null;
};

export async function loadFormPage(
  supabase: Client,
  admin: Client,
  args: { venueId: string; staffId: string; def: FormDef; stageKey: string | null; now?: Date },
): Promise<FormPageData> {
  const { venueId, staffId, def } = args;
  const now = args.now ?? new Date();
  const stage = def.stages ? findStage(def, args.stageKey ?? undefined) : null;

  const [{ data: profile, error: pErr }, { data: stations, error: sErr }, { data: cutoffRow }] = await Promise.all([
    supabase.from("venue_licence_profile").select("state").eq("venue_id", venueId).maybeSingle(),
    supabase.from("stations").select("id, name").eq("venue_id", venueId).order("created_at").limit(40),
    supabase.from("venue_compliance_settings").select("trading_day_cutoff_hour").eq("venue_id", venueId).maybeSingle(),
  ]);
  const cutoff = def.tradingDay ? (typeof cutoffRow?.trading_day_cutoff_hour === "number" ? cutoffRow.trading_day_cutoff_hour : DEFAULT_CUTOFF_HOUR) : 0;
  logQueryError("form page profile", pErr);
  logQueryError("form page stations", sErr);
  const timeZone = venueTimeZone(profile?.state);
  const stationList = stations ?? [];
  const fields = resolveFields(def, stage, stationList);
  const allFields = def.stages ? def.stages.flatMap((s) => resolveFields(def, s, stationList)) : fields;

  // Lookback: the whole current period for periodic forms (so a weekly or yearly record made earlier is still
  // shown), the chain window for staged forms, 5 days for other event forms.
  const since = def.stages
    ? new Date(now.getTime() - CHAIN_WINDOW_MS).toISOString()
    : def.event
      ? new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString()
      : localMidnightInstant(periodStart(def.cadence, now, timeZone, cutoff), timeZone, 0);
  const { data: rows, error: rErr } = await supabase
    .from("compliance_form_submissions")
    .select("id, submitted_at, submitted_by_name, out_of_range, corrective_action, corrects_submission_id, payload")
    .eq("venue_id", venueId)
    .eq("form_id", def.id)
    .gte("submitted_at", since)
    .order("submitted_at", { ascending: false })
    .limit(1000);
  logQueryError("form page records", rErr);
  const recs = (rows ?? []) as unknown as Rec[];
  const capped = recs.length >= 1000;
  const corrected = new Set(recs.map((r) => r.corrects_submission_id).filter((x): x is string => !!x));

  const { data: latestRows, error: lErr } = await supabase
    .from("compliance_latest_by_subject")
    .select("id, subject_key, payload, submitted_at, submitted_by_name, out_of_range")
    .eq("venue_id", venueId)
    .eq("form_id", def.id)
    .limit(500);
  logQueryError("form page latest", lErr);
  const latestIds = new Set((latestRows ?? []).map((l) => l.id as string));

  const current = periodStart(def.cadence, now, timeZone, cutoff);
  const visible = recs
    .filter((r) => !corrected.has(r.id))
    .filter((r) => !def.stages && (def.event || periodStart(def.cadence, r.submitted_at, timeZone, cutoff) === current));

  const records: RecordSummary[] = visible.slice(0, def.event ? 12 : 6).map((r) => ({
    id: r.id,
    time: def.event ? formatLocalDateTime(r.submitted_at, timeZone) : formatLocalTime(r.submitted_at, timeZone),
    by: r.submitted_by_name,
    failed: r.out_of_range,
    reasons: r.payload.fail_reasons ?? [],
    note: r.corrective_action,
    headline: headlineOf(allFields, r.payload),
    isLatest: latestIds.has(r.id),
  }));

  // registers: the latest row per subject
  const registerRows: RegisterRow[] =
    def.kind === "register"
      ? (latestRows ?? []).map((l) => {
          const p = (l.payload ?? {}) as Rec["payload"];
          const v = p.values ?? {};
          const first = def.fields[0];
          return {
            subject: l.subject_key as string,
            title: String(v[first.key] ?? l.subject_key),
            detail: def.fields
              .slice(1)
              .filter((f) => f.key !== "status" && v[f.key] !== undefined)
              .map((f) => (f.type === "choice" ? `${f.label}: ${optionLabel(f, v[f.key])}` : String(v[f.key])))
              .join(", "),
            retired: v.status === "retired",
            values: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])),
            time: formatLocalDateTime(l.submitted_at as string, timeZone),
          };
        })
      : [];

  // staged forms: chains still waiting for their next step
  const openChains: OpenChain[] = [];
  if (def.stages && def.stages.length > 1) {
    const stagesList = def.stages;
    const lastKey = stagesList[stagesList.length - 1].key;
    const byChain = new Map<string, Rec[]>();
    for (const r of recs) {
      const cid = r.payload.chain_id;
      if (!cid) continue;
      (byChain.get(cid) ?? byChain.set(cid, []).get(cid)!).push(r);
    }
    for (const [cid, list] of byChain) {
      const have = new Set(list.map((r) => r.payload.stage));
      if (have.has(lastKey)) continue;
      const start = list.find((r) => r.payload.stage === stagesList[0].key);
      if (!start) continue;
      const next = stagesList.find((s) => !have.has(s.key));
      if (!next) continue;
      const startedMs = new Date(start.submitted_at).getTime();
      const dueMs = next.elapsedMaxMin !== undefined ? startedMs + next.elapsedMaxMin * 60_000 : null;
      const sv = start.payload.values ?? {};
      const first = stagesList[0].fields;
      openChains.push({
        chainId: cid,
        title: def.id === "F7" ? `${sv.reference ?? "Request"}: ${sv.dish ?? ""}` : String(sv.item ?? "Batch"),
        detail: def.id === "F7" ? `${optionLabel(first.find((f) => f.key === "severity") ?? first[0], sv.severity)}. Avoid ${sv.allergens ?? ""}` : `Started ${formatLocalTime(start.submitted_at, timeZone)} at ${sv.start_temp_c ?? ""}°C`,
        startedAt: formatLocalTime(start.submitted_at, timeZone),
        startedMs,
        nextStage: next.key,
        nextStageLabel: next.label,
        dueNote: dueMs ? `${next.label} due by ${formatLocalTime(new Date(dueMs), timeZone)}` : null,
        overdue: dueMs !== null && now.getTime() > dueMs,
      });
    }
    openChains.sort((a, b) => a.startedMs - b.startedMs);
  }

  let cosigners: { id: string; name: string }[] = [];
  if (def.cosign) {
    const { data: people, error: cErr } = await admin
      .from("app_users")
      .select("id, name")
      .eq("venue_id", venueId)
      .is("deactivated_at", null)
      .not("pin_hash", "is", null)
      .neq("id", staffId)
      .order("name");
    logQueryError("form page cosigners", cErr);
    cosigners = (people ?? []).map((p) => ({ id: p.id, name: p.name }));
  }

  const doneNote =
    !def.event && records.length > 0
      ? def.cadence === "shift" || def.cadence === "daily"
        ? "Done for today. You can correct the latest record or save another one."
        : "Done for this period. You can correct the latest record or save another one."
      : null;

  return {
    degraded: !!(pErr || sErr || rErr || lErr || capped),
    timeZone,
    stage,
    fields,
    failRules: failFor(def, stage),
    records,
    registerRows,
    openChains,
    cosigners,
    doneNote,
  };
}
