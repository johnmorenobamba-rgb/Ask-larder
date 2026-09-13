import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { isSopDocumentContent, type SopDocumentContent } from "@/lib/ai/sopDocumentContent";
import type { IntakeAnswerForCuration } from "@/lib/ai/curateModuleContent";

const MODEL = "claude-sonnet-5";

export interface ExtractedContact {
  name: string;
  phone: string | null;
  role: string | null;
}

export interface CurateSopDocumentResult {
  content: SopDocumentContent;
  extractedContact: ExtractedContact | null;
}

// Block T5, call 2 of 2 -- populates the exact same SopDocumentContent shape
// generateSopDocument.ts already produces (imported, not redefined), but
// from this topic's structured intake answers directly rather than
// extracting it after the fact from module_sections prose a specialist
// composed. Separate call from curateModuleContent -- different job
// (extraction discipline vs instructional writing) and separate failure
// isolation, matching this project's existing one-call-one-job convention.
const SYSTEM_PROMPT = `You turn a hospitality venue's structured SOP interview answers into a professional Standard Operating Procedure document for the venue's own records.

Map each answer to its field directly -- the interview already asked for scope, who performs it, materials, procedure, safety-critical callouts, definition of done, and escalation contact in plain language. Distill and tidy the wording into a proper document, but never invent a fact, a name, a number, a contact, or a step that isn't actually stated in the answers. If a field genuinely has no real answer, say "Not specified in source content" rather than inventing a plausible-sounding one.

If the safety-critical or safety-honesty answer states real, specific risk, write it into safetyCriticalCallouts exactly that plainly -- never soften an honest "yes, there's real risk, here's what we can't guarantee" into vague reassurance.

If the escalation/troubleshoot answer names a real EXTERNAL contact -- a tradesperson, a repair company, a supplier, a regulator, anyone outside this venue's own staff -- also return them as extractedContact with whatever name/phone/role details were actually given. Never return an internal staff member here (a Duty Manager, a chef, an owner, anyone already part of this venue's own team), even if they're named specifically -- an internal escalation contact isn't an "extracted contact" for this purpose. Return an empty name if only an internal staff member, or nobody at all, was mentioned.`;

const curateDocumentTool: Anthropic.Tool = {
  name: "produce_sop_document_from_intake",
  description: "Return the distilled SOP document, populated directly from structured intake answers.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      purpose: { type: "string", description: "One to three sentences: why this SOP exists and what problem or risk it addresses." },
      scope: { type: "string", description: "What this SOP covers, and what it explicitly does not, per the trigger/scope answer." },
      whoPerformsIt: { type: "string" },
      materials: { type: "array", items: { type: "string" } },
      procedure: { type: "array", items: { type: "string" } },
      safetyCriticalCallouts: { type: "array", items: { type: "string" } },
      definitionOfDone: { type: "string" },
      escalationContact: { type: "string" },
      extractedContact: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          role: { type: "string" },
        },
        required: ["name", "phone", "role"],
        additionalProperties: false,
        description: "A real EXTERNAL (non-staff) contact from the troubleshoot/escalate answer. Empty name if none, or only an internal staff member, was mentioned.",
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
      "extractedContact",
    ],
    additionalProperties: false,
  },
};

interface ToolResult extends SopDocumentContent {
  extractedContact: { name: string; phone: string; role: string };
}

function isToolResult(value: unknown): value is ToolResult {
  if (!isSopDocumentContent(value)) return false;
  const v = value as unknown as Record<string, unknown>;
  const ec = v.extractedContact;
  return typeof ec === "object" && ec !== null && typeof (ec as Record<string, unknown>).name === "string";
}

export async function curateSopDocumentFromIntake(
  topicLabel: string,
  venueName: string,
  answers: IntakeAnswerForCuration[],
): Promise<CurateSopDocumentResult> {
  const transcriptBlock = answers
    .map((a) => {
      const attachment = a.attachmentExtractedText ? `\nAttached material: ${a.attachmentExtractedText}` : "";
      return `Q (${a.questionType}): ${a.prompt}\nA: ${a.answerText?.trim() || "(no answer given)"}${attachment}`;
    })
    .join("\n\n");

  const client = createAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: `Venue: ${venueName}\nTopic: ${topicLabel}\n\nInterview transcript:\n\n${transcriptBlock}` },
    ],
    messages: [{ role: "user", content: "Produce the SOP document for this topic." }],
    tools: [curateDocumentTool],
    tool_choice: { type: "tool", name: "produce_sop_document_from_intake" },
    output_config: { effort: "high" },
  });

  const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUseBlock || !isToolResult(toolUseBlock.input)) {
    throw new Error("Model did not return the expected SOP document structure.");
  }

  const { extractedContact, ...content } = toolUseBlock.input;
  return {
    content,
    extractedContact: extractedContact.name.trim() ? { name: extractedContact.name.trim(), phone: extractedContact.phone.trim() || null, role: extractedContact.role.trim() || null } : null,
  };
}
