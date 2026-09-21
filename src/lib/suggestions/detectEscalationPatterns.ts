import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { clusterReports } from "./clusterReports";

const WINDOW_DAYS = 60;

export interface EscalationPatternCandidate {
  topicLabel: string;
  topicKey: string;
  clusterReasoning: string;
  memberSourceIds: string[];
  itemCount: number;
  evidenceItems: { text: string; staffName: string; stationName: string | null; askedAt: string }[];
}

/**
 * is_escalation (like out_of_scope) is only ever set on the assistant reply
 * row, never the user row -- confirmed against the real insert in
 * ask-larder/route.ts. Clustering the assistant's own reply text would be
 * close to useless (it's the locked fallback phrase, near-identical across
 * every escalation regardless of topic); the real signal is the user's
 * original question, joined back via exchange_id, same pattern
 * weeklyDigest.ts already uses. staffName/stationName come off the
 * assistant row directly -- ask-larder/route.ts writes the same user_id and
 * station_id onto both rows of a pair, so no extra join is needed for those.
 */
export async function detectEscalationPatterns(
  supabase: SupabaseClient<Database>,
  venueId: string,
  minCount: number,
): Promise<EscalationPatternCandidate[]> {
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: assistantRows }, { data: userRows }] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("exchange_id, created_at, app_users(name), stations(name)")
      .eq("venue_id", venueId)
      .eq("role", "assistant")
      .eq("is_escalation", true)
      .gte("created_at", sinceIso),
    supabase
      .from("chat_messages")
      .select("id, exchange_id, message")
      .eq("venue_id", venueId)
      .eq("role", "user")
      .gte("created_at", sinceIso),
  ]);

  const questionByExchange = new Map((userRows ?? []).filter((r) => r.exchange_id).map((r) => [r.exchange_id as string, r]));

  const escalationRows = (assistantRows ?? [])
    .filter((r) => r.exchange_id)
    .map((r) => {
      const question = questionByExchange.get(r.exchange_id as string);
      if (!question?.message?.trim()) return null;
      return {
        id: question.id,
        text: question.message.trim(),
        staffName: r.app_users?.name ?? "Unknown staff",
        stationName: r.stations?.name ?? null,
        askedAt: r.created_at ?? "",
      };
    })
    .filter((r): r is NonNullable<typeof r> => !!r);
  if (escalationRows.length === 0) return [];

  const clusters = await clusterReports(escalationRows.map((r) => ({ id: r.id, text: r.text })));

  const byId = new Map(escalationRows.map((r) => [r.id, r]));
  const candidates: EscalationPatternCandidate[] = [];
  for (const cluster of clusters) {
    const members = cluster.memberIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
    if (members.length < minCount) continue;

    candidates.push({
      topicLabel: cluster.topicLabel,
      topicKey: cluster.topicKey,
      clusterReasoning: cluster.reasoning,
      memberSourceIds: members.map((m) => m.id),
      itemCount: members.length,
      evidenceItems: members.map((m) => ({ text: m.text, staffName: m.staffName, stationName: m.stationName, askedAt: m.askedAt })),
    });
  }
  return candidates;
}
