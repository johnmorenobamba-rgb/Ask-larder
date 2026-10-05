import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";
import { HIGH_RISK_ACTIVITIES, TRADE_WASTE_OPTIONS, UNIT_TYPES, VENUE_TYPES } from "@/lib/onboarding/constants";

const VALID_ACTIVITIES: Set<string> = new Set(HIGH_RISK_ACTIVITIES.map((a) => a.value));
const VALID_TRADE_WASTE: Set<string> = new Set(TRADE_WASTE_OPTIONS.map((o) => o.value));
const VALID_VENUE_TYPES: Set<string> = new Set(VENUE_TYPES.map((o) => o.value));

const MAX_UNITS = 60;
const MAX_NAME_LENGTH = 80;
// Plausibility bounds for a food safety limit in degrees C. Wide enough for
// any real freezer or hot hold, tight enough to catch a typo like 500.
const MIN_LIMIT_C = -60;
const MAX_LIMIT_C = 150;

// Compliance Forms Stage 0a: refrigeration units with their safe range, plus
// the three compliance settings. Writes straight to the real tables (Q2 §1).
// Units are never deleted, only retired with is_active = false, so past
// temperature readings keep a stable unit to point at.
//
// The writes are not one transaction. Every response therefore reports the
// ids of units that did save (`saved`, keyed by the client's own row index),
// so the form can adopt them and a retry after a partial failure updates
// those rows instead of inserting duplicates.
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
  // Venue type is optional here: when it is absent the stored value is left exactly as it is (an older client, or a venue that has not chosen).
  const venueType = typeof body?.venueType === "string" && body.venueType !== "" ? body.venueType : null;

  if (!VALID_TRADE_WASTE.has(tradeWaste)) {
    return NextResponse.json({ error: "Choose a Trade Waste Agreement status." }, { status: 400 });
  }
  if (venueType !== null && !VALID_VENUE_TYPES.has(venueType)) {
    return NextResponse.json({ error: "Choose a venue type from the list." }, { status: 400 });
  }
  if (activities.some((a) => !VALID_ACTIVITIES.has(a))) {
    return NextResponse.json({ error: "One of the high risk activities isn't recognised." }, { status: 400 });
  }
  if (rawUnits.length > MAX_UNITS) {
    return NextResponse.json({ error: `A venue can have at most ${MAX_UNITS} units.` }, { status: 400 });
  }

  const supabase = await createClient();
  const venueId = staff.venue_id;

  // Stations a unit may link to: this venue's own only.
  const { data: venueStations } = await supabase.from("stations").select("id").eq("venue_id", venueId);
  const stationIds = new Set((venueStations ?? []).map((s) => s.id));

  type CleanUnit =
    | { kind: "retire"; clientIndex: number; id: string }
    | {
        kind: "write";
        clientIndex: number;
        id: string | null;
        fields: {
          name: string;
          unit_type: string;
          min_temp_c: number | null;
          max_temp_c: number | null;
          station_id: string | null;
          is_active: boolean;
        };
      };

  const units: CleanUnit[] = [];
  for (let i = 0; i < rawUnits.length; i++) {
    const raw = rawUnits[i];
    if (typeof raw !== "object" || raw === null) {
      return NextResponse.json({ error: "A unit in the request was not readable." }, { status: 400 });
    }
    const u = raw as Record<string, unknown>;
    const clientIndex = typeof u.clientIndex === "number" ? u.clientIndex : i;
    const id = typeof u.id === "string" && u.id ? u.id : null;

    // A retired unit that already exists only ever needs its flag flipped.
    // It is exempt from name and limit validation, matching the form.
    if (id && u.isActive === false) {
      units.push({ kind: "retire", clientIndex, id });
      continue;
    }

    const name = typeof u.name === "string" ? u.name.trim() : "";
    const type = UNIT_TYPES.find((t) => t.value === u.unitType);
    if (!name) return NextResponse.json({ error: "Every unit needs a name." }, { status: 400 });
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Keep the name of ${name.slice(0, 20)} under ${MAX_NAME_LENGTH} characters.` }, { status: 400 });
    }
    if (!type) return NextResponse.json({ error: `Choose a type for ${name}.` }, { status: 400 });

    const limitRaw = u.limitTempC;
    const limit =
      typeof limitRaw === "number" ? limitRaw : typeof limitRaw === "string" && limitRaw.trim() !== "" ? Number(limitRaw) : NaN;
    if (!Number.isFinite(limit) || limit < MIN_LIMIT_C || limit > MAX_LIMIT_C) {
      return NextResponse.json(
        { error: `Enter a safe temperature limit for ${name} between ${MIN_LIMIT_C} and ${MAX_LIMIT_C} degrees.` },
        { status: 400 },
      );
    }

    const stationId = typeof u.stationId === "string" && u.stationId ? u.stationId : null;
    if (stationId && !stationIds.has(stationId)) {
      return NextResponse.json({ error: `The station chosen for ${name} isn't one of this venue's stations.` }, { status: 400 });
    }

    units.push({
      kind: "write",
      clientIndex,
      id,
      fields: {
        name,
        unit_type: type.value,
        min_temp_c: type.limit === "min" ? limit : null,
        max_temp_c: type.limit === "max" ? limit : null,
        station_id: stationId,
        is_active: u.isActive !== false,
      },
    });
  }

  const now = new Date().toISOString();
  const saved: { index: number; id: string }[] = [];

  const { error: settingsError } = await supabase.from("venue_compliance_settings").upsert(
    {
      venue_id: venueId,
      high_risk_activities: activities,
      offers_accommodation: offersAccommodation,
      trade_waste_agreement: tradeWaste,
      ...(venueType !== null ? { venue_type: venueType } : {}),
      updated_at: now,
    },
    { onConflict: "venue_id" },
  );
  if (settingsError) {
    console.error(`[compliance-setup] settings upsert failed for ${venueId}`, settingsError);
    return NextResponse.json({ error: "Couldn't save the compliance settings. Try again.", saved }, { status: 500 });
  }

  for (const unit of units) {
    if (unit.kind === "retire") {
      const { data, error } = await supabase
        .from("venue_refrigeration_units")
        .update({ is_active: false, updated_at: now })
        .eq("id", unit.id)
        .eq("venue_id", venueId)
        .select("id");
      if (error) {
        console.error(`[compliance-setup] retire failed for ${venueId}`, error);
        return NextResponse.json({ error: "Couldn't retire a unit. Try again.", saved }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: "A unit on this page no longer exists. Reload the page and try again.", saved }, { status: 409 });
      }
      saved.push({ index: unit.clientIndex, id: unit.id });
      continue;
    }

    if (unit.id) {
      const { data, error } = await supabase
        .from("venue_refrigeration_units")
        .update({ ...unit.fields, updated_at: now })
        .eq("id", unit.id)
        .eq("venue_id", venueId)
        .select("id");
      if (error) {
        console.error(`[compliance-setup] unit update failed for ${venueId}`, error);
        return NextResponse.json({ error: `Couldn't save ${unit.fields.name}. Try again.`, saved }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: `${unit.fields.name} no longer exists. Reload the page and try again.`, saved },
          { status: 409 },
        );
      }
      saved.push({ index: unit.clientIndex, id: unit.id });
    } else {
      const { data, error } = await supabase
        .from("venue_refrigeration_units")
        .insert({ ...unit.fields, venue_id: venueId })
        .select("id")
        .single();
      if (error || !data) {
        console.error(`[compliance-setup] unit insert failed for ${venueId}`, error);
        return NextResponse.json({ error: `Couldn't save ${unit.fields.name}. Try again.`, saved }, { status: 500 });
      }
      saved.push({ index: unit.clientIndex, id: data.id });
    }
  }

  const flags = await upsertWizardSession(supabase, venueId, { currentStep: "compliance-setup" });
  return NextResponse.json({ ok: true, flags, saved });
}
