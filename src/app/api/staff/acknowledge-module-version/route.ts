import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.moduleVersionIds) || body.moduleVersionIds.length === 0) {
    return NextResponse.json({ error: "moduleVersionIds is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!appUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Self-scoped to the caller, same reasoning as complete-module/upload-cert
  // — the table's RLS policy is venue-wide via FK-subquery, not self-scoped.
  const rows = (body.moduleVersionIds as string[]).map((moduleVersionId) => ({
    user_id: appUser.id,
    module_version_id: moduleVersionId,
    acknowledged_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("staff_module_acknowledgements").insert(rows);

  if (error) {
    console.error("acknowledge-module-version unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
