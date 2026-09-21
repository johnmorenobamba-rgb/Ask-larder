import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { runSuggestionPass } from "@/lib/suggestions/runSuggestionPass";

// Manual, explicit trigger only -- a real Claude call runs per detector
// (clustering, then per-cluster drafting), so this deliberately isn't
// fired automatically on every dashboard/feed page load. No scheduled cron
// job yet either; wiring one (matching the existing cert-nudge pg_cron
// precedent) is a natural follow-up once this is live-verified, not
// attempted in this pass -- real, on-demand generation now, not mocked.
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
