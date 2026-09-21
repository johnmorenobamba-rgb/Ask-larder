import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { checkModulePrePublish } from "@/lib/modules/prePublishChecks";

export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();

  // Provenance-aware approval gate (an unconfirmed ai_recommended_pending
  // section can't be waved through) and the credential/access-code gate
  // (added after a real incident, 14 Sep 2026) -- shared with
  // publish-version/route.ts, the equivalent gate for an already-live
  // module shipping a new version, via prePublishChecks.ts.
  const check = await checkModulePrePublish(supabase, moduleId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { data, error } = await supabase
    .from("modules")
    .update({ status: "approved", approved_by: staff.id, approved_at: new Date().toISOString() })
    .eq("id", moduleId)
    .eq("status", "pending_approval")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("approve module unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Module not found or not pending approval." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
