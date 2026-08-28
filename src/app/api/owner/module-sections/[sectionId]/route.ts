import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

export async function PATCH(request: Request, { params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.content !== "string") {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("module_sections")
    .update({ content: body.content })
    .eq("id", sectionId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("edit module_section unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Section not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
