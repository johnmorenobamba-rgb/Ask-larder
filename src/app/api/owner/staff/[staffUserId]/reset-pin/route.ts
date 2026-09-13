import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { clearStaffPin, PinAuthError } from "@/lib/auth/staffPin";

// Block U1 -- replaces the old StaffPinResetButton behavior of letting an
// owner type a new PIN directly. This only ever clears it; the staff
// member sets their own new one on next login (see /api/auth/staff/set-own-pin).
export async function POST(request: Request, { params }: { params: Promise<{ staffUserId: string }> }) {
  const { staffUserId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    await clearStaffPin(staffUserId, staff.venue_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PinAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("reset-pin unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
