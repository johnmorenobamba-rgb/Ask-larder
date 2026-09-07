import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";

const VALID_STATUSES = new Set(["none", "byo_unlicensed", "limited", "full", "unconfirmed"]);

// Q2 Page 3 — LIC0 root licensing gate. This is the one column this page
// owns on venue_licence_profile. A minimal row must exist for every venue
// (licensed or not) so "no data yet" is never confused with "confirmed
// unlicensed" — the upsert here always writes an explicit value.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const licenceStatus = typeof body?.licenceStatus === "string" ? body.licenceStatus : "";
  if (!VALID_STATUSES.has(licenceStatus)) {
    return NextResponse.json({ error: "Choose one of the listed licence statuses." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("venue_licence_profile")
    .upsert({ venue_id: staff.venue_id, licence_status: licenceStatus }, { onConflict: "venue_id" });

  if (error) {
    console.error("licence-status upsert unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  // 'unconfirmed' behaves like "not licensed" for wizard routing purposes
  // (licence-detail/crowd-control/rsa/promotions stay hidden until this is
  // actually resolved) but additionally flags for founder review, since a
  // genuinely unresolved answer shouldn't be silently treated the same as a
  // deliberately-confirmed no-licence venue.
  const licensed = licenceStatus === "limited" || licenceStatus === "full";

  const flags = await upsertWizardSession(supabase, staff.venue_id, {
    currentStep: "licensing",
    flags: { licensed },
    escalation: { key: "licence_status_unconfirmed", present: licenceStatus === "unconfirmed" },
  });

  return NextResponse.json({ ok: true, flags });
}
