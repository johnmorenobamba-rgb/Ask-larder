import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { clusterReports } from "./clusterReports";

const WINDOW_DAYS = 30;

export interface RepeatedGapCandidate {
  topicLabel: string;
  topicKey: string;
  clusterReasoning: string;
  memberSourceIds: string[];
  distinctStaffCount: number;
  evidenceQuestions: { text: string; staffName: string; askedAt: string }[];
}

/**
 * Out-of-scope Ask Larder questions -- the real, live signal (chat_messages,
 * same rows the weekly digest already reads), not the dormant gap-
 * recognition agent (topic_gap_reports has zero rows for any real venue;
 * left out of this pass entirely per John's review, 21 Sep 2026).
 *
 * Clustered the same way escalations/near-misses are (a model pass, not
 * exact-text grouping) -- out-of-scope questions have the identical
 * phrasing-variance problem the weekly digest's own naive grouping doesn't
 * solve ("what's the wifi password" vs "how do I connect to the internet").
 */
export async function detectRepeatedGaps(
  supabase: SupabaseClient<Database>,
  venueId: string,
  distinctStaffThreshold: number,
): Promise<RepeatedGapCandidate[]> {
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: userRows }, { data: assistantRows }] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id, message, exchange_id, created_at, user_id, app_users(name)")
      .eq("venue_id", venueId)
      .eq("role", "user")
      .gte("created_at", sinceIso),
    supabase
      .from("chat_messages")
      .select("exchange_id, out_of_scope")
      .eq("venue_id", venueId)
      .eq("role", "assistant")
      .eq("out_of_scope", true)
      .gte("created_at", sinceIso),
  ]);

  const outOfScopeExchanges = new Set((assistantRows ?? []).map((r) => r.exchange_id).filter((id): id is string => !!id));
  const gapRows = (userRows ?? []).filter((r) => r.exchange_id && outOfScopeExchanges.has(r.exchange_id) && r.message?.trim());
  if (gapRows.length === 0) return [];

  const clusters = await clusterReports(gapRows.map((r) => ({ id: r.id, text: r.message!.trim() })));

  const byId = new Map(gapRows.map((r) => [r.id, r]));
  const candidates: RepeatedGapCandidate[] = [];
  for (const cluster of clusters) {
    const members = cluster.memberIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
    const distinctStaff = new Set(members.map((m) => m.user_id).filter(Boolean));
    if (distinctStaff.size < distinctStaffThreshold) continue;

    candidates.push({
      topicLabel: cluster.topicLabel,
      topicKey: cluster.topicKey,
      clusterReasoning: cluster.reasoning,
      memberSourceIds: members.map((m) => m.id),
      distinctStaffCount: distinctStaff.size,
      evidenceQuestions: members.map((m) => ({
        text: m.message!.trim(),
        staffName: m.app_users?.name ?? "Unknown staff",
        askedAt: m.created_at ?? "",
      })),
    });
  }
  return candidates;
}
