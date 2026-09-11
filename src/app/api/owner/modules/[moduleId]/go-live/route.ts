import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { ingestModule } from "@/lib/ai/ingestModule";
import { generateSopDocument } from "@/lib/ai/generateSopDocument";

// First-time-live only, per approve -> go-live -> publish-version's split:
// this is a plain status flip, no module_versions row. Once a module is
// live, subsequent content changes go through publish-version instead so
// staff get the re-acknowledgement flow.
export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modules")
    .update({ status: "live" })
    .eq("id", moduleId)
    .eq("status", "approved")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("go-live module unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Module not found or not approved." }, { status: 404 });
  }

  // Best-effort: the status flip already happened and shouldn't roll back
  // over an embedding failure. A retry (re-running go-live is a no-op once
  // status is already 'live', so this relies on ingestModule also being
  // callable idempotently elsewhere) or a manual `ingest-module.ts` run
  // covers a transient Voyage failure here.
  try {
    await ingestModule(moduleId, supabase);
  } catch (ingestError) {
    console.error("go-live ingestion failed:", ingestError instanceof Error ? ingestError.message : ingestError);
  }

  // Block R -- fire the curated SOP document generation once, here, the
  // first time a module actually goes live. Same best-effort convention as
  // ingestModule above: the status flip already happened and shouldn't roll
  // back over a generation failure. A missing document surfaces as a real
  // "Generate SOP document" action on the SOPs dashboard (R3), not a silent
  // gap, so this is safe to fail without blocking go-live.
  try {
    await generateSopDocument(moduleId, supabase);
  } catch (sopError) {
    console.error("go-live SOP document generation failed:", sopError instanceof Error ? sopError.message : sopError);
  }

  return NextResponse.json({ ok: true });
}
