import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// Q2 Page 14 — review & activate. This only marks the wizard session
// itself complete; it deliberately does NOT bulk-transition any module to
// live. CLAUDE.md's owner-approval-gate rule (and the existing
// draft -> pending_approval -> approved -> live mechanism on the Modules
// page) already governs each module individually — this route would be the
// wrong place to shortcut that per-module gate.
export async function POST() {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase.from("wizard_sessions").select("id").eq("venue_id", staff.venue_id).maybeSingle();

  if (existing) {
    await supabase
      .from("wizard_sessions")
      .update({ status: "completed", current_step: "review", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("wizard_sessions").insert({
      venue_id: staff.venue_id,
      started_by: staff.id,
      current_step: "review",
      status: "completed",
    });
  }

  return NextResponse.json({ ok: true });
}
