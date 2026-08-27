import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.roleId) {
    return NextResponse.json({ error: "roleId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Scope to the caller's own row by auth_id, not just RLS's venue-wide
  // policy — venue_isolation_app_users allows any staff member to touch any
  // row in their own venue, so this update must not rely on it to prevent
  // one staff member setting another's role.
  const { error } = await supabase
    .from("app_users")
    .update({ staff_role_id: body.roleId })
    .eq("auth_id", user.id);

  if (error) {
    console.error("set-role unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
