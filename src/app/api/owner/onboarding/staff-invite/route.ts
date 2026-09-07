import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { upsertWizardSession } from "@/lib/onboarding/wizardSession";

// Q2 Page 11b — named staff for invite. Writes an app_users row with no
// auth_id yet (a real Supabase Auth identity is created through the
// existing staff-invite/PIN-setup flow, unchanged by this wizard) — at
// least one of email/phone is required per person.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const staffRoleId = typeof body?.staffRoleId === "string" ? body.staffRoleId : null;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!email && !phone) {
    return NextResponse.json({ error: "Enter at least an email or a phone number." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("app_users").insert({
    venue_id: staff.venue_id,
    role: "staff",
    name,
    email: email || null,
    phone: phone || null,
    staff_role_id: staffRoleId,
  });

  if (error) {
    console.error("staff-invite insert unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  const flags = await upsertWizardSession(supabase, staff.venue_id, { currentStep: "staff-invite" });
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
  // Only ever removes an as-yet-unauthenticated invite row, never a staff
  // member who has already logged in (auth_id set) — an owner correcting a
  // typo'd invite before it's used, not an offboarding action.
  await supabase.from("app_users").delete().eq("id", id).eq("venue_id", staff.venue_id).is("auth_id", null);
  return NextResponse.json({ ok: true });
}
