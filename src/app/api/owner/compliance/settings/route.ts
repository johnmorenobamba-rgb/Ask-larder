import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// PATCH /api/owner/compliance/settings { tradingDayCutoffHour }: the hour (venue local, 0 to 12) when a new
// trading day starts. A closing form made before this hour counts for the previous day. Manager tier and
// owners only; the write goes through the caller's own client so RLS (manager tier) is the real gate.
export async function PATCH(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const hour = body?.tradingDayCutoffHour;
  if (typeof hour !== "number" || !Number.isInteger(hour) || hour < 0 || hour > 12) {
    return NextResponse.json({ error: "Choose an hour from midnight to 12 noon." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase.from("venue_compliance_settings").select("venue_id").eq("venue_id", staff.venue_id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  const { error } = existing
    ? await supabase.from("venue_compliance_settings").update({ trading_day_cutoff_hour: hour }).eq("venue_id", staff.venue_id)
    : await supabase.from("venue_compliance_settings").insert({ venue_id: staff.venue_id, trading_day_cutoff_hour: hour });
  if (error) {
    console.error("[compliance settings] write failed:", error.message);
    return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tradingDayCutoffHour: hour });
}
