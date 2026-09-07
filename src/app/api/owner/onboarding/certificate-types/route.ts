import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";

// Q2 Page 13 — certificate types setup. Adds any remaining certificate
// types not already auto-created on Pages 6a/7a/7b (RSA, Food Handling,
// Food Safety Supervisor) — typically WWCC and First Aid. WWCC naming is
// state-specific (Q1 catalog row 41); CertificateTypesForm resolves the
// actual name client-side (Victoria's confirmed label, or the owner's own
// freetext for every other state) before it ever reaches this route, so
// this route just writes whatever name it's given, find-or-create by name.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Certificate type name is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("certificate_types")
    .select("id")
    .eq("venue_id", staff.venue_id)
    .eq("name", name)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("certificate_types").insert({ venue_id: staff.venue_id, name });
    if (error) {
      console.error("certificate-types insert unexpected error:", error);
      return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
    }
  }

  const flags = await upsertWizardSession(supabase, staff.venue_id, { currentStep: "certificate-types" });
  return NextResponse.json({ ok: true, flags });
}
