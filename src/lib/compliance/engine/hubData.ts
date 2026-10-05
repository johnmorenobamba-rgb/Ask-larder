import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logQueryError } from "@/lib/supabase/logQueryError";
import { venueTimeZone } from "../b2";
import { loadB2Overview } from "../b2Data";
import { FORMS, getGenericForm } from "./forms";
import { activatedAt, canOpenForm, isFormOn, type ActivationRow, type Who } from "./activation";
import { formStatus, localMidnightInstant, previousPeriodStart, type FormStatus } from "./due";
import type { ActivationContext, Cadence, FormDef } from "./types";
import { CADENCE_ORDER } from "./types";

// Loads what the staff hub, the owner overview and the form pages need, through the CALLER's client so
// RLS decides what each person can see. The only admin client read is the wizard flag for food service
// level (scoped by the signed in staff member's own venue). `now` is a parameter so logic is testable.
//
// Records are fetched in separate windows per cadence (yesterday for daily forms, last week for weekly,
// last month, last year, 7 days for event forms) so a busy event form can never push a yearly record out
// of the result. If any window fills the API's row cap the hub is flagged degraded rather than guessing.

type Client = SupabaseClient<Database>;

export type HubForm = {
  def: FormDef;
  on: boolean;
  canFill: boolean;
  status: FormStatus;
  /** Open flags for forms with a current state (latest record failing). */
  openFlags: number;
  /** Effective fails in the last 7 days for event forms. */
  recentFails: number;
  /** Staged forms: how many chains are waiting for their next step. */
  openChains: number;
};

export type HubData = {
  degraded: boolean;
  timeZone: string;
  /** venue trading day cutoff hour (local), used by closing forms */
  cutoffHour: number;
  now: string;
  forms: HubForm[];
  b2: {
    on: boolean;
    canFill: boolean;
    total: number;
    doneToday: number;
    openFlags: number;
    degraded: boolean;
  };
  activationCtx: ActivationContext;
};

export async function loadActivationContext(
  supabase: Client,
  admin: Client,
  venueId: string,
): Promise<{ ctx: ActivationContext; state: string | null; settingsCreatedAt: string | null; cutoffHour: number; degraded: boolean }> {
  const [{ data: settings, error: sErr }, { data: profile, error: pErr }, { data: wiz, error: wErr }] = await Promise.all([
    supabase.from("venue_compliance_settings").select("high_risk_activities, offers_accommodation, trade_waste_agreement, created_at, trading_day_cutoff_hour, venue_type").eq("venue_id", venueId).maybeSingle(),
    supabase.from("venue_licence_profile").select("state, licence_type").eq("venue_id", venueId).maybeSingle(),
    admin.from("wizard_sessions").select("venue_type_flags").eq("venue_id", venueId).maybeSingle(),
  ]);
  logQueryError("hub settings", sErr);
  logQueryError("hub profile", pErr);
  logQueryError("hub wizard flags", wErr);
  const flags = (wiz?.venue_type_flags ?? {}) as { food_service_level?: string };
  const fsl = flags.food_service_level;
  const tw = settings?.trade_waste_agreement;
  const ctx: ActivationContext = {
    foodService: fsl === "full_kitchen" || fsl === "bar_snacks_low_risk" || fsl === "no_food_service" ? fsl : null,
    licenceType: profile?.licence_type ?? null,
    offersAccommodation: !!settings?.offers_accommodation,
    tradeWaste: tw === "yes" || tw === "no" ? tw : "unsure",
    highRiskActivities: settings?.high_risk_activities ?? [],
    venueType: settings?.venue_type === "cafe" || settings?.venue_type === "restaurant" || settings?.venue_type === "pub" || settings?.venue_type === "bar" || settings?.venue_type === "other" ? settings.venue_type : null,
  };
  const cutoffHour = typeof settings?.trading_day_cutoff_hour === "number" ? settings.trading_day_cutoff_hour : DEFAULT_CUTOFF_HOUR;
  return { ctx, state: profile?.state ?? null, settingsCreatedAt: settings?.created_at ?? null, cutoffHour, degraded: !!(sErr || pErr || wErr) };
}

export async function loadActivationRows(supabase: Client, venueId: string): Promise<{ rows: Map<string, ActivationRow>; degraded: boolean }> {
  const { data, error } = await supabase.from("venue_compliance_forms").select("form_id, enabled, enabled_at").eq("venue_id", venueId);
  logQueryError("hub activation rows", error);
  const rows = new Map<string, ActivationRow>();
  for (const r of data ?? []) rows.set(r.form_id, r);
  return { rows, degraded: !!error };
}

/** Default trading day cutoff (venue local): a closing record made before 5am belongs to the previous day. */
export const DEFAULT_CUTOFF_HOUR = 5;

type Rec = { id: string; form_id: string; submitted_at: string; out_of_range: boolean; corrects_submission_id: string | null; payload: { stage?: string; chain_id?: string } };

/** The API caps a response at 1000 rows; a window that returns this many may have been cut off. */
const WINDOW_CAP = 1000;
export const CHAIN_WINDOW_MS = 3 * 24 * 3600 * 1000;

