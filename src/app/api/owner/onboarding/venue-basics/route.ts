import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";
import { AU_STATES } from "@/lib/onboarding/constants";

const STATE_CODES: Set<string> = new Set(AU_STATES.map((s) => s.code));

// Q2 Page 2 — venue basics. Upserts venue_licence_profile (state, address,
// abn, legal_name) and optionally confirms/updates venues.name (trading
// name). licence_status is deliberately left untouched here — Page 3 (LIC0)
// owns that column exclusively (Q2 §3's "design resolution" note).
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const state = typeof body?.state === "string" ? body.state : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  const abn = typeof body?.abn === "string" ? body.abn.trim() : "";
  const legalName = typeof body?.legalName === "string" ? body.legalName.trim() : "";
  const tradingName = typeof body?.tradingName === "string" ? body.tradingName.trim() : "";

  if (!STATE_CODES.has(state)) {
    return NextResponse.json({ error: "Choose a valid state or territory." }, { status: 400 });
  }
  if (!address) {
    return NextResponse.json({ error: "Street address is required." }, { status: 400 });
  }
  if (!/^\d{11}$/.test(abn.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "ABN must be 11 digits." }, { status: 400 });
  }

  const supabase = await createClient();

  if (tradingName) {
    await supabase.from("venues").update({ name: tradingName }).eq("id", staff.venue_id);
  }

  const { error } = await supabase.from("venue_licence_profile").upsert(
    {
      venue_id: staff.venue_id,
      state,
      address,
      abn: abn.replace(/\s/g, ""),
      legal_name: legalName || null,
    },
    { onConflict: "venue_id" },
  );

  if (error) {
    console.error("venue-basics upsert unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  const flags = await upsertWizardSession(supabase, staff.venue_id, {
    currentStep: "venue-basics",
    escalation: { key: "non_vic_state", present: state !== "VIC" },
  });

  return NextResponse.json({ ok: true, flags });
}
