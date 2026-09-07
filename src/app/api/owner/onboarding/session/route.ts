import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession, getWizardFlags } from "@/lib/onboarding/wizardSession";

// wizard_sessions read/update — resume position + branching flags only,
// per Q2 §1. Most pages update current_step/flags as a side effect of their
// own domain POST (see upsertWizardSession calls throughout
// /api/owner/onboarding/*), so this route mainly exists for cases with no
// natural domain write of their own: WizardShell recording which page is
// currently open, and SopIntakeHub tracking which Part B topic is mid-loop
// (current_step = 'sop_intake:<topic_key>', per Q2 Page 12).
export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const supabase = await createClient();
  const flags = await getWizardFlags(supabase, staff.venue_id);
  return NextResponse.json({ flags });
}

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const currentStep = typeof body?.currentStep === "string" ? body.currentStep : undefined;

  const supabase = await createClient();
  const flags = await upsertWizardSession(supabase, staff.venue_id, {
    currentStep,
    startedBy: staff.id,
  });
  return NextResponse.json({ ok: true, flags });
}
