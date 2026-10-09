import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logQueryError } from "@/lib/supabase/logQueryError";
import { formatLocalDateTime, formatTemp, venueTimeZone } from "../b2";
import { FORMS, FORM_BY_ID } from "./forms";
import { headlineOf } from "./formPageData";
import { FORM_TAG_LABELS, type FieldDef } from "./types";
import { localMidnightInstant } from "./due";

// Owner side record queries: filters, descriptions and CSV. Everything runs through the CALLER's
// client, so RLS decides what a person can see (manager tier and owners see all of the venue).

type Client = SupabaseClient<Database>;

export type RecordFilters = {
  formId: string | null;
  from: string | null; // local date yyyy-mm-dd
  to: string | null; // local date yyyy-mm-dd, inclusive
  result: "all" | "fail" | "pass";
};

export type OwnerRecord = {
  id: string;
  formId: string;
  formTitle: string;
  at: string;
  atIso: string;
  by: string;
  failed: boolean;
  headline: string;
  reasons: string[];
  note: string | null;
  cosigned: string | null;
  stage: string | null;
  comment: string | null;
  corrects: boolean;
};

export const B2_TITLE = "Temperature log";

export function parseFilters(sp: Record<string, string | string[] | undefined>): RecordFilters {
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);
  const date = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const form = one(sp.form);
  const result = one(sp.result);
  return {
    formId: form && (form === "B2" || FORM_BY_ID[form]) ? form : null,
    from: date(one(sp.from)),
    to: date(one(sp.to)),
    result: result === "fail" || result === "pass" ? result : "all",
  };
}

/** Start and end instants for a local date range in the venue time zone (end is exclusive). */
export function rangeInstants(filters: RecordFilters, timeZone: string): { from: string | null; to: string | null } {
  return {
    from: filters.from ? localMidnightInstant(filters.from, timeZone, 0) : null,
    to: filters.to ? localMidnightInstant(filters.to, timeZone, 1) : null,
  };
}

function allFieldsOf(formId: string): FieldDef[] {
  const def = FORM_BY_ID[formId];
  if (!def) return [];
  return def.stages ? def.stages.flatMap((s) => s.fields) : def.fields;
}

type Row = {
  id: string;
  form_id: string;
  submitted_at: string;
  submitted_by_name: string;
  out_of_range: boolean;
  corrective_action: string | null;
  corrects_submission_id: string | null;
  payload: Record<string, unknown>;
};

export function describe(row: Row, timeZone: string): OwnerRecord {
  const p = row.payload as {
    unit_name?: string;
    reading_c?: number;
    values?: Record<string, unknown>;
    fail_reasons?: string[];
    stage?: string;
    comment?: string;
    cosigned_by_name?: string;
    labels?: Record<string, string>;
  };
  const isB2 = row.form_id === "B2";
  const def = FORM_BY_ID[row.form_id];
  const headline = isB2
    ? `${p.unit_name ?? "Unit"}: ${typeof p.reading_c === "number" ? formatTemp(p.reading_c) : "no reading"}`
    : headlineOf(allFieldsOf(row.form_id), row.payload as never);
  const failedItems = Object.entries(p.values ?? {}).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.entries(v as Record<string, string>)
          .filter(([, r]) => r === "fail")
          .map(([ik]) => p.labels?.[`${k}.${ik}`] ?? ik)
      : [],
  );
  return {
    id: row.id,
    formId: row.form_id,
    formTitle: isB2 ? B2_TITLE : (def?.title ?? row.form_id),
    at: formatLocalDateTime(row.submitted_at, timeZone),
    atIso: row.submitted_at,
    by: row.submitted_by_name,
    failed: row.out_of_range,
    headline: failedItems.length ? `${headline}. Failed: ${failedItems.join(", ")}` : headline,
    reasons: isB2 ? (row.out_of_range ? ["Out of range"] : []) : (p.fail_reasons ?? []),
    note: row.corrective_action,
    cosigned: p.cosigned_by_name ?? null,
    stage: p.stage ? (def?.stages?.find((s) => s.key === p.stage)?.label ?? p.stage) : null,
    comment: p.comment ?? null,
    corrects: !!row.corrects_submission_id,
  };
}

export async function queryRecords(
  supabase: Client,
  venueId: string,
  filters: RecordFilters,
  limit = 500,
): Promise<{ records: OwnerRecord[]; timeZone: string; degraded: boolean; truncated: boolean; venueName: string }> {
  const [{ data: profile }, { data: venue }] = await Promise.all([
    supabase.from("venue_licence_profile").select("state").eq("venue_id", venueId).maybeSingle(),
    supabase.from("venues").select("name").eq("id", venueId).maybeSingle(),
  ]);
  const timeZone = venueTimeZone(profile?.state);
  const range = rangeInstants(filters, timeZone);
  // Pages of 1000 (the API's own row cap), up to limit + 1 rows, so a bigger limit is real and truncation is detected.
  const PAGE = 1000;
  const rows: Row[] = [];
  let error: { message: string } | null = null;
  for (let from = 0; rows.length < limit + 1; from += PAGE) {
    let q = supabase
      .from("compliance_form_submissions")
      .select("id, form_id, submitted_at, submitted_by_name, out_of_range, corrective_action, corrects_submission_id, payload")
      .eq("venue_id", venueId)
      .order("submitted_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (filters.formId) q = q.eq("form_id", filters.formId);
    if (range.from) q = q.gte("submitted_at", range.from);
    if (range.to) q = q.lt("submitted_at", range.to);
    if (filters.result === "fail") q = q.eq("out_of_range", true);
    if (filters.result === "pass") q = q.eq("out_of_range", false);
    const { data, error: e } = await q;
    if (e) {
      error = e;
      break;
    }
    rows.push(...((data ?? []) as unknown as Row[]));
    if ((data ?? []).length < PAGE) break;
  }
  logQueryError("owner records", error as never);
  return {
    records: rows.slice(0, limit).map((r) => describe(r, timeZone)),
    timeZone,
    degraded: !!error,
    truncated: rows.length > limit,
    venueName: venue?.name ?? "Venue",
  };
}

/** A cell that a spreadsheet could run as a formula is prefixed so it stays text. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+@\t\r-]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = ["Form", "Form id", "Recorded at", "Recorded by", "Step", "Result", "Details", "What failed", "Corrective action", "Second signature", "Corrects an earlier record", "Comment"];

export function recordsToCsv(records: OwnerRecord[], truncated = false): string {
  const lines = [CSV_HEADER.map(csvCell).join(",")];
  for (const r of records) {
    lines.push(
      [r.formTitle, r.formId, r.at, r.by, r.stage ?? "", r.failed ? "Fail" : "Pass", r.headline, r.reasons.join("; "), r.note ?? "", r.cosigned ?? "", r.corrects ? "Yes" : "", r.comment ?? ""]
        .map(csvCell)
        .join(","),
    );
  }
  if (truncated) lines.push(csvCell("NOTE: only the newest records are included. Narrow the dates and download again to get older records."));
  return lines.join("\r\n") + "\r\n";
}

export function tagLabel(formId: string): string {
  if (formId === "B2") return "Recommended record";
  const def = FORM_BY_ID[formId];
  return def ? FORM_TAG_LABELS[def.tag] : "";
}

export const FORM_OPTIONS = [{ id: "B2", title: B2_TITLE }, ...FORMS.map((f) => ({ id: f.id, title: f.title }))];
