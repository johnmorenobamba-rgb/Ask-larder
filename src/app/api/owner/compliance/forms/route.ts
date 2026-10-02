import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { FORM_BY_ID } from "@/lib/compliance/engine/forms";

// PATCH /api/owner/compliance/forms { formId, enabled }: switch a compliance form on or off for the venue.
// Manager tier and owners only. The write goes through the caller's own client, so RLS (manager tier only)
// and the database trigger (who and when are stamped, key columns cannot change) are the real gate.
export async function PATCH(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const formId = typeof body?.formId === "string" ? body.formId : "";
  const enabled = body?.enabled;
  if (!FORM_BY_ID[formId] || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Choose a form and whether it is on." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("venue_compliance_forms")
    .select("form_id")
    .eq("venue_id", staff.venue_id)
    .eq("form_id", formId)
    .maybeSingle();
  if (readError) {
    console.error("[forms toggle] read failed:", readError.message);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  }
  const { error } = existing
    ? await supabase.from("venue_compliance_forms").update({ enabled }).eq("venue_id", staff.venue_id).eq("form_id", formId)
    : await supabase.from("venue_compliance_forms").insert({ venue_id: staff.venue_id, form_id: formId, enabled });
  if (error) {
    console.error("[forms toggle] write failed:", error.message);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, formId, enabled });
}
