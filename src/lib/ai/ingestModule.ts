// No `server-only` guard: this must stay importable both by Next.js API
// routes and by scripts/ingest-module.ts, a standalone script run outside
// Next's bundler, where `server-only` throws unconditionally (it relies on
// Next/webpack's module aliasing, not a runtime check). The Supabase client
// is passed in rather than constructed here for the same reason — a route
// passes its request-scoped, RLS-respecting client (the caller is already
// verified owner/manager for this venue, and knowledge_chunks' venue
// isolation policy is `for all using (venue_id = private.auth_venue_id())`,
// so an owner's own client can write their own venue's chunks); the script
// has no session, so it builds its own inline service-role client instead.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { embedTexts } from "@/lib/ai/voyage";

// Rough proxy for ~500 tokens (no tokenizer dependency) — hand-authored
// module content runs short, so this rarely triggers; it's a safety net for
// an unusually long section, not the primary chunk boundary.
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

export interface IngestModuleResult {
  chunkCount: number;
  title: string;
}

/**
 * Chunks a module's section content + check questions, embeds them via
 * Voyage, and replaces the module's knowledge_chunks rows (delete-then-
 * reinsert — safe to rerun after content or a version changes). Each chunk
 * carries the is_restricted flag of the section it came from (Tech Bible
 * §15i) so the Ask Larder API can withhold it from a frontline-tier asker
 * even if module_roles scoping alone would have let the query through.
 *
 * Callable at any module status, including pre-approval draft content — the
 * gap-detection content-authoring loop (Block Q) needs to embed and spot-
 * check draft sections before a module ever goes live; only the retrieval
 * RPC (match_knowledge_chunks) is hard-filtered to status = 'live'.
 */
export async function ingestModule(
  moduleId: string,
  supabase: SupabaseClient<Database>,
): Promise<IngestModuleResult> {
  const { data: moduleRow, error: moduleError } = await supabase
    .from("modules")
    .select("id, title, venue_id")
    .eq("id", moduleId)
    .maybeSingle();
  if (moduleError) throw new Error(moduleError.message);
  if (!moduleRow) throw new Error(`Module ${moduleId} not found.`);

  const [{ data: sections, error: sectionsError }, { data: questions, error: questionsError }] = await Promise.all([
    supabase
      .from("module_sections")
      .select("content, is_restricted")
      .eq("module_id", moduleId)
      .order("section_order"),
    supabase.from("check_questions").select("question").eq("module_id", moduleId),
  ]);
  if (sectionsError) throw new Error(sectionsError.message);
  if (questionsError) throw new Error(questionsError.message);

  const chunks: { text: string; isRestricted: boolean }[] = [];
  for (const section of sections ?? []) {
    if (section.content) {
      for (const text of chunkContent(section.content)) {
        chunks.push({ text, isRestricted: section.is_restricted ?? false });
      }
    }
  }
  for (const q of questions ?? []) {
    chunks.push({ text: q.question, isRestricted: false });
  }

  if (chunks.length === 0) {
    return { chunkCount: 0, title: moduleRow.title };
  }

  const embeddings = await embedTexts(
    chunks.map((c) => c.text),
    "document",
  );

  const { error: deleteError } = await supabase.from("knowledge_chunks").delete().eq("source_module_id", moduleId);
  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase.from("knowledge_chunks").insert(
    chunks.map((chunk, i) => ({
      venue_id: moduleRow.venue_id,
      source_module_id: moduleId,
      content_chunk: chunk.text,
      is_restricted: chunk.isRestricted,
      embedding: embeddings[i] as unknown as string,
    })),
  );
  if (insertError) throw new Error(insertError.message);

  return { chunkCount: chunks.length, title: moduleRow.title };
}
