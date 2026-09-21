import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient } from "@/lib/ai/anthropic";

const MODEL = "claude-sonnet-5";

export interface ClusterableItem {
  id: string;
  text: string;
}

export interface ReportCluster {
  topicLabel: string;
  topicKey: string;
  memberIds: string[];
  reasoning: string;
}

const clusterTool: Anthropic.Tool = {
  name: "report_clusters",
  description:
    "Group the supplied items into real, distinct topics based on what they're actually about, not superficial wording overlap. An item belongs to at most one cluster. Leave genuinely unrelated items out of every cluster rather than forcing them in.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      clusters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic_label: { type: "string", description: "A short, plain-language label for this topic, e.g. 'Corked wine complaints'." },
            topic_key: { type: "string", description: "A lowercase_snake_case slug for this topic, e.g. 'corked_wine_complaints'." },
            member_ids: {
              type: "array",
              items: { type: "string" },
              description: "The ids (exactly as given) of every item that genuinely belongs to this topic.",
            },
            reasoning: {
              type: "string",
              description: "One or two plain sentences: why these specific items were grouped together. This is shown directly to the venue owner as evidence, so name the actual shared subject, not a vague summary.",
            },
          },
          required: ["topic_label", "topic_key", "member_ids", "reasoning"],
          additionalProperties: false,
        },
      },
    },
    required: ["clusters"],
    additionalProperties: false,
  },
};

interface RawCluster {
  topic_label: string;
  topic_key: string;
  member_ids: string[];
  reasoning: string;
}

function isRawClusters(value: unknown): value is { clusters: RawCluster[] } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.clusters) &&
    v.clusters.every(
      (c) =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as Record<string, unknown>).topic_label === "string" &&
        typeof (c as Record<string, unknown>).topic_key === "string" &&
        Array.isArray((c as Record<string, unknown>).member_ids) &&
        typeof (c as Record<string, unknown>).reasoning === "string",
    )
  );
}

/**
 * Suggestion assistant (John's review, 21 Sep 2026): escalations and
 * near-misses are free text with far too much phrasing variance for exact-
 * match grouping to catch a real pattern -- "what's the safe code" and "how
 * do I get into the safe" share almost no keywords. This is a real
 * classification pass, not a heuristic, and every cluster's reasoning is
 * persisted verbatim into content_suggestions.evidence so a bad grouping is
 * visible and correctable in the UI rather than a hidden judgment call
 * baked into a count.
 *
 * Applied to all three signal sources uniformly (including repeated_gap,
 * which the weekly digest itself only ever grouped by exact question text)
 * -- out-of-scope questions have the identical variance problem, and
 * leaving one of three sources on naive exact-match would be a real
 * inconsistency, not a narrower reading of what was actually asked for.
 *
 * Returns only clusters the model actually formed; items it left ungrouped
 * are simply absent from every cluster's member_ids, exactly per the tool's
 * own instruction not to force unrelated items together.
 */
export async function clusterReports(items: ClusterableItem[]): Promise<ReportCluster[]> {
  if (items.length === 0) return [];

  const client = createAnthropicClient();
  const itemsBlock = items.map((it) => `[${it.id}] ${it.text}`).join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system:
      "You group short, real reports from hospitality venue staff (chatbot questions, supervisor escalations, or near-miss safety reports) into genuine topic clusters. Judge by actual subject matter, not shared words -- 'what's the code for the safe' and 'how do I get into the safe when it's locked' are the same topic; 'what's the code for the safe' and 'what's the wifi code' are not, despite sharing the word 'code'. Only form a cluster when multiple items are genuinely about the same real thing. A single unrelated item should simply not appear in any cluster.",
    messages: [
      {
        role: "user",
        content: `Items to cluster (id in brackets, then the text):\n${itemsBlock}`,
      },
    ],
    tools: [clusterTool],
    tool_choice: { type: "tool", name: "report_clusters" },
    output_config: { effort: "medium" },
  });

  const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUseBlock || !isRawClusters(toolUseBlock.input)) return [];

  const validIds = new Set(items.map((it) => it.id));
  return toolUseBlock.input.clusters
    .map((c) => ({
      topicLabel: c.topic_label,
      topicKey: c.topic_key,
      memberIds: c.member_ids.filter((id) => validIds.has(id)),
      reasoning: c.reasoning,
    }))
    .filter((c) => c.memberIds.length > 0);
}
