import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// Approving a suggestion never writes directly to live content. It creates
// a module_sections row with provenance 'ai_recommended_pending' -- the
// exact same value, same badge, same "Larder suggests this, review and
// confirm" copy already shipped for every other AI-suggested default. The
// owner still has to confirm that section (module-sections/confirm-
// recommendation) and then run the module through its own real publish
// path (approve, or publish-version for an already-live module) -- both of
// which now check for unconfirmed recommendations and credential
// references before anything goes live (prePublishChecks.ts).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: suggestion, error: suggestionError } = await supabase
    .from("content_suggestions")
    .select("id, status, target_module_id, proposed_content, blocked_reason")
    .eq("id", id)
    .eq("venue_id", staff.venue_id)
    .maybeSingle();
  if (suggestionError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
  if (suggestion.status !== "pending") {
    return NextResponse.json({ error: "This suggestion has already been resolved." }, { status: 400 });
  }
  if (suggestion.blocked_reason || !suggestion.target_module_id || !suggestion.proposed_content) {
    return NextResponse.json({ error: "This suggestion has no proposed content to approve. Dismiss it, or add this content yourself." }, { status: 400 });
  }

  const { data: moduleRow, error: moduleError } = await supabase
    .from("modules")
    .select("id, status")
    .eq("id", suggestion.target_module_id)
    .eq("venue_id", staff.venue_id)
    .maybeSingle();
  if (moduleError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  if (!moduleRow) return NextResponse.json({ error: "Target module not found." }, { status: 404 });

  const { data: existingSections, error: sectionsError } = await supabase
    .from("module_sections")
    .select("section_order")
    .eq("module_id", moduleRow.id)
    .order("section_order", { ascending: false })
    .limit(1);
  if (sectionsError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  const nextSectionOrder = (existingSections?.[0]?.section_order ?? -1) + 1;

  const { error: insertError } = await supabase.from("module_sections").insert({
    module_id: moduleRow.id,
    content: suggestion.proposed_content,
    provenance: "ai_recommended_pending",
    section_order: nextSectionOrder,
    citation: "Suggested from real venue activity -- see the suggestion feed for the full evidence.",
  });
  if (insertError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });

  const { error: updateError } = await supabase
    .from("content_suggestions")
    .update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: staff.id })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });

  return NextResponse.json({ ok: true, moduleId: moduleRow.id, moduleStatus: moduleRow.status });
}
