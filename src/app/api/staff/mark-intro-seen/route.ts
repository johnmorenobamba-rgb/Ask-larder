import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Scoped to the caller's own row, same reasoning as set-role.
  const { error } = await supabase
    .from("app_users")
    .update({ has_seen_ask_larder_intro: true })
    .eq("auth_id", user.id);

  if (error) {
    console.error("mark-intro-seen unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
