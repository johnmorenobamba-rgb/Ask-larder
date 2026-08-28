import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { embedTexts } from "@/lib/ai/voyage";

// Not src/lib/supabase/admin.ts's createAdminClient(): that file is guarded
// by `server-only`, which throws unconditionally outside Next's bundler (it
// relies on webpack/Next module aliasing, not a runtime check) — it can't be
// imported from this standalone script at all. Same service-role client,
// just constructed inline for a context Next's guard doesn't cover.
function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Rough proxy for ~500 tokens (no tokenizer dependency for a one-off script) —
// hand-authored module content runs short, so this rarely triggers; it's a
// safety net for an unusually long section, not the primary chunk boundary.
const MAX_CHUNK_CHARS = 2000;

function chunkContent(content: string): string[] {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= MAX_CHUNK_CHARS) {
      chunks.push(paragraph);
      continue;
    }
    for (let i = 0; i < paragraph.length; i += MAX_CHUNK_CHARS) {
      chunks.push(paragraph.slice(i, i + MAX_CHUNK_CHARS));
    }
  }
  return chunks;
}

async function ingestModule(moduleId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: moduleRow, error: moduleError } = await admin
    .from("modules")
    .select("id, title, venue_id")
    .eq("id", moduleId)
    .maybeSingle();
  if (moduleError) throw new Error(moduleError.message);
  if (!moduleRow) throw new Error(`Module ${moduleId} not found.`);

  const [{ data: sections, error: sectionsError }, { data: questions, error: questionsError }] = await Promise.all([
    admin
      .from("module_sections")
      .select("content")
      .eq("module_id", moduleId)
      .order("section_order"),
    admin.from("check_questions").select("question").eq("module_id", moduleId),
  ]);
  if (sectionsError) throw new Error(sectionsError.message);
  if (questionsError) throw new Error(questionsError.message);

  const chunks: string[] = [];
  for (const section of sections ?? []) {
    if (section.content) chunks.push(...chunkContent(section.content));
  }
  for (const q of questions ?? []) {
    chunks.push(q.question);
  }

  if (chunks.length === 0) {
    console.log(`"${moduleRow.title}" has no section content or questions to ingest — nothing to do.`);
    return;
  }

  console.log(`Embedding ${chunks.length} chunk(s) for "${moduleRow.title}"...`);
  const embeddings = await embedTexts(chunks, "document");

  // Delete-then-reinsert: safe to rerun after a module's content or version
  // changes, since it replaces the full chunk set for this module rather
  // than accumulating stale chunks alongside fresh ones.
  const { error: deleteError } = await admin.from("knowledge_chunks").delete().eq("source_module_id", moduleId);
  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await admin.from("knowledge_chunks").insert(
    chunks.map((content_chunk, i) => ({
      venue_id: moduleRow.venue_id,
      source_module_id: moduleId,
      content_chunk,
      embedding: embeddings[i] as unknown as string,
    })),
  );
  if (insertError) throw new Error(insertError.message);

  console.log(`Ingested ${chunks.length} chunk(s) for "${moduleRow.title}".`);
}

const moduleId = process.argv[2];
if (!moduleId) {
  console.error("Usage: npx tsx scripts/ingest-module.ts <moduleId>");
  process.exit(1);
}

ingestModule(moduleId).catch((err) => {
  console.error("Ingestion failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
