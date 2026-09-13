// Block T1 -- the rule-based pass of SOP topic determination. Pure and
// framework-free (same convention as steps.ts) so it's importable from both
// the server-only AI pass (sopTopicDetermination.ts) and, if useful later,
// a client-side preview.
//
// This deliberately does not duplicate PART_B_TOPICS.appliesWhen -- that
// list of predicates already encodes every clear rule-based signal this
// project has ("no licence -> skip RSA", "no kitchen -> skip food safety",
// "EGM flagged -> surface gaming module"). Promoting its boolean result
// into a real decision object (instead of a UI-dimming hint) is the whole
// job of this module.
import { PART_B_TOPICS, type PartBTopicFlags } from "./constants";

export interface TopicRuleDecision {
  topicKey: string;
  applicable: boolean;
  confidence: "high";
  source: "rule";
  rationale: string;
}

// stationNames is accepted for forward compatibility with the AI pass
// (sopTopicDetermination.ts also considers equipment names, which the rule
// layer can't reliably pattern-match -- station.name is free text a
// founder types once, no category/type field exists) but isn't used by any
// rule yet; every current PART_B_TOPICS predicate keys off wizard flags
// alone.
export function applyTopicRules(flags: PartBTopicFlags, stationNames: string[] = []): TopicRuleDecision[] {
  void stationNames;
  return PART_B_TOPICS.map((topic) => {
    const applicable = topic.appliesWhen ? topic.appliesWhen(flags) : true;
    return {
      topicKey: topic.key,
      applicable,
      confidence: "high",
      source: "rule",
      rationale: topic.appliesWhen
        ? applicable
          ? "Matches this venue's collected wizard answers."
          : "This venue's wizard answers indicate this topic doesn't apply."
        : "Applies to every venue regardless of type.",
    };
  });
}
