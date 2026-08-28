import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .update({ escalation_status: "resolved" })
    .eq("id", id)
    .eq("is_escalation", true)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("resolve escalation unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Escalation not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
