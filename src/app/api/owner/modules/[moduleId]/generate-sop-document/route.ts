import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { generateSopDocument } from "@/lib/ai/generateSopDocument";

// Block R -- serves both the "Generate SOP document" action (no cached row
// yet, e.g. a module that predates this feature or never hit go-live) and
// the "Regenerate" action (a cached row already exists) -- both are the same
// upsert-on-module_id operation, so one route covers both call sites on the
// SOPs dashboard.
export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: moduleRow, error: moduleError } = await supabase
    .from("modules")
    .select("id")
    .eq("id", moduleId)
    .eq("venue_id", staff.venue_id)
    .maybeSingle();
  if (moduleError) {
    console.error("generate-sop-document lookup error:", moduleError.message);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!moduleRow) {
    return NextResponse.json({ error: "Module not found for this venue." }, { status: 404 });
  }

  try {
    const result = await generateSopDocument(moduleId, supabase);
    return NextResponse.json({ ok: true, content: result.content });
  } catch (err) {
    console.error("generate-sop-document generation error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't generate the SOP document right now." }, { status: 502 });
  }
}
