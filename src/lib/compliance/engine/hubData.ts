import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logQueryError } from "@/lib/supabase/logQueryError";
import { venueTimeZone } from "../b2";
import { loadB2Overview } from "../b2Data";
import { FORMS, getGenericForm } from "./forms";
import { activatedAt, canOpenForm, isFormOn, type ActivationRow, type Who } from "./activation";
import { formStatus, type FormStatus } from "./due";
import type { ActivationContext, FormDef } from "./types";
import { CADENCE_ORDER } from "./types";

// Loads what the staff hub, the owner overview and the form pages need, through the CALLER's client so
// RLS decides what each person can see. The only admin client read is the wizard flag for food service
// level (scoped by the signed in staff member's own venue). `now` is a parameter so logic is testable.

type Client = SupabaseClient<Database>;

export type HubForm = {
  def: FormDef;
  on: boolean;
  canFill: boolean;
  status: FormStatus;
  /** Open flags for forms with a current state (latest record failing). */
  openFlags: number;
  /** Fails in the last 7 days for event forms. */
  recentFails: number;
  /** Event forms with chains: how many are waiting for the next step. */
  openChains: number;
};

export type HubData = {
  degraded: boolean;
  timeZone: string;
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
): Promise<{ ctx: ActivationContext; state: string | null; settingsCreatedAt: string | null; degraded: boolean }> {
  const [{ data: settings, error: sErr }, { data: profile, error: pErr }, { data: wiz, error: wErr }] = await Promise.all([
    supabase.from("venue_compliance_settings").select("high_risk_activities, offers_accommodation, trade_waste_agreement, created_at").eq("venue_id", venueId).maybeSingle(),
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
  };
  return { ctx, state: profile?.state ?? null, settingsCreatedAt: settings?.created_at ?? null, degraded: !!(sErr || pErr || wErr) };
}

export async function loadActivationRows(supabase: Client, venueId: string): Promise<{ rows: Map<string, ActivationRow>; degraded: boolean }> {
  const { data, error } = await supabase.from("venue_compliance_forms").select("form_id, enabled, enabled_at").eq("venue_id", venueId);
  logQueryError("hub activation rows", error);
  const rows = new Map<string, ActivationRow>();
  for (const r of data ?? []) rows.set(r.form_id, r);
  return { rows, degraded: !!error };
}

type MinRecord = { form_id: string; submitted_at: string; out_of_range: boolean; payload: { stage?: string; chain_id?: string } };

export async function loadHub(supabase: Client, admin: Client, venueId: string, who: Who, now: Date = new Date()): Promise<HubData> {
  const [{ ctx, state, settingsCreatedAt, degraded: ctxDegraded }, { rows, degraded: rowsDegraded }, b2] = await Promise.all([
    loadActivationContext(supabase, admin, venueId),
    loadActivationRows(supabase, venueId),
    loadB2Overview(supabase, venueId, now),
  ]);
  const timeZone = venueTimeZone(state);

  const since = new Date(now.getTime() - 800 * 24 * 3600 * 1000).toISOString();
  const { data: recs, error: recErr } = await supabase
    .from("compliance_form_submissions")
    .select("form_id, submitted_at, out_of_range, payload")
    .eq("venue_id", venueId)
    .neq("form_id", "B2")
    .gte("submitted_at", since)
    .order("submitted_at", { ascending: false })
    .limit(5000);
  logQueryError("hub records", recErr);
  const { data: latest, error: latestErr } = await supabase
    .from("compliance_latest_by_subject")
    .select("form_id, out_of_range")
    .eq("venue_id", venueId)
    .eq("out_of_range", true);
  logQueryError("hub latest by subject", latestErr);

  const byForm = new Map<string, MinRecord[]>();
  for (const r of (recs ?? []) as unknown as MinRecord[]) {
    const list = byForm.get(r.form_id) ?? [];
    list.push(r);
    byForm.set(r.form_id, list);
  }
  const flagCount = new Map<string, number>();
  for (const l of latest ?? []) flagCount.set(l.form_id as string, (flagCount.get(l.form_id as string) ?? 0) + 1);
  const weekAgo = now.getTime() - 7 * 24 * 3600 * 1000;

  const forms: HubForm[] = FORMS.map((def) => {
    const row = rows.get(def.id);
    const list = byForm.get(def.id) ?? [];
    const status = formStatus({
      cadence: def.cadence,
      now,
      timeZone,
      recordTimes: list.map((r) => r.submitted_at),
      activatedAt: activatedAt(row, settingsCreatedAt),
      dueAfterHour: def.dueAfterHour,
    });
    // chains still waiting for their next step (two stage cooling, allergen ticket)
    let openChains = 0;
    if (def.stages && def.stages.length > 1) {
      const lastStage = def.stages[def.stages.length - 1].key;
      const chains = new Map<string, Set<string>>();
      for (const r of list) {
        const cid = r.payload?.chain_id;
        if (!cid || !r.payload?.stage) continue;
        if (now.getTime() - new Date(r.submitted_at).getTime() > 3 * 24 * 3600 * 1000) continue;
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
      recentFails: def.event ? list.filter((r) => r.out_of_range && new Date(r.submitted_at).getTime() >= weekAgo).length : 0,
      openChains,
    };
  });

  const b2Row = rows.get("B2");
  return {
    degraded: !!(ctxDegraded || rowsDegraded || recErr || latestErr || b2.degraded),
    timeZone,
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
export function groupHubByCadence(forms: HubForm[]): { cadence: (typeof CADENCE_ORDER)[number]; forms: HubForm[] }[] {
  const weight = (f: HubForm) => (f.status.status === "overdue" ? 0 : f.status.status === "not_started" ? 1 : f.status.status === "event" ? 2 : 3);
  return CADENCE_ORDER.map((cadence) => ({
    cadence,
    forms: forms.filter((f) => f.def.cadence === cadence).sort((a, b) => weight(a) - weight(b) || a.def.title.localeCompare(b.def.title)),
  })).filter((g) => g.forms.length > 0);
}

export { getGenericForm };
