import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// Dismissing must actually stick -- runSuggestionPass checks dismissed
// suggestions' evidence.sourceIds for overlap before creating a new one for
// the same underlying pattern, so this isn't just a UI hide.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_suggestions")
    .update({ status: "dismissed", dismissed_reason: reason || null, resolved_at: new Date().toISOString(), resolved_by: staff.id })
    .eq("id", id)
    .eq("venue_id", staff.venue_id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Suggestion not found or already resolved." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
