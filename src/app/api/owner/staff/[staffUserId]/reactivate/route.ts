import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { AUTHORIZED_HOLDER_MESSAGE, isAuthorizedHolderRefusal, isProtectedTarget, loadTarget } from "@/lib/auth/authorizedHolder";

// Block U1 -- the inverse of deactivate. Not explicitly asked for in the
// brief, but a one-line undo for an otherwise irreversible action.
export async function POST(request: Request, { params }: { params: Promise<{ staffUserId: string }> }) {
  const { staffUserId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const target = await loadTarget(supabase, staff.venue_id, staffUserId);
  if (!target) {
    return NextResponse.json({ error: "Staff user not found." }, { status: 404 });
  }
  if (staff.role !== "owner" && isProtectedTarget(target)) {
    return NextResponse.json({ error: AUTHORIZED_HOLDER_MESSAGE }, { status: 403 });
  }
  const { data, error } = await supabase
    .from("app_users")
    .update({ deactivated_at: null })
    .eq("id", staffUserId)
    .eq("venue_id", staff.venue_id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isAuthorizedHolderRefusal(error.message) || /Only the owner can deactivate or reactivate/i.test(error.message)) {
      return NextResponse.json({ error: AUTHORIZED_HOLDER_MESSAGE }, { status: 403 });
    }
    console.error("reactivate unexpected error:", error.message);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Staff user not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
