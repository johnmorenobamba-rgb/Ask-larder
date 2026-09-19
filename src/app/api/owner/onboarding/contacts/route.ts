import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";

// Q2 Page 10 — the venue's contact directory: originally scoped to
// business-continuity trades (electrician, plumber, ...), broadened
// 20 Sep 2026 to also cover day-to-day trade suppliers (a meat supplier,
// a post-mix gas supplier) since it's the same underlying mechanism and
// this is also the real, ongoing "Contacts" owner-dashboard page now, not
// just a one-time wizard step. contact_type is constrained by the wizard
// UI (CONTACT_TYPES) even though the column itself is unconstrained text
// at the DB layer, matching venue_contacts's existing design. Adds one row
// per call.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const contactType = typeof body?.contactType === "string" ? body.contactType : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  const checkFirstStep = typeof body?.checkFirstStep === "string" ? body.checkFirstStep.trim() : "";

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
    check_first_step: checkFirstStep || null,
  });

  if (error) {
    console.error("contacts insert unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  const flags = await upsertWizardSession(supabase, staff.venue_id, { currentStep: "contacts" });
  return NextResponse.json({ ok: true, flags });
}

// Real post-launch editing (the Contacts page, not just the wizard step) --
// a supplier's number changes, an escalation step needs correcting. Same
// venue-scoped update-by-id shape as stations/[id]/route.ts.
export async function PATCH(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const contactType = typeof body?.contactType === "string" ? body.contactType : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!contactType) return NextResponse.json({ error: "Choose a contact type." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Contact name is required." }, { status: 400 });

  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  const checkFirstStep = typeof body?.checkFirstStep === "string" ? body.checkFirstStep.trim() : "";

  const supabase = await createClient();
  const { error } = await supabase
    .from("venue_contacts")
    .update({
      contact_type: contactType,
      name,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      check_first_step: checkFirstStep || null,
    })
    .eq("id", id)
    .eq("venue_id", staff.venue_id);

  if (error) {
    console.error("contacts update unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const supabase = await createClient();
  await supabase.from("venue_contacts").delete().eq("id", id).eq("venue_id", staff.venue_id);
  return NextResponse.json({ ok: true });
}
