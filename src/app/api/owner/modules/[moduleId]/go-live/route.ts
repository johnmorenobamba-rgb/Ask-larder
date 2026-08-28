import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// First-time-live only, per approve -> go-live -> publish-version's split:
// this is a plain status flip, no module_versions row. Once a module is
// live, subsequent content changes go through publish-version instead so
// staff get the re-acknowledgement flow.
export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modules")
    .update({ status: "live" })
    .eq("id", moduleId)
    .eq("status", "approved")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("go-live module unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Module not found or not approved." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
