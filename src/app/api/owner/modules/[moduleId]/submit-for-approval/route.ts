import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// The missing first step of draft -> pending_approval -> approved -> live.
// Confirmed by Block Q9's real onboarding run (not a hand-seeded venue) that
// nothing anywhere in this codebase ever wrote pending_approval -- every
// prior "live" venue only reached that status because a seed script wrote
// it directly into Postgres, bypassing the app entirely. Without this
// route, CLAUDE.md's non-negotiable owner-approval gate was unreachable
// through the product's own UI for any venue, ever.
export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modules")
    .update({ status: "pending_approval" })
    .eq("id", moduleId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("submit-for-approval module unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Module not found or not a draft." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
