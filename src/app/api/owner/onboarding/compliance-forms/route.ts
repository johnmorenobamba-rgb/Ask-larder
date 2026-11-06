import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";

// POST /api/owner/onboarding/compliance-forms: the owner confirms the compliance forms step of the wizard.
// The form switches themselves save one at a time through PATCH /api/owner/compliance/forms (the same route
// the owner forms page uses). This only records that the list was reviewed, so Review & activate stops
// listing it as outstanding, and moves the resume position on.
export async function POST() {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const supabase = await createClient();
  try {
    const flags = await upsertWizardSession(supabase, staff.venue_id, {
      currentStep: "review",
      flags: { compliance_forms_reviewed: true },
      startedBy: staff.id,
    });
    return NextResponse.json({ ok: true, flags });
  } catch (e) {
    console.error("[onboarding compliance-forms] save failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  }
}
