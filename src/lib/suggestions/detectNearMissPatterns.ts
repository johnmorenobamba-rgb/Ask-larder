import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { clusterReports } from "./clusterReports";

const WINDOW_DAYS = 90;

export interface NearMissPatternCandidate {
  topicLabel: string;
  topicKey: string;
  clusterReasoning: string;
  memberSourceIds: string[];
  itemCount: number;
  evidenceItems: { text: string; staffName: string; stationName: string | null; reportedAt: string }[];
}

export async function detectNearMissPatterns(
  supabase: SupabaseClient<Database>,
  venueId: string,
  minCount: number,
): Promise<NearMissPatternCandidate[]> {
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await supabase
    .from("near_miss_reports")
    .select("id, description, created_at, is_anonymous, app_users(name), stations(name)")
    .eq("venue_id", venueId)
    .gte("created_at", sinceIso);

  const reportRows = (rows ?? []).filter((r) => r.description?.trim());
  if (reportRows.length === 0) return [];

  const clusters = await clusterReports(reportRows.map((r) => ({ id: r.id, text: r.description!.trim() })));

  const byId = new Map(reportRows.map((r) => [r.id, r]));
  const candidates: NearMissPatternCandidate[] = [];
  for (const cluster of clusters) {
    const members = cluster.memberIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
    if (members.length < minCount) continue;

    candidates.push({
      topicLabel: cluster.topicLabel,
      topicKey: cluster.topicKey,
      clusterReasoning: cluster.reasoning,
      memberSourceIds: members.map((m) => m.id),
      itemCount: members.length,
      // Same "omit rather than rely on RLS to hide it" convention as
      // report-near-miss/route.ts itself -- an anonymous report's evidence
      // never carries a name, even into this venue's own owner-facing data.
      evidenceItems: members.map((m) => ({
        text: m.description!.trim(),
        staffName: m.is_anonymous ? "Anonymous" : (m.app_users?.name ?? "Unknown staff"),
        stationName: m.stations?.name ?? null,
        reportedAt: m.created_at ?? "",
      })),
    });
  }
  return candidates;
}
