import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";
import { HIGH_RISK_ACTIVITIES, TRADE_WASTE_OPTIONS, UNIT_TYPES } from "@/lib/onboarding/constants";

const VALID_ACTIVITIES: Set<string> = new Set(HIGH_RISK_ACTIVITIES.map((a) => a.value));
const VALID_TRADE_WASTE: Set<string> = new Set(TRADE_WASTE_OPTIONS.map((o) => o.value));

// Compliance Forms Stage 0a: refrigeration units with their safe range, plus
// the three compliance settings. Writes straight to the real tables (Q2 §1).
// Units are never deleted, only retired with is_active = false, so past
// temperature readings keep a stable unit to point at.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rawUnits: unknown[] = Array.isArray(body?.units) ? body.units : [];
  const activities: string[] = Array.isArray(body?.highRiskActivities)
    ? body.highRiskActivities.filter((a: unknown): a is string => typeof a === "string")
    : [];
  const offersAccommodation = body?.offersAccommodation === true;
  const tradeWaste = typeof body?.tradeWasteAgreement === "string" ? body.tradeWasteAgreement : "";

  if (!VALID_TRADE_WASTE.has(tradeWaste)) {
    return NextResponse.json({ error: "Choose a Trade Waste Agreement status." }, { status: 400 });
  }
  if (activities.some((a) => !VALID_ACTIVITIES.has(a))) {
    return NextResponse.json({ error: "One of the high risk activities isn't recognised." }, { status: 400 });
  }

  type CleanUnit = {
    id: string | null;
    name: string;
    unit_type: string;
    min_temp_c: number | null;
    max_temp_c: number | null;
    station_id: string | null;
    is_active: boolean;
  };
  const units: CleanUnit[] = [];
  for (const raw of rawUnits) {
    const u = raw as Record<string, unknown>;
    const name = typeof u.name === "string" ? u.name.trim() : "";
    const type = UNIT_TYPES.find((t) => t.value === u.unitType);
    if (!name) return NextResponse.json({ error: "Every unit needs a name." }, { status: 400 });
    if (!type) return NextResponse.json({ error: `Choose a type for ${name}.` }, { status: 400 });
    const limit = Number(u.limitTempC);
    if (u.limitTempC === "" || u.limitTempC === null || u.limitTempC === undefined || !Number.isFinite(limit)) {
      return NextResponse.json({ error: `Enter the safe temperature limit for ${name}.` }, { status: 400 });
    }
    units.push({
      id: typeof u.id === "string" && u.id ? u.id : null,
      name,
      unit_type: type.value,
      min_temp_c: type.limit === "min" ? limit : null,
      max_temp_c: type.limit === "max" ? limit : null,
      station_id: typeof u.stationId === "string" && u.stationId ? u.stationId : null,
      is_active: u.isActive !== false,
    });
  }

  const supabase = await createClient();
  const venueId = staff.venue_id;
  const now = new Date().toISOString();

  const { error: settingsError } = await supabase.from("venue_compliance_settings").upsert(
    {
      venue_id: venueId,
      high_risk_activities: activities,
      offers_accommodation: offersAccommodation,
      trade_waste_agreement: tradeWaste,
      updated_at: now,
    },
    { onConflict: "venue_id" },
  );
  if (settingsError) {
    console.error(`[compliance-setup] settings upsert failed for ${venueId}`, settingsError);
    return NextResponse.json({ error: "Couldn't save the compliance settings. Try again." }, { status: 500 });
  }

  for (const unit of units) {
    const { id, ...fields } = unit;
    const result = id
      ? await supabase.from("venue_refrigeration_units").update({ ...fields, updated_at: now }).eq("id", id).eq("venue_id", venueId)
      : await supabase.from("venue_refrigeration_units").insert({ ...fields, venue_id: venueId });
    if (result.error) {
      console.error(`[compliance-setup] unit write failed for ${venueId}`, result.error);
      return NextResponse.json({ error: `Couldn't save ${unit.name}. Try again.` }, { status: 500 });
    }
  }

  const flags = await upsertWizardSession(supabase, venueId, { currentStep: "compliance-setup" });
  return NextResponse.json({ ok: true, flags });
}
