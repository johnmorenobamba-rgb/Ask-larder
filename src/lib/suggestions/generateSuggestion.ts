import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { moduleContentReferencesCredential } from "@/lib/security/detectUnrestrictedCredentialContent";

const MODEL = "claude-sonnet-5";

export interface CandidateModule {
  id: string;
  title: string;
  topicKey: string | null;
}

export interface SuggestionDraft {
  targetModuleId: string | null;
  proposedTopicKey: string | null;
  proposedContent: string | null;
  blockedReason: "no_target_module" | "credential_reference" | null;
  fitReasoning: string;
}

const draftTool: Anthropic.Tool = {
  name: "draft_suggestion",
  description:
    "Decide whether this topic genuinely belongs inside one of the venue's existing live modules, and if so, draft a short, real addition for it.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      matched_module_id: {
        type: "string",
        description: "The id of the module this topic genuinely belongs inside, exactly as given. Empty string if none of the given modules are a genuine fit -- never force a match.",
      },
      fit_reasoning: {
        type: "string",
        description: "One plain sentence: why this belongs in the matched module, or why none of the given modules are a genuine fit.",
      },
      proposed_content: {
        type: "string",
        description: "2 to 5 sentences of real, specific, actionable SOP content addressing this topic, written in plain direct voice (short sentences, active voice, no filler, no dashes of any kind). Empty string if matched_module_id is empty.",
      },
    },
    required: ["matched_module_id", "fit_reasoning", "proposed_content"],
    additionalProperties: false,
  },
};

function isDraftResult(value: unknown): value is { matched_module_id: string; fit_reasoning: string; proposed_content: string } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.matched_module_id === "string" && typeof v.fit_reasoning === "string" && typeof v.proposed_content === "string";
}

/**
 * Suggestion assistant: given a clustered topic and the venue's own live
 * modules, decides whether this genuinely has a home to be drafted into.
 * CLAUDE.md's "never substitutes for a real onboarding intake" constraint
 * is enforced here structurally, not just in prompt wording -- when nothing
 * matches, blockedReason is set to no_target_module and proposedContent
 * stays null; there is no path where the model can invent venue-specific
 * detail for a topic that was never actually captured.
 *
 * The credential gate runs here too, before this suggestion is ever
 * inserted as a pending row -- reuses moduleContentReferencesCredential(),
 * the exact same function the real module approval gate already uses, not
 * a reimplementation. A flagged draft never becomes a normal suggestion; it
 * becomes blockedReason: 'credential_reference' instead, the same "this
 * needs a real role-restriction decision" framing rather than a silent
 * drop.
 */
export async function generateSuggestion(
  topicLabel: string,
  clusterReasoning: string,
  evidenceText: string,
  candidateModules: CandidateModule[],
): Promise<SuggestionDraft> {
  if (candidateModules.length === 0) {
    return {
      targetModuleId: null,
      proposedTopicKey: null,
      proposedContent: null,
      blockedReason: "no_target_module",
      fitReasoning: "This venue has no live modules yet, so there's nothing to add this to.",
    };
  }

  const client = createAnthropicClient();
  const modulesBlock = candidateModules.map((m) => `[${m.id}] ${m.title}`).join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "You help a hospitality venue owner strengthen their staff training content. You are given a real, evidence-backed topic (repeated staff questions, escalations, or near-miss safety reports) and a list of this venue's own existing live training modules. Decide honestly whether this topic genuinely belongs inside one of those modules. If it does, draft a short, specific, real addition -- never generic filler, never invented venue-specific detail you weren't actually given evidence for. If none of the modules are a genuine fit, say so plainly rather than forcing a match; a topic with nowhere to go is a real content gap, not something to patch into an unrelated module.",
    messages: [
      {
        role: "user",
        content: `Topic: ${topicLabel}\n\nWhy this topic was identified:\n${clusterReasoning}\n\nReal evidence behind it:\n${evidenceText}\n\nThis venue's existing live modules:\n${modulesBlock}`,
      },
    ],
    tools: [draftTool],
    tool_choice: { type: "tool", name: "draft_suggestion" },
    output_config: { effort: "medium" },
  });

  const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUseBlock || !isDraftResult(toolUseBlock.input)) {
    return {
      targetModuleId: null,
      proposedTopicKey: null,
      proposedContent: null,
      blockedReason: "no_target_module",
      fitReasoning: "Couldn't generate a draft for this topic.",
    };
  }

  const { matched_module_id, fit_reasoning, proposed_content } = toolUseBlock.input;
  const matchedModule = candidateModules.find((m) => m.id === matched_module_id);

  if (!matchedModule || !proposed_content.trim()) {
    return {
      targetModuleId: null,
      proposedTopicKey: null,
      proposedContent: null,
      blockedReason: "no_target_module",
      fitReasoning: fit_reasoning || "None of this venue's existing modules are a genuine fit for this topic.",
    };
  }

  // The credential gate, before this ever becomes a pending suggestion --
  // same function the real approve() gate uses, not a reimplementation.
  if (moduleContentReferencesCredential([{ content: proposed_content }])) {
    return {
      targetModuleId: null,
      proposedTopicKey: null,
      proposedContent: null,
      blockedReason: "credential_reference",
      fitReasoning:
        "This looks like it would state a real code, combination, PIN, or credential. That needs a real role-restriction decision from you, not a draft I can safely suggest on its own.",
    };
  }

  return {
    targetModuleId: matchedModule.id,
    proposedTopicKey: matchedModule.topicKey,
    proposedContent: proposed_content,
    blockedReason: null,
    fitReasoning: fit_reasoning,
  };
}
