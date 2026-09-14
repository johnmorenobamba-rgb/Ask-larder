import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// Real bug found live (data-provenance audit, 14 Sep 2026): venues.shift_windows
// backs the staff home "Shift" cell and gets passed into the Ask Larder
// system prompt, but nothing anywhere in the app ever wrote it -- the value
// sitting in a real venue's row had no real capture point at all. This is
// the first one.
const WINDOW_RE = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

export async function PATCH(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const opening = typeof body?.opening === "string" ? body.opening.trim() : "";
  const closing = typeof body?.closing === "string" ? body.closing.trim() : "";

  if (opening && !WINDOW_RE.test(opening)) {
    return NextResponse.json({ error: "Opening hours must be in HH:MM-HH:MM format." }, { status: 400 });
  }
  if (closing && !WINDOW_RE.test(closing)) {
    return NextResponse.json({ error: "Closing hours must be in HH:MM-HH:MM format." }, { status: 400 });
  }

  const shiftWindows: Record<string, string> = {};
  if (opening) shiftWindows.opening = opening;
  if (closing) shiftWindows.closing = closing;

  const supabase = await createClient();
  const { error } = await supabase.from("venues").update({ shift_windows: shiftWindows }).eq("id", staff.venue_id);

  if (error) {
    console.error("shift-windows update unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
