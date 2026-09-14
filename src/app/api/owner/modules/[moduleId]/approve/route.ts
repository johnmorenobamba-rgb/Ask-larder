import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { moduleContentReferencesCredential } from "@/lib/security/detectUnrestrictedCredentialContent";

export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();

  // Provenance-aware approval gate: an AI-suggested default (as opposed to
  // Larder-standard-fill or manual-sourced content, both already treated as
  // real drafted content) can't be waved through as part of a bulk
  // approval -- the owner has to have actually looked at and confirmed it
  // first. Checked here too, not just hidden in the UI, since the API is
  // the real boundary.
  const { data: pendingSections, error: pendingError } = await supabase
    .from("module_sections")
    .select("id")
    .eq("module_id", moduleId)
    .eq("provenance", "ai_recommended_pending")
    .limit(1);
  if (pendingError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  if (pendingSections && pendingSections.length > 0) {
    return NextResponse.json({ error: "Confirm all of Larder's suggested content in this module before approving it." }, { status: 400 });
  }

  // Credential/access-code gate, added after a real incident (14 Sep
  // 2026): a module can state a real code or combination in plain text
  // and, with zero module_roles rows, be visible to every staff role.
  // This never auto-restricts -- it just stops an unrestricted publish so
  // an owner has to make the role-restriction decision on purpose.
  const { data: allSections, error: sectionsError } = await supabase
    .from("module_sections")
    .select("content")
    .eq("module_id", moduleId);
  if (sectionsError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  if (moduleContentReferencesCredential(allSections ?? [])) {
    const { count: roleCount, error: roleError } = await supabase
      .from("module_roles")
      .select("id", { count: "exact", head: true })
      .eq("module_id", moduleId);
    if (roleError) return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
    if (!roleCount || roleCount === 0) {
      return NextResponse.json(
        {
          error:
            "This module looks like it states a real code, combination, PIN, or credential, but it isn't restricted to specific roles yet. Set who can see this module before approving it.",
        },
        { status: 400 },
      );
    }
  }

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
