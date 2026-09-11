import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";
import { DAYS_OF_WEEK, LICENCE_TYPES } from "@/lib/onboarding/constants";

const VALID_TYPES: Set<string> = new Set(LICENCE_TYPES.map((t) => t.value));
const VALID_DAYS: Set<string> = new Set(DAYS_OF_WEEK.map((d) => d.value));

type TradingHoursDay = { closed: boolean; open?: string; close?: string };

// Q2 Page 4 — licence detail (licensed-only). Gaming/EGM never gets a
// schema write of any kind (Q1 Part C) — it only ever sets a
// founder_escalation flag. licence_type = 'other_unsure' does the same.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const licenceType = typeof body?.licenceType === "string" ? body.licenceType : "";
  const licenceNumber = typeof body?.licenceNumber === "string" ? body.licenceNumber.trim() : "";
  const licensedCapacity = Number(body?.licensedCapacity);
  const lateNightEndorsement = Boolean(body?.lateNightEndorsement);
  const conditions = typeof body?.conditions === "string" ? body.conditions.trim() : "";
  const gamingEgm = body?.gamingEgm === true;
  const sourcedFromDocument = body?.sourcedFromDocument === true;
  const tradingHours = body?.tradingHours && typeof body.tradingHours === "object" ? body.tradingHours : {};

  if (!VALID_TYPES.has(licenceType)) {
    return NextResponse.json({ error: "Choose a licence type." }, { status: 400 });
  }
  if (!licenceNumber) {
    return NextResponse.json({ error: "Licence number is required." }, { status: 400 });
  }
  if (!Number.isInteger(licensedCapacity) || licensedCapacity <= 0) {
    return NextResponse.json({ error: "Licensed capacity must be a positive whole number." }, { status: 400 });
  }

  const TIME_RE = /^\d{2}:\d{2}$/;
  const cleanHours: Record<string, TradingHoursDay> = {};
  for (const [day, val] of Object.entries(tradingHours as Record<string, unknown>)) {
    if (!VALID_DAYS.has(day) || typeof val !== "object" || val === null) continue;
    const v = val as { closed?: boolean; open?: string; close?: string };
    if (v.closed) {
      cleanHours[day] = { closed: true };
    } else if (typeof v.open === "string" && typeof v.close === "string" && TIME_RE.test(v.open) && TIME_RE.test(v.close)) {
      // Deliberately no v.open < v.close ordering check: a hospitality
      // venue trading past midnight (e.g. 17:00-01:00) is the common case,
      // not the exception, and "close" here means "closes the following
      // morning" whenever it's numerically earlier than "open" -- this was
      // previously rejected outright by a same-day string comparison,
      // silently dropping every late-trading day's hours (confirmed live:
      // Q6/Q7's Wed-Sat 17:00-close nights all failed this check and only
      // the venue's closed days ever made it into approved_trading_hours).
      cleanHours[day] = { closed: false, open: v.open, close: v.close };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("venue_licence_profile").upsert(
    {
      venue_id: staff.venue_id,
      licence_type: licenceType,
      licence_number: licenceNumber,
      licensed_capacity: licensedCapacity,
      approved_trading_hours: cleanHours,
      late_night_endorsement: lateNightEndorsement,
      conditions: conditions || null,
    },
    { onConflict: "venue_id" },
  );

  if (error) {
    console.error("licence-detail upsert unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from("wizard_sessions")
    .select("venue_type_flags")
    .eq("venue_id", staff.venue_id)
    .maybeSingle();
  const priorEscalations = new Set(
    (((existing?.venue_type_flags as { founder_escalation?: string[] } | null)?.founder_escalation) ?? []) as string[],
  );
  gamingEgm ? priorEscalations.add("gaming_egm") : priorEscalations.delete("gaming_egm");
  licenceType === "other_unsure" ? priorEscalations.add("licence_type_other_unsure") : priorEscalations.delete("licence_type_other_unsure");

  const flags = await upsertWizardSession(supabase, staff.venue_id, {
    currentStep: "licence-detail",
    flags: { founder_escalation: Array.from(priorEscalations), capacity_sourced_from_document: sourcedFromDocument },
  });

  return NextResponse.json({ ok: true, flags });
}
