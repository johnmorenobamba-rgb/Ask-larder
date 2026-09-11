import "server-only";
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createAnthropicClient } from "@/lib/ai/anthropic";

const MODEL = "claude-sonnet-5";

// Block R -- the curated document shape (Part 0: Purpose/Scope/Who performs
// it/Materials/Procedure/Safety-critical callouts/Definition of done/
// Escalation). Distilled once per module, cached in sop_documents, never
// regenerated on view (R2/R3). Check questions are never passed to this
// generator at all -- not filtered out afterward -- so there is no path by
// which quiz content could leak into the document.
export interface SopDocumentContent {
  purpose: string;
  scope: string;
  whoPerformsIt: string;
  materials: string[];
  procedure: string[];
  safetyCriticalCallouts: string[];
  definitionOfDone: string;
  escalationContact: string;
}

const SYSTEM_PROMPT = `You turn a hospitality venue's raw, staff-facing training content into a professional Standard Operating Procedure document for the venue's own records.

The source material is informal, conversational prose written for a new hire reading it on a phone -- your job is to distill it into a proper SOP document shape, not to copy it verbatim and not to invent anything it doesn't actually say.

Classify safety-critical content by actually judging what's being described, not by looking for the literal words "safety critical" or "safety-critical" -- some genuinely critical content in the source isn't labelled that way, and some content that uses safety-adjacent words (like a passing mention of "safely" in an unrelated sentence) isn't actually a critical callout. A safety-critical callout is guidance where getting it wrong could plausibly injure someone, endanger someone's life, or cause a serious incident -- gas leaks, collapsed colleagues, physical altercations, chemical handling, heavy lifting risks, and similar. A callout should be a complete, standalone warning a reader could act on without needing the rest of the document.

Never fabricate a fact, a name, a number, a contact, or a step that isn't actually in the source content. If something a real SOP document would normally have (materials needed, an escalation contact, a definition of done) genuinely isn't stated anywhere in the source, say so plainly ("Not specified in source content") rather than inventing a plausible-sounding answer.

Write in plain, direct, sentence-case language. No filler, no hedging, no marketing tone. This document may be printed and kept on file, so write it as a real reference document, not a summary.`;

const generateTool: Anthropic.Tool = {
  name: "produce_sop_document",
  description: "Return the distilled, professional SOP document for this module.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      purpose: {
        type: "string",
        description: "One to three sentences: why this SOP exists and what problem or risk it addresses.",
      },
      scope: {
        type: "string",
        description: "What this SOP covers, and what it explicitly does not cover if the source draws that line.",
      },
      whoPerformsIt: {
        type: "string",
        description: "Which role(s) or people this procedure applies to, per the source content.",
      },
      materials: {
        type: "array",
        items: { type: "string" },
        description: "Equipment, tools, or resources needed to carry this out. Empty array if the source doesn't mention any.",
      },
      procedure: {
        type: "array",
        items: { type: "string" },
        description: "Ordered steps in plain language, distilled from the source. Each entry is one step.",
      },
      safetyCriticalCallouts: {
        type: "array",
        items: { type: "string" },
        description: "Genuinely safety-critical warnings, identified by judgment from the full context, rewritten as clear standalone statements. Empty array if nothing in this module is safety-critical.",
      },
      definitionOfDone: {
        type: "string",
        description: "How a staff member knows this was completed correctly, per the source content.",
      },
      escalationContact: {
        type: "string",
        description: "Who to contact or escalate to if something goes wrong or is unclear, per the source content. 'Not specified in source content' if genuinely absent.",
      },
    },
    required: [
      "purpose",
      "scope",
      "whoPerformsIt",
      "materials",
      "procedure",
      "safetyCriticalCallouts",
      "definitionOfDone",
      "escalationContact",
    ],
    additionalProperties: false,
  },
};

function isSopDocumentContent(value: unknown): value is SopDocumentContent {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.purpose === "string" &&
    typeof v.scope === "string" &&
    typeof v.whoPerformsIt === "string" &&
    Array.isArray(v.materials) &&
    v.materials.every((m) => typeof m === "string") &&
    Array.isArray(v.procedure) &&
    v.procedure.every((p) => typeof p === "string") &&
    Array.isArray(v.safetyCriticalCallouts) &&
    v.safetyCriticalCallouts.every((s) => typeof s === "string") &&
    typeof v.definitionOfDone === "string" &&
    typeof v.escalationContact === "string"
  );
}

export interface GenerateSopDocumentResult {
  content: SopDocumentContent;
  generatedFromHash: string;
}

/**
 * Generates (or regenerates) the cached curated SOP document for a module,
 * upserting sop_documents on module_id. Callable at go-live (best-effort,
 * matching ingestModule's convention in go-live/route.ts) and from the
 * owner-triggered "Generate SOP document" / "Regenerate" action -- both are
 * the same operation, an explicit upsert, never run implicitly on a view.
 */
export async function generateSopDocument(
  moduleId: string,
  supabase: SupabaseClient<Database>,
): Promise<GenerateSopDocumentResult> {
  const { data: moduleRow, error: moduleError } = await supabase
    .from("modules")
    .select("id, title")
    .eq("id", moduleId)
    .maybeSingle();
  if (moduleError) throw new Error(moduleError.message);
  if (!moduleRow) throw new Error(`Module ${moduleId} not found.`);

  const { data: sections, error: sectionsError } = await supabase
    .from("module_sections")
    .select("content, is_restricted, section_order")
    .eq("module_id", moduleId)
    .order("section_order");
  if (sectionsError) throw new Error(sectionsError.message);

  const orderedContent = (sections ?? []).map((s) => s.content ?? "").join("\n\n---\n\n");
  const generatedFromHash = crypto.createHash("sha256").update(orderedContent).digest("hex");

  const sourceBlock = (sections ?? [])
    .map(
      (s, i) =>
        `Section ${i + 1}${s.is_restricted ? " (restricted content)" : ""}:\n${s.content ?? ""}`,
    )
    .join("\n\n");

  const client = createAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: `Module title: ${moduleRow.title}\n\nSource content (this venue's own authored training sections for this module, already reviewed and approved -- no check questions or quiz content are included here, by design):\n\n${sourceBlock}`,
      },
    ],
    messages: [{ role: "user", content: "Produce the SOP document for this module." }],
    tools: [generateTool],
    tool_choice: { type: "tool", name: "produce_sop_document" },
    output_config: { effort: "high" },
  });

  const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUseBlock || !isSopDocumentContent(toolUseBlock.input)) {
    throw new Error("Model did not return the expected SOP document structure.");
  }

  const { error: upsertError } = await supabase.from("sop_documents").upsert(
    {
      module_id: moduleId,
      content: toolUseBlock.input as unknown as Database["public"]["Tables"]["sop_documents"]["Insert"]["content"],
      generated_from_hash: generatedFromHash,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "module_id" },
  );
  if (upsertError) throw new Error(upsertError.message);

  return { content: toolUseBlock.input, generatedFromHash };
}
