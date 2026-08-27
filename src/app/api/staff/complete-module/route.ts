import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.moduleId) {
    return NextResponse.json({ error: "moduleId is required." }, { status: 400 });
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

  // No unique constraint on (user_id, module_id) exists yet, so this is a
  // check-then-act rather than a real upsert — fine for a single request
  // from one signed-in device, but a unique constraint would be the more
  // robust long-term fix.
  const { data: existing } = await supabase
    .from("staff_module_progress")
    .select("id")
    .eq("user_id", appUser.id)
    .eq("module_id", body.moduleId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("staff_module_progress")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await supabase.from("staff_module_progress").insert({
        user_id: appUser.id,
        module_id: body.moduleId,
        status: "completed",
        completed_at: new Date().toISOString(),
      });

  if (error) {
    console.error("complete-module unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
