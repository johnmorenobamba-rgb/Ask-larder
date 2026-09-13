import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

export async function POST(request: Request, { params }: { params: Promise<{ faqId: string }> }) {
  const { faqId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: faq, error: faqError } = await supabase
    .from("station_faqs")
    .select("id, provenance, stations!inner(venue_id)")
    .eq("id", faqId)
    .eq("stations.venue_id", staff.venue_id)
    .maybeSingle();
  if (faqError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  if (!faq) return NextResponse.json({ error: "FAQ not found." }, { status: 404 });
  // Same liability rule as modules: an AI-suggested default can't be
  // approved as-is -- it has to be explicitly confirmed first.
  if (faq.provenance === "ai_recommended_pending") {
    return NextResponse.json({ error: "Confirm this content before approving it." }, { status: 400 });
  }

  const { error: updateError } = await supabase.from("station_faqs").update({ status: "approved" }).eq("id", faqId);
  if (updateError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
