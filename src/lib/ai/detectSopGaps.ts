import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import type { SopQuestionDef } from "@/lib/onboarding/sopQuestions";

const MODEL = "claude-sonnet-5";

export interface SopGapResult {
  questionKey: string;
  covered: boolean;
  extractedAnswer: string | null;
}

// Block U2 -- the missing piece that makes upload-first intake real: given a
// venue's own uploaded document for one topic, decide which of the topic's
// questions it already answers well enough to use directly, versus which
// are genuine gaps the specialist still needs to answer. Deliberately
// conservative -- a false "covered" here silently skips a real gap, which
// is the one failure mode this whole feature exists to prevent, so vague
// or partial mentions must be marked not-covered rather than guessed at.
const SYSTEM_PROMPT = `You review a hospitality venue's own uploaded document (a written SOP, a printed sheet, notes) against a fixed list of questions our intake process needs answered for one training topic.

For each question, decide: does this document already answer it clearly and specifically enough to use directly, without guessing or filling gaps yourself? If yes, extract that answer in the document's own words, lightly cleaned up (fix obvious typos, don't rephrase the substance, don't add anything the document doesn't actually say). If the document is silent on a question, only mentions it vaguely in passing, or only partially addresses it, mark it NOT covered -- we would rather ask the specialist a question that's already half-answered than silently accept a thin or ambiguous mention as if it were complete.

Never invent or infer an answer that isn't actually stated in the document. A document being long or detailed about OTHER topics doesn't make it "covered" for a question it never actually addresses.`;

const detectGapsTool: Anthropic.Tool = {
  name: "detect_sop_gaps",
  description: "Return coverage for every question against the uploaded document.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            questionKey: { type: "string" },
            covered: { type: "boolean" },
            extractedAnswer: {
              type: "string",
              description: "The answer extracted from the document, in its own words. Empty string if not covered.",
            },
          },
          required: ["questionKey", "covered", "extractedAnswer"],
          additionalProperties: false,
        },
      },
    },
    required: ["results"],
    additionalProperties: false,
  },
};

function isGapResults(value: unknown): value is { results: { questionKey: string; covered: boolean; extractedAnswer: string }[] } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.results) &&
    v.results.every(
      (r) =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as Record<string, unknown>).questionKey === "string" &&
        typeof (r as Record<string, unknown>).covered === "boolean" &&
        typeof (r as Record<string, unknown>).extractedAnswer === "string",
    )
  );
}

export async function detectSopGaps(
  topicLabel: string,
  rawDocumentContent: string,
  questions: SopQuestionDef[],
): Promise<SopGapResult[]> {
  const questionsBlock = questions.map((q) => `- ${q.key}: ${q.prompt}`).join("\n");

  const client = createAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: `Topic: ${topicLabel}\n\nQuestions to check coverage for:\n${questionsBlock}\n\nUploaded document content:\n\n${rawDocumentContent}`,
      },
    ],
    messages: [{ role: "user", content: "Check coverage for every question listed above." }],
    tools: [detectGapsTool],
    tool_choice: { type: "tool", name: "detect_sop_gaps" },
    output_config: { effort: "high" },
  });

  const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  const validKeys = new Set(questions.map((q) => q.key));
  if (!toolUseBlock || !isGapResults(toolUseBlock.input)) {
    // Fail safe: if the model didn't return a usable structure, treat
    // everything as a gap rather than silently skipping questions.
    return questions.map((q) => ({ questionKey: q.key, covered: false, extractedAnswer: null }));
  }

  const byKey = new Map(toolUseBlock.input.results.filter((r) => validKeys.has(r.questionKey)).map((r) => [r.questionKey, r]));
  return questions.map((q) => {
    const r = byKey.get(q.key);
    if (!r) return { questionKey: q.key, covered: false, extractedAnswer: null };
    return { questionKey: q.key, covered: r.covered, extractedAnswer: r.covered ? r.extractedAnswer : null };
  });
}
