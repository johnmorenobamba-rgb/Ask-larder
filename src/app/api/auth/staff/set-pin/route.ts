import { NextResponse } from "next/server";
import { setStaffPin, PinAuthError } from "@/lib/auth/staffPin";
import { getCurrentStaff } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const caller = await getCurrentStaff();
  if (!caller || !caller.venue_id || !["owner", "manager"].includes(caller.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    await setStaffPin({ ...body, callerVenueId: caller.venue_id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PinAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("set-pin unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