export async function loadHub(supabase: Client, admin: Client, venueId: string, who: Who, now: Date = new Date()): Promise<HubData> {
  const [{ ctx, state, settingsCreatedAt, cutoffHour, degraded: ctxDegraded }, { rows, degraded: rowsDegraded }, b2] = await Promise.all([
    loadActivationContext(supabase, admin, venueId),
    loadActivationRows(supabase, venueId),
    loadB2Overview(supabase, venueId, now),
  ]);
  const timeZone = venueTimeZone(state);

  // one window per cadence: the start of the PREVIOUS period (event forms: the last 7 days)
  const windowStart = (c: Cadence): string => {
    if (c === "event") return new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    // shift and daily windows reach one more day back so a closing form made after midnight is always inside
    if (c === "shift" || c === "daily") return localMidnightInstant(previousPeriodStart(c, now, timeZone, cutoffHour), timeZone, -1);
    return localMidnightInstant(previousPeriodStart(c, now, timeZone), timeZone, 0);
  };
  const windows: { key: string; since: string; ids: string[] }[] = [];
  for (const c of CADENCE_ORDER) {
    const ids = FORMS.filter((f) => f.cadence === c).map((f) => f.id);
    if (ids.length === 0) continue;
    windows.push({ key: c, since: windowStart(c), ids });
  }

  let windowDegraded = false;
  const results = await Promise.all(
    windows.map(async (w) => {
      const { data, error } = await supabase
        .from("compliance_form_submissions")
        .select("id, form_id, submitted_at, out_of_range, corrects_submission_id, payload")
        .eq("venue_id", venueId)
        .in("form_id", w.ids)
        .gte("submitted_at", w.since)
        .order("submitted_at", { ascending: false })
        .limit(WINDOW_CAP);
      logQueryError(`hub records ${w.key}`, error);
      if (error || (data ?? []).length >= WINDOW_CAP) windowDegraded = true;
      return (data ?? []) as unknown as Rec[];
    }),
  );
  const byForm = new Map<string, Rec[]>();
  for (const list of results) for (const r of list) (byForm.get(r.form_id) ?? byForm.set(r.form_id, []).get(r.form_id)!).push(r);

  // latest effective row per subject: open flags, and the last time an event form was logged
  const { data: latest, error: latestErr } = await supabase
    .from("compliance_latest_by_subject")
    .select("form_id, out_of_range, submitted_at")
    .eq("venue_id", venueId)
    .limit(WINDOW_CAP);
  logQueryError("hub latest by subject", latestErr);
  if ((latest ?? []).length >= WINDOW_CAP) windowDegraded = true;
  const flagCount = new Map<string, number>();
  const lastLogged = new Map<string, string>();
  for (const l of latest ?? []) {
    const id = l.form_id as string;
    if (l.out_of_range) flagCount.set(id, (flagCount.get(id) ?? 0) + 1);
    const t = l.submitted_at as string;
    if (!lastLogged.has(id) || t > lastLogged.get(id)!) lastLogged.set(id, t);
  }
  const weekAgo = now.getTime() - 7 * 24 * 3600 * 1000;

  const forms: HubForm[] = FORMS.map((def) => {
    const row = rows.get(def.id);
    const list = byForm.get(def.id) ?? [];
    // a correction never makes a new period "done": the record it corrects already counts, at its own time
    const originals = list.filter((r) => !r.corrects_submission_id);
    const status = formStatus({
      cadence: def.cadence,
      now,
      timeZone,
      recordTimes: def.cadence === "event" ? (lastLogged.has(def.id) ? [lastLogged.get(def.id)!] : []) : originals.map((r) => r.submitted_at),
      activatedAt: activatedAt(row, settingsCreatedAt),
      dueAfterHour: def.dueAfterHour,
      cutoffHour: def.tradingDay ? cutoffHour : 0,
    });
    const corrected = new Set(list.map((r) => r.corrects_submission_id).filter((x): x is string => !!x));

    // staged forms: chains still waiting for their next step (within the chain window)
    let openChains = 0;
    if (def.stages && def.stages.length > 1) {
      const lastStage = def.stages[def.stages.length - 1].key;
      const chains = new Map<string, Set<string>>();
      for (const r of list) {
        const cid = r.payload?.chain_id;
        if (!cid || !r.payload?.stage) continue;
        if (now.getTime() - new Date(r.submitted_at).getTime() > CHAIN_WINDOW_MS) continue;
        (chains.get(cid) ?? chains.set(cid, new Set()).get(cid)!).add(r.payload.stage);
      }
      for (const stages of chains.values()) if (!stages.has(lastStage)) openChains += 1;
    }
    return {
      def,
      on: isFormOn(def, row, ctx),
      canFill: canOpenForm(def, who),
      status,
      openFlags: def.event ? 0 : (flagCount.get(def.id) ?? 0),
      recentFails: def.event ? list.filter((r) => r.out_of_range && !corrected.has(r.id) && new Date(r.submitted_at).getTime() >= weekAgo).length : 0,
      openChains,
    };
  });

  const b2Row = rows.get("B2");
  return {
    degraded: !!(ctxDegraded || rowsDegraded || windowDegraded || latestErr || b2.degraded),
    timeZone,
    cutoffHour,
    now: now.toISOString(),
    forms,
    b2: {
      on: b2Row ? b2Row.enabled : true,
      canFill: who.isManagerTier || who.department === "BOH",
      total: b2.summary.total,
      doneToday: b2.summary.doneToday,
      openFlags: b2.summary.openFlags,
      degraded: b2.degraded,
    },
    activationCtx: ctx,
  };
}

/** Hub ordering: by cadence, forms that are Overdue first inside each cadence. */
export function groupHubByCadence(forms: HubForm[]): { cadence: Cadence; forms: HubForm[] }[] {
  const weight = (f: HubForm) => (f.status.status === "overdue" ? 0 : f.status.status === "not_started" ? 1 : f.status.status === "event" ? 2 : 3);
  return CADENCE_ORDER.map((cadence) => ({
    cadence,
    forms: forms.filter((f) => f.def.cadence === cadence).sort((a, b) => weight(a) - weight(b) || a.def.title.localeCompare(b.def.title)),
  })).filter((g) => g.forms.length > 0);
}

export { getGenericForm };
