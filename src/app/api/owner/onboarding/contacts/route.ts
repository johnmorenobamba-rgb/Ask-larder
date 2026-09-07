import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";

// Q2 Page 10 — emergency / business-continuity contacts, always asked
// (CLAUDE.md: Business Continuity is universal). contact_type is
// constrained by the wizard UI (CONTACT_TYPES) even though the column
// itself is unconstrained text at the DB layer, matching venue_contacts's
// existing design. Adds one row per call.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const contactType = typeof body?.contactType === "string" ? body.contactType : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

  if (!contactType) {
    return NextResponse.json({ error: "Choose a contact type." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("venue_contacts").insert({
    venue_id: staff.venue_id,
    contact_type: contactType,
    name,
    phone: phone || null,
    email: email || null,
    notes: notes || null,
  });

  if (error) {
    console.error("contacts insert unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  const flags = await upsertWizardSession(supabase, staff.venue_id, { currentStep: "contacts" });
  return NextResponse.json({ ok: true, flags });
}

export async function DELETE(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = await createClient();
  await supabase.from("venue_contacts").delete().eq("id", id).eq("venue_id", staff.venue_id);
  return NextResponse.json({ ok: true });
}
