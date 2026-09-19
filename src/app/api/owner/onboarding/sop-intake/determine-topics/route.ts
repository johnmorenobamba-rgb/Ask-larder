import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { determineSopTopics } from "@/lib/ai/sopTopicDetermination";

// Block T1 -- runs the rule + AI determination pass and upserts
// sop_topic_decisions. Called automatically by content-intake/page.tsx the
// first time it finds no decisions for the venue, and exposed here as a
// manual "Re-check what's needed" action for when an upstream wizard answer
// (licensing, food service, gaming) changes after the fact -- Q2's "never
// gate a page" rule means those can legitimately change after this has
// already run once. Idempotent: re-running just upserts every row again.
export async function POST() {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  try {
    const decisions = await determineSopTopics(staff.venue_id, supabase);
    return NextResponse.json({ ok: true, decisions });
  } catch (error) {
    console.error("determine-topics unexpected error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't work out what this venue needs. Try again." }, { status: 500 });
  }
}
