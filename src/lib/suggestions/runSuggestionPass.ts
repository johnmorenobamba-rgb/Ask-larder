import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { resolveThresholds, type ThresholdOverride } from "./thresholds";
import { detectRepeatedGaps } from "./detectRepeatedGaps";
import { detectEscalationPatterns } from "./detectEscalationPatterns";
import { detectNearMissPatterns } from "./detectNearMissPatterns";
import { generateSuggestion, type CandidateModule } from "./generateSuggestion";

export interface SuggestionPassSummary {
  created: number;
  skippedDuplicate: number;
  skippedNoModuleMatch: number;
  skippedCredential: number;
}

type SignalType = "repeated_gap" | "escalation_pattern" | "near_miss_pattern";

interface EvidencePayload {
  clusterReasoning: string;
  sourceIds: string[];
  items: { text: string; staffName: string; stationName?: string | null; at: string }[];
  distinctStaffCount?: number;
  fitReasoning?: string;
}

// Same pattern already exists (pending or dismissed) if the new candidate's
// source rows substantially overlap an existing suggestion's -- a
// dismissed pattern must not regenerate identically next cycle (Part 4
// requirement), and a pending one shouldn't be duplicated by a same-day
// rerun either. min-based ratio so it's robust whether the new cluster is
// a subset or superset of the existing evidence (new reports accumulating
// slowly against an old dismissed pattern shouldn't dodge this by drifting
// just far enough to look "different").
function overlapsExisting(newSourceIds: string[], existingSourceIds: string[]): boolean {
  if (newSourceIds.length === 0 || existingSourceIds.length === 0) return false;
  const existingSet = new Set(existingSourceIds);
  const intersection = newSourceIds.filter((id) => existingSet.has(id)).length;
  const ratio = intersection / Math.min(newSourceIds.length, existingSourceIds.length);
  return ratio >= 0.5;
}

export async function runSuggestionPass(supabase: SupabaseClient<Database>, venueId: string): Promise<SuggestionPassSummary> {
  const summary: SuggestionPassSummary = { created: 0, skippedDuplicate: 0, skippedNoModuleMatch: 0, skippedCredential: 0 };

  const [{ data: staffRows }, { data: venueRow }, { data: moduleRows }, { data: existingSuggestions }] = await Promise.all([
    supabase.from("app_users").select("id").eq("venue_id", venueId).eq("role", "staff").is("deactivated_at", null),
    supabase.from("venues").select("content_suggestion_thresholds").eq("id", venueId).maybeSingle(),
    supabase.from("modules").select("id, title, topic_key").eq("venue_id", venueId).eq("status", "live"),
    supabase
      .from("content_suggestions")
      .select("signal_type, evidence")
      .eq("venue_id", venueId)
      .in("status", ["pending", "dismissed"]),
  ]);

  const activeStaffCount = staffRows?.length ?? 0;
  const thresholds = resolveThresholds(activeStaffCount, venueRow?.content_suggestion_thresholds as ThresholdOverride | null);
  const candidateModules: CandidateModule[] = (moduleRows ?? []).map((m) => ({ id: m.id, title: m.title, topicKey: m.topic_key }));

  const existingBySignal = new Map<SignalType, string[][]>();
  for (const row of existingSuggestions ?? []) {
    const evidence = row.evidence as unknown as EvidencePayload;
    const signalType = row.signal_type as SignalType;
    const list = existingBySignal.get(signalType) ?? [];
    list.push(evidence?.sourceIds ?? []);
    existingBySignal.set(signalType, list);
  }
  function isDuplicate(signalType: SignalType, sourceIds: string[]): boolean {
    return (existingBySignal.get(signalType) ?? []).some((existingIds) => overlapsExisting(sourceIds, existingIds));
  }

  const [repeatedGaps, escalationPatterns, nearMissPatterns] = await Promise.all([
    detectRepeatedGaps(supabase, venueId, thresholds.repeatedGapDistinctStaff),
    detectEscalationPatterns(supabase, venueId, thresholds.escalationMinCount),
    detectNearMissPatterns(supabase, venueId, thresholds.nearMissMinCount),
  ]);

  async function handleCandidate(
    signalType: SignalType,
    topicLabel: string,
    clusterReasoning: string,
    sourceIds: string[],
    evidenceItems: { text: string; staffName: string; stationName?: string | null; at: string }[],
    extra: { distinctStaffCount?: number },
    headline: string,
  ) {
    if (isDuplicate(signalType, sourceIds)) {
      summary.skippedDuplicate += 1;
      return;
    }

    const evidenceText = evidenceItems.map((it) => `- ${it.staffName}${it.stationName ? ` (${it.stationName})` : ""}: "${it.text}"`).join("\n");
    const draft = await generateSuggestion(topicLabel, clusterReasoning, evidenceText, candidateModules);

    const evidence: EvidencePayload = {
      clusterReasoning,
      sourceIds,
      items: evidenceItems,
      distinctStaffCount: extra.distinctStaffCount,
      fitReasoning: draft.fitReasoning,
    };

    const reasoning = `${headline}. ${draft.fitReasoning}`;

    const { error } = await supabase.from("content_suggestions").insert({
      venue_id: venueId,
      signal_type: signalType,
      status: "pending",
      evidence: evidence as unknown as Database["public"]["Tables"]["content_suggestions"]["Insert"]["evidence"],
      headline,
      reasoning,
      target_module_id: draft.targetModuleId,
      proposed_topic_key: draft.proposedTopicKey,
      proposed_content: draft.proposedContent,
      blocked_reason: draft.blockedReason,
    });
    if (error) {
      console.error("runSuggestionPass insert error:", error);
      return;
    }

    summary.created += 1;
    if (draft.blockedReason === "credential_reference") summary.skippedCredential += 1;
    if (draft.blockedReason === "no_target_module") summary.skippedNoModuleMatch += 1;
  }

  for (const c of repeatedGaps) {
    const headline = `${c.distinctStaffCount} staff asked about ${c.topicLabel.toLowerCase()} this month, not covered by any SOP`;
    await handleCandidate(
      "repeated_gap",
      c.topicLabel,
      c.clusterReasoning,
      c.memberSourceIds,
      c.evidenceQuestions.map((q) => ({ text: q.text, staffName: q.staffName, at: q.askedAt })),
      { distinctStaffCount: c.distinctStaffCount },
      headline,
    );
  }

  for (const c of escalationPatterns) {
    const headline = `${c.itemCount} escalations this quarter mention ${c.topicLabel.toLowerCase()}`;
    await handleCandidate(
      "escalation_pattern",
      c.topicLabel,
      c.clusterReasoning,
      c.memberSourceIds,
      c.evidenceItems.map((q) => ({ text: q.text, staffName: q.staffName, stationName: q.stationName, at: q.askedAt })),
      {},
      headline,
    );
  }

  for (const c of nearMissPatterns) {
    const headline = `${c.itemCount} near-miss reports this quarter mention ${c.topicLabel.toLowerCase()}`;
    await handleCandidate(
      "near_miss_pattern",
      c.topicLabel,
      c.clusterReasoning,
      c.memberSourceIds,
      c.evidenceItems.map((q) => ({ text: q.text, staffName: q.staffName, stationName: q.stationName, at: q.reportedAt })),
      {},
      headline,
    );
  }

  return summary;
}
