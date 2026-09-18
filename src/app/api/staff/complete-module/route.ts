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

  // Item 7 fix, 18 Sep 2026: this used to be a check-then-act (select, then
  // insert or update) racy enough on its own to produce duplicate rows --
  // and worse, once a module had 2+ rows for the same person, the check's
  // .maybeSingle() started throwing on every later call (it errors on more
  // than one match), an error this route never looked at, so it silently
  // treated "check failed" the same as "no existing row" and inserted yet
  // another duplicate, forever. A real upsert against the DB's own unique
  // constraint (user_id, module_id) is atomic and can't drift like that.
  const { error } = await supabase
    .from("staff_module_progress")
    .upsert(
      { user_id: appUser.id, module_id: body.moduleId, status: "completed", completed_at: new Date().toISOString() },
      { onConflict: "user_id,module_id" },
    );

  if (error) {
    console.error("complete-module unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
