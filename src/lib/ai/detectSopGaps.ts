import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import type { SopQuestionDef } from "@/lib/onboarding/sopQuestions";
import { checkVerbatimOverlap } from "@/lib/ai/verbatimOverlapCheck";

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

// -----------------------------------------------------------------------
// Structural coverage pass (fix for reference-style documents, Decision
// Log 14 Sep 2026): detectSopGaps above only ever accepts an answer the
// document already states narratively, "in the document's own words" --
// correct behavior for a venue's own written SOP, but it means a genuinely
// relevant reference-style document (a hazard -> control-measures bullet
// list, the shape of most government/regulatory safety guidance) comes
// back with zero coverage even when real, specific, usable content is
// present. Confirmed empirically against a real Safe Work Australia page:
// strict verbatim extraction found nothing; the broader two-axis
// Gap-Recognition Agent (detectContentGaps.ts) found real partial signal in
// the same text.
//
// This is that same "does real relevant structural content exist, even if
// not phrased as a direct answer" judgment, applied per not-yet-covered
// question, as a second pass -- not a replacement for the strict pass, and
// not a loosening of "never fabricate": it must still ground every
// extracted answer in a real quoted excerpt, and the synthesized answer is
// then run through checkVerbatimOverlap so "found real signal" can never
// quietly become "copied the bullet list wholesale."

export interface StructuralGapResult {
  questionKey: string;
  covered: boolean;
  synthesizedAnswer: string | null;
  evidenceQuote: string | null;
}

const structuralGapsTool: Anthropic.Tool = {
  name: "detect_structural_coverage",
  description: "For each question, decide whether the document contains real, specific, structural content addressing it, even if not phrased as a direct narrative answer.",
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
            covered: {
              type: "boolean",
              description: "True only if the document contains real, specific content on this exact question's subject -- not a vague or tangential mention.",
            },
            evidence_quote: {
              type: "string",
              description: "A real, short quoted excerpt from the document that this answer is grounded in. Required whenever covered is true. Empty string if not covered.",
            },
            synthesized_answer: {
              type: "string",
              description: "A genuine rewrite (not a copy) of the document's relevant content, in plain onboarding-interview voice, answering the question using only what the document actually supports. Empty string if not covered.",
            },
          },
          required: ["questionKey", "covered", "evidence_quote", "synthesized_answer"],
          additionalProperties: false,
        },
      },
    },
    required: ["results"],
    additionalProperties: false,
  },
};

interface RawStructuralResult {
  questionKey: string;
  covered: boolean;
  evidence_quote: string;
  synthesized_answer: string;
}

function isStructuralResults(value: unknown): value is { results: RawStructuralResult[] } {
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
        typeof (r as Record<string, unknown>).evidence_quote === "string" &&
        typeof (r as Record<string, unknown>).synthesized_answer === "string",
    )
  );
}

async function detectStructuralCoverage(
  topicLabel: string,
  rawDocumentContent: string,
  questions: SopQuestionDef[],
): Promise<StructuralGapResult[]> {
  if (questions.length === 0) return [];
  const questionsBlock = questions.map((q) => `- ${q.key}: ${q.prompt}`).join("\n");

  const client = createAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: `You review a document against a fixed list of intake questions for one hospitality training topic. This document did NOT already contain a direct narrative answer to these questions -- it may instead be organized as reference material: a hazard list, a table of control measures, a checklist, a regulatory guidance page. Your job is different from a narrative-answer check: decide whether the document contains real, specific, substantive content on each question's actual subject, even though it isn't phrased as an answer. If it does, synthesize a genuine answer from that real content, in plain onboarding-interview voice -- rewritten, never copied -- and quote a real short excerpt as your evidence. If the document is silent, vague, or only tangentially related on a question, mark it not covered. Never invent detail the document doesn't actually support, and never treat "the document is long and detailed about other things" as coverage for a question it doesn't actually address.`,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: `Topic: ${topicLabel}\n\nQuestions still needing coverage:\n${questionsBlock}\n\nDocument content:\n\n${rawDocumentContent}`,
      },
    ],
    messages: [{ role: "user", content: "Check structural coverage for every question listed above." }],
    tools: [structuralGapsTool],
    tool_choice: { type: "tool", name: "detect_structural_coverage" },
    output_config: { effort: "high" },
  });

  const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  const validKeys = new Set(questions.map((q) => q.key));
  if (!toolUseBlock || !isStructuralResults(toolUseBlock.input)) {
    return questions.map((q) => ({ questionKey: q.key, covered: false, synthesizedAnswer: null, evidenceQuote: null }));
  }

  const byKey = new Map(toolUseBlock.input.results.filter((r) => validKeys.has(r.questionKey)).map((r) => [r.questionKey, r]));
  return questions.map((q) => {
    const r = byKey.get(q.key);
    if (!r || !r.covered || !r.synthesized_answer.trim() || !r.evidence_quote.trim()) {
      return { questionKey: q.key, covered: false, synthesizedAnswer: null, evidenceQuote: null };
    }
    // The mechanical safeguard: a real quoted excerpt is required input, but
    // that alone doesn't prove the *synthesized answer* itself is a genuine
    // rewrite rather than a restatement close enough to count as copied.
    const overlap = checkVerbatimOverlap(r.synthesized_answer, rawDocumentContent);
    if (overlap.flagged) {
      return { questionKey: q.key, covered: false, synthesizedAnswer: null, evidenceQuote: null };
    }
    return { questionKey: q.key, covered: true, synthesizedAnswer: r.synthesized_answer, evidenceQuote: r.evidence_quote };
  });
}

export type SopGapSource = "document" | "document_inferred";

export interface TwoPassGapResult {
  questionKey: string;
  covered: boolean;
  answerText: string | null;
  source: SopGapSource | null;
  evidenceQuote: string | null;
}

/**
 * The real entry point analyze-document/route.ts should call: runs the
 * strict verbatim pass first (unchanged behavior, answer_source =
 * 'document'), then the structural pass only against whatever's left
 * uncovered (answer_source = 'document_inferred' when it succeeds). A
 * question covered by pass 1 never goes through pass 2 at all.
 */
export async function detectSopGapsTwoPass(
  topicLabel: string,
  rawDocumentContent: string,
  questions: SopQuestionDef[],
): Promise<TwoPassGapResult[]> {
  const pass1 = await detectSopGaps(topicLabel, rawDocumentContent, questions);
  const stillGap = questions.filter((q) => !pass1.find((r) => r.questionKey === q.key)?.covered);

  const pass2 = stillGap.length > 0 ? await detectStructuralCoverage(topicLabel, rawDocumentContent, stillGap) : [];
  const pass2ByKey = new Map(pass2.map((r) => [r.questionKey, r]));

  return pass1.map((r) => {
    if (r.covered) {
      return { questionKey: r.questionKey, covered: true, answerText: r.extractedAnswer, source: "document", evidenceQuote: null };
    }
    const p2 = pass2ByKey.get(r.questionKey);
    if (p2?.covered) {
      return {
        questionKey: r.questionKey,
        covered: true,
        answerText: p2.synthesizedAnswer,
        source: "document_inferred",
        evidenceQuote: p2.evidenceQuote,
      };
    }
    return { questionKey: r.questionKey, covered: false, answerText: null, source: null, evidenceQuote: null };
  });
}
