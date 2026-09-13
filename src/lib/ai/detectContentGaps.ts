// No `server-only` guard -- same reasoning as anthropic.ts and the other
// AI modules: needs to stay importable from a standalone tsx/node script
// for headless testing (this one specifically, since it has no live
// production caller yet -- see the module doc comment below).

import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "./anthropic";

const MODEL = "claude-sonnet-5";

export type CoverageLevel = "covered" | "partial" | "missing";
export type GapMechanism = "none" | "standard_fill" | "owner_question" | "recommendation";

export interface ChecklistSubProcedure {
  key: string;
  label: string;
  why_it_matters: string;
  default_mechanism: "standard_fill" | "owner_question" | "recommendation";
}

export interface TopicChecklist {
  topic_key: string;
  title: string;
  sub_procedures: ChecklistSubProcedure[];
  version: number;
}

export interface GapFinding {
  subProcedureKey: string;
  standardCoverage: CoverageLevel;
  venueSpecificCoverage: CoverageLevel;
  evidenceQuote: string | null;
  recommendedAction: string;
  recommendedMechanism: GapMechanism;
}

const findGapsTool: Anthropic.Tool = {
  name: "report_topic_gaps",
  description:
    "For each sub-procedure in the checklist, report whether the standard/general knowledge and the venue-specific detail are each covered, partial, or missing in the supplied material.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sub_procedure_key: { type: "string", description: "Must exactly match one of the checklist's sub-procedure keys." },
            standard_coverage: {
              type: "string",
              enum: ["covered", "partial", "missing"],
              description: "Is the general/compliance-grounded knowledge for this sub-procedure present in the material, regardless of venue detail?",
            },
            venue_specific_coverage: {
              type: "string",
              enum: ["covered", "partial", "missing"],
              description: "Is there actual detail about how THIS venue does it (not generic boilerplate) present in the material?",
            },
            evidence_quote: {
              type: "string",
              description: "A short quote or close paraphrase from the material supporting the verdict. Empty string if nothing in the material addresses this sub-procedure at all.",
            },
            recommended_action: {
              type: "string",
              description:
                "If standard_coverage is missing or partial and this item is normally standard-fillable: draft 2-4 sentences of real, generically-correct standard content for this sub-procedure. If venue_specific_coverage is missing or partial: write the actual follow-up question to ask the owner. If both axes are covered: a one-sentence confirmation of why it passes.",
            },
          },
          required: ["sub_procedure_key", "standard_coverage", "venue_specific_coverage", "evidence_quote", "recommended_action"],
          additionalProperties: false,
        },
      },
    },
    required: ["findings"],
    additionalProperties: false,
  },
};

interface RawFinding {
  sub_procedure_key: string;
  standard_coverage: CoverageLevel;
  venue_specific_coverage: CoverageLevel;
  evidence_quote: string;
  recommended_action: string;
}

function isRawFinding(v: unknown): v is RawFinding {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.sub_procedure_key === "string" &&
    typeof r.standard_coverage === "string" &&
    typeof r.venue_specific_coverage === "string" &&
    typeof r.evidence_quote === "string" &&
    typeof r.recommended_action === "string"
  );
}

/**
 * Decides which of the three mechanisms actually applies, from the
 * checklist item's pre-authored nature (see topic_gap_checklists.
 * sub_procedures comment) plus this run's two coverage verdicts -- not
 * something the model itself is asked to decide, per the Decision Log
 * correction that mechanism selection shouldn't be re-guessed fresh every
 * run. A `partial` verdict on the relevant axis always resolves to
 * "recommendation" rather than silently treated as done -- the safer
 * default the correction explicitly called for.
 */
function resolveMechanism(item: ChecklistSubProcedure, standard: CoverageLevel, venueSpecific: CoverageLevel): GapMechanism {
  const relevant = item.default_mechanism === "owner_question" ? venueSpecific : standard;
  if (relevant === "covered") return "none";
  if (relevant === "partial") return "recommendation";
  return item.default_mechanism;
}

/**
 * The Gap-Recognition Agent (Decision Log, 14 Sep 2026 correction): a
 * standing pipeline step, run against every module for every venue, always
 * -- not a one-off check. Runs per (venue, topic), grounded in a versioned
 * reference checklist rather than a word-count/coverage-floor heuristic.
 *
 * `material` is either the venue's raw pre-draft intake answers (the real
 * hookup point for new content going through the live Block T/U intake
 * flow) or the module's current drafted content (the fallback for
 * re-checking already-seeded/legacy modules with no sop_intake_answers on
 * file -- e.g. every venue seeded before this agent existed). Both are
 * valid inputs; which one was actually used is recorded by the caller
 * alongside this function's output, not decided here.
 *
 * No live production caller exists yet -- this is the mechanism itself,
 * exercised for real by scripts/run-gap-recognition-two-fires.mjs against
 * Two Fires' actual seeded content. Wiring it into the live intake pipeline
 * (SopInterview) is a separate integration step.
 */
export async function detectContentGaps(checklist: TopicChecklist, material: string): Promise<GapFinding[]> {
  const client = createAnthropicClient();

  const checklistText = checklist.sub_procedures
    .map((sp) => `- ${sp.key}: ${sp.label} (${sp.why_it_matters})`)
    .join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system:
      "You are a gap-recognition agent for a hospitality staff training system. You check real captured venue material against a fixed reference checklist for one topic -- your job is to find what's genuinely missing or underdeveloped, not to judge writing quality or length. A long section that never actually addresses a sub-procedure is still a gap; a short section that clearly addresses one is not. Evaluate every checklist item independently, even ones the material seems to ignore entirely.",
    messages: [
      {
        role: "user",
        content: `Topic: ${checklist.title}\n\nChecklist (evaluate every item):\n${checklistText}\n\nMaterial to check against the checklist:\n"""\n${material}\n"""`,
      },
    ],
    tools: [findGapsTool],
    tool_choice: { type: "tool", name: "report_topic_gaps" },
    output_config: { effort: "high" },
  });

  const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUseBlock) throw new Error("Model did not return the expected structured response.");
  const input = toolUseBlock.input as { findings: unknown[] };
  if (!Array.isArray(input.findings)) throw new Error("Model did not return the expected structured response.");

  const byKey = new Map(checklist.sub_procedures.map((sp) => [sp.key, sp]));
  const findings: GapFinding[] = [];
  for (const raw of input.findings) {
    if (!isRawFinding(raw)) continue;
    const item = byKey.get(raw.sub_procedure_key);
    if (!item) continue; // model hallucinated a key not on the checklist -- drop it rather than trust it
    findings.push({
      subProcedureKey: raw.sub_procedure_key,
      standardCoverage: raw.standard_coverage,
      venueSpecificCoverage: raw.venue_specific_coverage,
      evidenceQuote: raw.evidence_quote || null,
      recommendedAction: raw.recommended_action,
      recommendedMechanism: resolveMechanism(item, raw.standard_coverage, raw.venue_specific_coverage),
    });
  }
  return findings;
}
