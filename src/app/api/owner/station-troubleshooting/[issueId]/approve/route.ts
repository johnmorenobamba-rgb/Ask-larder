import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

export async function POST(request: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: issue, error: issueError } = await supabase
    .from("station_troubleshooting_issues")
    .select("id, provenance, stations!inner(venue_id)")
    .eq("id", issueId)
    .eq("stations.venue_id", staff.venue_id)
    .maybeSingle();
  if (issueError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  if (!issue) return NextResponse.json({ error: "Troubleshooting entry not found." }, { status: 404 });
  if (issue.provenance === "ai_recommended_pending") {
    return NextResponse.json({ error: "Confirm this content before approving it." }, { status: 400 });
  }

  const { error: updateError } = await supabase.from("station_troubleshooting_issues").update({ status: "approved" }).eq("id", issueId);
  if (updateError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
