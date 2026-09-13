import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// Provenance-aware approval UI: the one action that moves a section from
// "Larder suggests this, review and confirm" to "Confirmed by you" --
// deliberately narrow (only this one field, only this one transition), not
// a general section-edit endpoint. The owner never edits the text here;
// confirming accepts Larder's proposed content as-is or the owner asks for
// a real edit through the existing request-edit flow instead.
export async function POST(request: Request, { params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  // Scope to this venue's own modules -- module_sections has no venue_id of
  // its own, so the check goes through modules.venue_id.
  const { data: section, error: sectionError } = await supabase
    .from("module_sections")
    .select("id, provenance, modules!inner(venue_id)")
    .eq("id", sectionId)
    .eq("modules.venue_id", staff.venue_id)
    .maybeSingle();
  if (sectionError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  if (!section) return NextResponse.json({ error: "Section not found." }, { status: 404 });
  if (section.provenance !== "ai_recommended_pending") {
    return NextResponse.json({ error: "This section isn't awaiting confirmation." }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("module_sections")
    .update({ provenance: "ai_recommended_confirmed" })
    .eq("id", sectionId);
  if (updateError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
