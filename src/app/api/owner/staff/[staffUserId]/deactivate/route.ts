import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/auth/session";

// Block U1 -- soft-delete only. staff_module_progress/staff_certificates/
// esignatures are never touched, so a staff member leaving doesn't erase
// the record that they were ever trained (completions/page.tsx keeps
// showing them). The real access cutoff is getCurrentStaff()'s
// `deactivated_at is null` filter (session.ts) -- signOut here is
// best-effort hygiene (revokes refresh tokens) on top of that, not the
// enforcement itself.
export async function POST(request: Request, { params }: { params: Promise<{ staffUserId: string }> }) {
  const { staffUserId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (staffUserId === staff.id) {
    return NextResponse.json({ error: "You can't deactivate your own account." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_users")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", staffUserId)
    .eq("venue_id", staff.venue_id)
    .select("id, auth_id")
    .maybeSingle();

  if (error) {
    console.error("deactivate unexpected error:", error.message);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Staff user not found." }, { status: 404 });
  }

  if (data.auth_id) {
    try {
      const admin = createAdminClient();
      await admin.auth.admin.signOut(data.auth_id, "global");
    } catch (err) {
      console.error("deactivate signOut failed (non-blocking):", err);
    }
  }

  return NextResponse.json({ ok: true });
}
