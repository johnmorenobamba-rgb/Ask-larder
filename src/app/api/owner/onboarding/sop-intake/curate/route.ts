import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { curateTopic } from "@/lib/onboarding/curateTopic";

// Block T5 -- fired explicitly once a topic's guided-intake questions are
// all answered ("Generate this module" in the UI). Not automatic, not
// backgrounded, matching generateSopDocument's own precedent -- a failure
// here is the primary artifact failing, so it should surface as a real
// error, not swallow silently.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const topicKey = typeof body?.topicKey === "string" ? body.topicKey : "";
  if (!topicKey) {
    return NextResponse.json({ error: "topicKey is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("modules")
    .select("id")
    .eq("venue_id", staff.venue_id)
    .eq("topic_key", topicKey)
    .maybeSingle();

  try {
    const result = await curateTopic(supabase, staff.venue_id, topicKey, existing?.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("sop-intake curate unexpected error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't generate this module. Try again." }, { status: 500 });
  }
}
