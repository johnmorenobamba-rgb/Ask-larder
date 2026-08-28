import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modules")
    .update({ status: "approved" })
    .eq("id", moduleId)
    .eq("status", "pending_approval")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("approve module unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Module not found or not pending approval." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
