// No `server-only` guard: this must stay importable both by a Next.js API
// route and a standalone Node/tsx script for headless testing (T6's
// determination test across multiple venue profiles), matching
// ingestModule.ts's own precedent -- `server-only` throws unconditionally
// outside Next's bundler, since it relies on webpack/Next module aliasing,
// not a runtime environment check.
import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { PART_B_TOPICS, type PartBTopicFlags } from "@/lib/onboarding/constants";
import { applyTopicRules } from "@/lib/onboarding/sopTopicRules";

const MODEL = "claude-sonnet-5";

const TOPIC_KEYS = PART_B_TOPICS.map((t) => t.key);

// Block T1 -- the rule pass (sopTopicRules.ts) already resolves every topic
// that has a real appliesWhen predicate against wizard flags. What's left,
// and what this AI pass exists for, is exactly the gap Block T's own brief
// names: catching what rules would miss -- unusual equipment, or a named
// risk that doesn't map cleanly to a fixed topic. It is deliberately not
// asked to invent topics outside PART_B_TOPICS's fixed 16 -- every
// downstream piece (the question scaffold, module generation, sop_documents)
// is keyed against that closed list -- so an unusual signal gets surfaced
// as a low-confidence flag on the closest existing topic instead, for a
// human to resolve with one tap, never silently applied or dropped.
const SYSTEM_PROMPT = `You review which staff training topics a hospitality venue actually needs, for an Australian pub/bar/cafe/restaurant onboarding tool.

You're given a fixed rule pass's decisions (high confidence, based on this venue's own wizard answers -- licensing, food service level, crowd control, gaming machines) and the venue's full collected profile. Your job is not to redo the rule pass's work -- trust it unless the profile actively contradicts it. Your real job is to catch what a fixed rule can't: an unusual piece of equipment, a named risk, or a detail in the venue's own contacts/roles/promotions that suggests a topic which defaulted to "applies to every venue" (no rule predicate at all) may or may not genuinely apply to THIS venue.

For every one of the 16 fixed topics, return a decision. If you have no real basis to disagree with or refine the rule pass's call, return it unchanged with confidence "high". Only mark confidence "low" when the profile gives you an actual, explainable reason to think the rule pass's default might be wrong for this specific venue -- never guess, and never invent a reason that isn't grounded in the profile you were given.

Never silently drop a topic a rule might have gotten wrong, and never silently add one that isn't warranted -- a "low" confidence call is a flag for a human to confirm with one tap, not a decision you're making unilaterally. Write each rationale in plain language a founder can read in one glance and immediately understand why you flagged it.`;

const determineTool: Anthropic.Tool = {
  name: "determine_sop_topics",
  description: "Return a decision for every one of the 16 fixed SOP topics.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      topics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topicKey: { type: "string", enum: TOPIC_KEYS },
            applicable: { type: "boolean" },
            confidence: { type: "string", enum: ["high", "low"] },
            rationale: {
              type: "string",
              description: "One or two plain sentences a founder can read at a glance.",
            },
          },
          required: ["topicKey", "applicable", "confidence", "rationale"],
          additionalProperties: false,
        },
      },
    },
    required: ["topics"],
    additionalProperties: false,
  },
};

interface AiTopicDecision {
  topicKey: string;
  applicable: boolean;
  confidence: "high" | "low";
  rationale: string;
}

function isAiTopicDecisions(value: unknown): value is { topics: AiTopicDecision[] } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.topics) &&
    v.topics.every(
      (t) =>
        typeof t === "object" &&
        t !== null &&
        typeof (t as Record<string, unknown>).topicKey === "string" &&
        typeof (t as Record<string, unknown>).applicable === "boolean" &&
        ((t as Record<string, unknown>).confidence === "high" || (t as Record<string, unknown>).confidence === "low") &&
        typeof (t as Record<string, unknown>).rationale === "string",
    )
  );
}

export interface SopTopicDecisionRow {
  topicKey: string;
  applicable: boolean;
  confidence: "high" | "low";
  source: "rule" | "ai";
  rationale: string;
}

