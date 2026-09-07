import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";
import { SECURITY_FIRM_CONTACT_TYPE, CROWD_CONTROL_LICENCES_CONTACT_TYPE } from "@/lib/onboarding/constants";

// Q2 Page 5/5a/5b — crowd control gate (licensed only). Security firm name
// and individual crowd-controller licence numbers both go into
// venue_contacts (Q1 catalog rows 32/33 — no dedicated table exists, and
// none is being added here). Update-if-exists-by-contact_type keeps a
// resubmit from duplicating the row on a page re-visit.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const required = body?.required === true;
  const securityFirmName = typeof body?.securityFirmName === "string" ? body.securityFirmName.trim() : "";
  const controllerLicenceNumbers = typeof body?.controllerLicenceNumbers === "string" ? body.controllerLicenceNumbers.trim() : "";

  const supabase = await createClient();

  async function upsertContact(contactType: string, name: string, notes: string | null) {
    const { data: existing } = await supabase
      .from("venue_contacts")
      .select("id")
      .eq("venue_id", staff!.venue_id!)
      .eq("contact_type", contactType)
      .maybeSingle();
    if (existing) {
      await supabase.from("venue_contacts").update({ name, notes }).eq("id", existing.id);
    } else {
      await supabase.from("venue_contacts").insert({ venue_id: staff!.venue_id, contact_type: contactType, name, notes });
    }
  }

  if (required) {
    if (!securityFirmName) {
      return NextResponse.json({ error: "Security firm name is required when controllers are used." }, { status: 400 });
    }
    await upsertContact(SECURITY_FIRM_CONTACT_TYPE, securityFirmName, null);
    if (controllerLicenceNumbers) {
      await upsertContact(CROWD_CONTROL_LICENCES_CONTACT_TYPE, "Crowd controller licence numbers", controllerLicenceNumbers);
    }
  }

  const flags = await upsertWizardSession(supabase, staff.venue_id, {
    currentStep: "crowd-control",
    flags: { crowd_control_required: required },
  });

  return NextResponse.json({ ok: true, flags });
}
