import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export interface DigestQuestion {
  question: string;
  count: number;
  lastAskedAt: string;
}

export interface WeeklyDigest {
  totalQuestions: number;
  outOfScope: DigestQuestion[];
  escalations: DigestQuestion[];
}

/**
 * "What staff actually asked" for one venue over a time window -- the data
 * behind the owner dashboard's weekly report and the weekly-digest email
 * (supabase/functions/weekly-digest/index.ts holds the Edge Function's own
 * copy of this same query; Deno can't import this file directly, so keep
 * the two in sync by hand if the grouping logic ever changes).
 *
 * chat_messages has no FK linking a question (role='user') to its reply
 * (role='assistant') -- exchange_id (added alongside this feature) is a
 * plain shared uuid, not a relationship PostgREST can embed, so the join
 * happens here in application code rather than in one .select() call.
 * Out-of-scope questions are the more actionable signal (a direct pointer
 * at missing SOP content); escalations are included too since they show
 * what staff need supervisor help with, which is its own kind of gap.
 * Grouped by exact trimmed/lowercased question text -- two staff members
 * phrasing the same real question differently count separately. Fine for
 * a first version; clustering similar phrasings is a real but separate
 * improvement, not attempted here.
 */
export async function getWeeklyDigest(
  supabase: SupabaseClient<Database>,
  venueId: string,
  sinceIso: string,
): Promise<WeeklyDigest> {
  const [{ data: userRows }, { data: assistantRows }] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("message, exchange_id, created_at")
      .eq("venue_id", venueId)
      .eq("role", "user")
      .gte("created_at", sinceIso),
    supabase
      .from("chat_messages")
      .select("exchange_id, out_of_scope, is_escalation")
      .eq("venue_id", venueId)
      .eq("role", "assistant")
      .gte("created_at", sinceIso),
  ]);

  const flagsByExchange = new Map<string, { outOfScope: boolean; escalation: boolean }>();
  for (const row of assistantRows ?? []) {
    if (!row.exchange_id) continue;
    flagsByExchange.set(row.exchange_id, {
      outOfScope: row.out_of_scope === true,
      escalation: row.is_escalation === true,
    });
  }

  function group(rows: { message: string | null; exchange_id: string | null; created_at: string | null }[]): DigestQuestion[] {
    const byText = new Map<string, DigestQuestion>();
    for (const row of rows) {
      if (!row.message) continue;
      const key = row.message.trim().toLowerCase();
      const existing = byText.get(key);
      if (existing) {
        existing.count += 1;
        if (row.created_at && row.created_at > existing.lastAskedAt) existing.lastAskedAt = row.created_at;
      } else {
        byText.set(key, { question: row.message.trim(), count: 1, lastAskedAt: row.created_at ?? "" });
      }
    }
    return Array.from(byText.values()).sort((a, b) => b.count - a.count || b.lastAskedAt.localeCompare(a.lastAskedAt));
  }

  const outOfScopeRows = (userRows ?? []).filter((r) => r.exchange_id && flagsByExchange.get(r.exchange_id)?.outOfScope);
  const escalationRows = (userRows ?? []).filter((r) => r.exchange_id && flagsByExchange.get(r.exchange_id)?.escalation);

  return {
    totalQuestions: userRows?.length ?? 0,
    outOfScope: group(outOfScopeRows),
    escalations: group(escalationRows),
  };
}
