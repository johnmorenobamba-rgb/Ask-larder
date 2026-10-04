import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logQueryError } from "@/lib/supabase/logQueryError";
import {
  buildUnitStatuses,
  localDateKey,
  summarise,
  venueTimeZone,
  type LatestReading,
  type UnitLike,
  type UnitStatus,
} from "./b2";

// Loads everything the staff temperature page, the home tile, the owner cell
// and the owner page need, through the CALLER's client so RLS decides what they
// can see (a BOH staff member sees the B2 rows of their venue, FOH sees none,
// manager tier and owner see all). `now` is a parameter so the logic is testable.

type Client = SupabaseClient<Database>;

export type TodayReading = {
  id: string;
  unitId: string;
  unitName: string;
  unitType: string;
  readingC: number | null;
  limitKind: string | null;
  limitC: number | null;
  outOfRange: boolean;
  correctiveAction: string | null;
  submittedAt: string;
  submittedByName: string;
  correctsSubmissionId: string | null;
  /** true only for the latest effective reading of its unit (the only one that may be corrected). */
  isLatestForUnit: boolean;
};

export type B2Overview = {
  /** true when a query failed: pages must show an error, never a clean "0 flags" */
  degraded: boolean;
  timeZone: string;
  statuses: UnitStatus[];
  summary: { total: number; doneToday: number; openFlags: number };
  todays: TodayReading[];
};

export async function loadB2Overview(supabase: Client, venueId: string, now: Date = new Date()): Promise<B2Overview> {
  const [{ data: profile, error: profileError }, { data: units, error: unitsError }, { data: latest, error: latestError }] =
    await Promise.all([
      supabase.from("venue_licence_profile").select("state").eq("venue_id", venueId).maybeSingle(),
      supabase
        .from("venue_refrigeration_units")
        .select("id, name, unit_type, min_temp_c, max_temp_c, station_id")
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .order("created_at"),
      supabase
        .from("compliance_b2_latest_readings")
        .select("id, unit_id, out_of_range, corrective_action, submitted_at, submitted_by_name, payload")
        .eq("venue_id", venueId),
    ]);
  logQueryError("b2 overview profile", profileError);
  logQueryError("b2 overview units", unitsError);
  logQueryError("b2 overview latest", latestError);

  const timeZone = venueTimeZone(profile?.state);
  const unitList: UnitLike[] = (units ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    unit_type: u.unit_type,
    min_temp_c: u.min_temp_c === null ? null : Number(u.min_temp_c),
    max_temp_c: u.max_temp_c === null ? null : Number(u.max_temp_c),
    station_id: u.station_id,
  }));
  const latestList: LatestReading[] = (latest ?? [])
    .filter((r) => r.id && r.unit_id && r.submitted_at)
    .map((r) => ({
      id: r.id as string,
      unit_id: r.unit_id as string,
      out_of_range: !!r.out_of_range,
      corrective_action: r.corrective_action,
      submitted_at: r.submitted_at as string,
      submitted_by_name: (r.submitted_by_name as string) ?? "",
      payload: (r.payload ?? {}) as LatestReading["payload"],
    }));

  const statuses = buildUnitStatuses(unitList, latestList, now, timeZone);
  const summary = summarise(statuses);

  // Today's readings (effective ones only): recent rows, drop any that a later row corrects.
  const since = new Date(now.getTime() - 40 * 60 * 60 * 1000).toISOString();
  const { data: rows, error: rowsError } = await supabase
    .from("compliance_form_submissions")
    .select("id, out_of_range, corrective_action, submitted_at, submitted_by_name, payload, corrects_submission_id")
    .eq("venue_id", venueId)
    .eq("form_id", "B2")
    .gte("submitted_at", since)
    .order("submitted_at", { ascending: false })
    .limit(400);
  logQueryError("b2 overview today", rowsError);

  const corrected = new Set((rows ?? []).map((r) => r.corrects_submission_id).filter((x): x is string => !!x));
  const latestIds = new Set(latestList.map((r) => r.id));
  const today = localDateKey(now, timeZone);
  const todays: TodayReading[] = (rows ?? [])
    .filter((r) => !corrected.has(r.id) && localDateKey(r.submitted_at, timeZone) === today)
    .map((r) => {
      const p = r.payload as { unit_id?: string; unit_name?: string; unit_type?: string; reading_c?: number; limit_kind?: string; limit_c?: number };
      return {
        id: r.id,
        unitId: p.unit_id ?? "",
        unitName: p.unit_name ?? "Unit",
        unitType: p.unit_type ?? "cold",
        readingC: typeof p.reading_c === "number" ? p.reading_c : null,
        limitKind: p.limit_kind ?? null,
        limitC: typeof p.limit_c === "number" ? p.limit_c : null,
        outOfRange: r.out_of_range,
        correctiveAction: r.corrective_action,
        submittedAt: r.submitted_at,
        submittedByName: r.submitted_by_name,
        correctsSubmissionId: r.corrects_submission_id,
        isLatestForUnit: latestIds.has(r.id),
      };
    });

  return { degraded: !!(unitsError || latestError || rowsError), timeZone, statuses, summary, todays };
}

/** staff_roles.department for the signed in staff member (RLS scopes this to their own venue). */
export async function getStaffDepartment(
  supabase: Client,
  staffRoleId: string | null,
): Promise<{ department: string | null; ok: boolean }> {
  if (!staffRoleId) return { department: null, ok: true };
  const { data, error } = await supabase.from("staff_roles").select("department").eq("id", staffRoleId).maybeSingle();
  logQueryError("b2 staff department", error);
  return { department: data?.department ?? null, ok: !error };
}
