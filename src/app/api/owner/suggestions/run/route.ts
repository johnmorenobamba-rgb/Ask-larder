import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { runSuggestionPass } from "@/lib/suggestions/runSuggestionPass";

// Manual trigger + the automatic best-effort run the suggestion feed page
// fires on load (see feed page.tsx) -- no scheduled cron job yet. Real,
// on-demand, not mocked; wiring a scheduled run is a natural follow-up
// once this is live-verified, not attempted in this pass.
export async function POST() {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  try {
    const summary = await runSuggestionPass(supabase, staff.venue_id);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error("suggestions/run unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
