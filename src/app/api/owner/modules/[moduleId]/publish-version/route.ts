import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { ingestModule } from "@/lib/ai/ingestModule";
import { checkModulePrePublish } from "@/lib/modules/prePublishChecks";

// The "new version" path for an already-live module -- calls the existing
// publish_module_version() RPC (security-definer, already checks
// owner/manager internally), which bumps modules.version and inserts a
// module_versions row so staff get the re-acknowledgement flow.
export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !staff.isManagerTier) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const changelog = typeof body?.changelog === "string" ? body.changelog : null;

  const supabase = await createClient();

  // Same gate approve() uses for a module's first publish -- found missing
  // here during the suggestion assistant build (21 Sep 2026): an already-
  // live module shipping a new version never actually passed through
  // either the unconfirmed-recommendation check or the credential check.
  // A suggestion approved against a live module goes out exactly this way,
  // so this closes a real, pre-existing gap this feature would otherwise
  // have inherited -- not something new invented for suggestions alone.
  const check = await checkModulePrePublish(supabase, moduleId);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

  const { data, error } = await supabase.rpc("publish_module_version", {
    p_module_id: moduleId,
    p_changelog: changelog,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Re-embed: the version bump means module_sections content may have
  // changed since the last ingest. Best-effort, same reasoning as go-live —
  // the version publish already succeeded and shouldn't roll back over a
  // transient embedding failure.
  try {
    await ingestModule(moduleId, supabase);
  } catch (ingestError) {
    console.error("publish-version ingestion failed:", ingestError instanceof Error ? ingestError.message : ingestError);
  }

  return NextResponse.json({ ok: true, versionId: data });
}
