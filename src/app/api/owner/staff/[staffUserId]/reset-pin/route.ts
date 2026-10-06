import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { AUTHORIZED_HOLDER_MESSAGE, isProtectedTarget, loadTarget } from "@/lib/auth/authorizedHolder";
import { clearStaffPin, PinAuthError } from "@/lib/auth/staffPin";

// Block U1 -- replaces the old StaffPinResetButton behavior of letting an
// owner type a new PIN directly. This only ever clears it; the staff
// member sets their own new one on next login (see /api/auth/staff/set-own-pin).
export async function POST(request: Request, { params }: { params: Promise<{ staffUserId: string }> }) {
  const { staffUserId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // B1 follow up: clearing a PIN lets the next person who logs in as that name set a new one, so it is owner only for an
  // owner, a manager or an Authorized role holder.
  if (staff.role !== "owner") {
    const target = await loadTarget(await createClient(), staff.venue_id, staffUserId);
    if (target && isProtectedTarget(target)) {
      return NextResponse.json({ error: AUTHORIZED_HOLDER_MESSAGE }, { status: 403 });
    }
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
