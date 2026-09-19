import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// Block T1/T4 -- the specialist's one-tap resolution of a low-confidence
// sop_topic_decisions row. Once confirmed, treated as authoritative
// (confidence -> 'high', source -> 'specialist_confirmed') so the topic
// doesn't keep re-surfacing as a flag on every future visit or re-run of
// determine-topics.
export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const topicKey = typeof body?.topicKey === "string" ? body.topicKey : "";
  const applicable = body?.applicable === true;
  if (!topicKey) {
    return NextResponse.json({ error: "topicKey is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sop_topic_decisions")
    .update({
      applicable,
      confidence: "high",
      source: "specialist_confirmed",
      confirmed_by: staff.id,
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("venue_id", staff.venue_id)
    .eq("topic_key", topicKey);

  if (error) {
    console.error("sop-intake confirm-topic unexpected error:", error.message);
    return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
