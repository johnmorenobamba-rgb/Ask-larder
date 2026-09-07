import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";
import { DEPARTMENTS, FALLBACK_TIERS } from "@/lib/onboarding/constants";

const VALID_DEPARTMENTS: Set<string> = new Set(DEPARTMENTS.map((d) => d.value));
const VALID_TIERS: Set<string> = new Set(FALLBACK_TIERS.map((t) => t.value));

// Q2 Page 11a — staff roles (name, department, fallback_tier) plus
// venues.roster_location, which is captured on this page even though its
// destination column lives on venues, not staff_roles (Q2 §3's deliberate
// placement choice — "where do staff check who's on shift" is thematically
// a staffing fact). fallback_tier defaults to frontline server-side too,
// never silently defaulting to authorized.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (typeof body?.rosterLocation === "string") {
    const supabase = await createClient();
    await supabase.from("venues").update({ roster_location: body.rosterLocation.trim() || null }).eq("id", staff.venue_id);
    if (!body?.name) {
      const flags = await upsertWizardSession(supabase, staff.venue_id, { currentStep: "staff-roles" });
      return NextResponse.json({ ok: true, flags });
    }
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const department = typeof body?.department === "string" ? body.department : "";
  const fallbackTier = typeof body?.fallbackTier === "string" ? body.fallbackTier : "frontline";

  if (!name) {
    return NextResponse.json({ error: "Role name is required." }, { status: 400 });
  }
  if (department && !VALID_DEPARTMENTS.has(department)) {
    return NextResponse.json({ error: "Choose a valid department." }, { status: 400 });
  }
  if (!VALID_TIERS.has(fallbackTier)) {
    return NextResponse.json({ error: "Choose a valid fallback tier." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("staff_roles").insert({
    venue_id: staff.venue_id,
    name,
    department: department || null,
    fallback_tier: fallbackTier,
  });

  if (error) {
    console.error("staff-roles insert unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  const flags = await upsertWizardSession(supabase, staff.venue_id, { currentStep: "staff-roles" });
  return NextResponse.json({ ok: true, flags });
}