/**
 * Gathers this venue's full profile, runs the rule pass, then asks Claude to
 * sanity-check and catch what the rules can't -- then upserts the result
 * into sop_topic_decisions. Callable repeatedly (idempotent upsert on
 * (venue_id, topic_key)) -- content-intake re-runs this whenever it finds no
 * rows yet, and the wizard exposes a manual "Re-check what's needed" action
 * for when an upstream answer changes after the fact.
 */
export async function determineSopTopics(
  venueId: string,
  supabase: SupabaseClient<Database>,
): Promise<SopTopicDecisionRow[]> {
  const [{ data: session }, { data: licenceProfile }, { data: keyRoles }, { data: contacts }, { data: promotions }, { data: stations }] =
    await Promise.all([
      supabase.from("wizard_sessions").select("venue_type_flags").eq("venue_id", venueId).maybeSingle(),
      supabase.from("venue_licence_profile").select("*").eq("venue_id", venueId).maybeSingle(),
      supabase.from("venue_key_roles").select("role_type, name").eq("venue_id", venueId),
      supabase.from("venue_contacts").select("contact_type, name, notes").eq("venue_id", venueId),
      supabase.from("venue_promotions").select("day_of_week, description").eq("venue_id", venueId),
      supabase.from("stations").select("name").eq("venue_id", venueId),
    ]);

  const flags = (session?.venue_type_flags as PartBTopicFlags | null) ?? {};
  const stationNames = (stations ?? []).map((s) => s.name).filter(Boolean);
  const ruleDecisions = applyTopicRules(flags, stationNames);

  const profileBlock = JSON.stringify(
    {
      wizardFlags: flags,
      licenceProfile: licenceProfile ?? null,
      keyRoles: keyRoles ?? [],
      contacts: contacts ?? [],
      promotions: promotions ?? [],
      equipment: stationNames,
      ruleDecisions: ruleDecisions.map((d) => ({ topicKey: d.topicKey, applicable: d.applicable, rationale: d.rationale })),
    },
    null,
    2,
  );

  const client = createAnthropicClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: `Venue profile and rule pass decisions:\n\n${profileBlock}` },
    ],
    messages: [{ role: "user", content: "Review every topic and return your decisions." }],
    tools: [determineTool],
    tool_choice: { type: "tool", name: "determine_sop_topics" },
    output_config: { effort: "high" },
  });

  const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  const aiByKey = new Map<string, AiTopicDecision>();
  if (toolUseBlock && isAiTopicDecisions(toolUseBlock.input)) {
    for (const t of toolUseBlock.input.topics) {
      if (TOPIC_KEYS.includes(t.topicKey)) aiByKey.set(t.topicKey, t);
    }
  }

  // AI decisions only ever refine a rule call that had no real predicate to
  // begin with (source stays "rule" for every topic sopTopicRules.ts could
  // actually resolve from a wizard flag) -- if the model failed to return a
  // usable decision for a topic, the rule pass's own default is kept rather
  // than dropping the topic silently.
  const finalDecisions: SopTopicDecisionRow[] = ruleDecisions.map((rule) => {
    const topic = PART_B_TOPICS.find((t) => t.key === rule.topicKey);
    const hadRealRule = Boolean(topic?.appliesWhen);
    const ai = aiByKey.get(rule.topicKey);
    if (hadRealRule || !ai) {
      return { topicKey: rule.topicKey, applicable: rule.applicable, confidence: "high", source: "rule", rationale: rule.rationale };
    }
    return { topicKey: rule.topicKey, applicable: ai.applicable, confidence: ai.confidence, source: "ai", rationale: ai.rationale };
  });

  const { error } = await supabase.from("sop_topic_decisions").upsert(
    finalDecisions.map((d) => ({
      venue_id: venueId,
      topic_key: d.topicKey,
      applicable: d.applicable,
      confidence: d.confidence,
      source: d.source,
      rationale: d.rationale,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "venue_id,topic_key" },
  );
  if (error) throw new Error(error.message);

  return finalDecisions;
}
