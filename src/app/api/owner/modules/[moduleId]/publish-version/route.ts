import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";

// The "new version" path for an already-live module -- calls the existing
// publish_module_version() RPC (security-definer, already checks
// owner/manager internally), which bumps modules.version and inserts a
// module_versions row so staff get the re-acknowledgement flow.
export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const changelog = typeof body?.changelog === "string" ? body.changelog : null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("publish_module_version", {
    p_module_id: moduleId,
    p_changelog: changelog,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, versionId: data });
}
