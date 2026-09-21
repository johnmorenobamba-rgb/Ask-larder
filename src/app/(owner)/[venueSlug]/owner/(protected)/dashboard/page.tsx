import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { getNeedsAttention } from "@/lib/owner/needsAttention";
import { getStationsWithDisplay } from "@/lib/stations/getStationsWithDisplay";
import { getWeeklyDigest } from "@/lib/reports/weeklyDigest";
import { OwnerDashboardBoard, type FlagItem } from "@/components/owner/OwnerDashboardBoard";
import type { StaffCompletionRow } from "@/components/owner/StaffCompletionList";
import { logQueryError } from "@/lib/supabase/logQueryError";

// Owner Admin Panel spec, home screen — Block K: v2 revision of J6's linear
// list into an actual bento grid (Owner Admin Panel spec v2 "Overview" —
// supersedes the v1 "three stacked sections" structure). Needs-attention
// collapses to one compact cell (K1), near-miss reports get their own
// dedicated cell instead of living inside the flag pile (K2), staff
// completion becomes a team-wide summary cell with the full per-staff
// ElevatedCell list moved to its own detail screen (K3), and the stations
// gallery (K4) is reused directly from the staff dashboard. See
// OwnerDashboardBoard.tsx for the grid composition and sizing (K5).
export default async function OwnerDashboardPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();
  const venueId = staff!.venue_id!;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    needsAttention,
    { data: liveModules, error: liveModulesError },
    { data: staffList, error: staffListError },
    { data: progress, error: progressError },
    stations,
    { data: escalationRows, error: escalationRowsError },
    weeklyDigest,
    { data: suggestionRows, error: suggestionRowsError },
  ] = await Promise.all([
      getNeedsAttention(supabase, venueId),
      supabase.from("modules").select("id").eq("status", "live"),
      // Excludes the owner's own account -- the unfiltered query was listing
      // it in "Staff completion" too (found live while seeding a realistic
      // multi-staff venue for J6's screenshot pass: an owner row rendered
      // "No role set" with a 0/N ring, which is real but semantically wrong
      // to show at all -- pre-existing, just far more visible now that this
      // is a prominent elevated ring instead of a plain text row). Managers
      // stay included -- unlike the owner, they can carry a staff_role_id
      // and go through the same training as everyone else.
      supabase.from("app_users").select("id, name, staff_roles(name)").neq("role", "owner").is("deactivated_at", null).order("name"),
      supabase.from("staff_module_progress").select("user_id, module_id, status"),
      getStationsWithDisplay(supabase, venueId, venueSlug),
      // Fetched and filtered client-side rather than a .neq("escalation_status", "resolved")
      // server-side filter -- Postgres's NULL comparison semantics mean <>
      // 'resolved' silently excludes NULL rows (the actual default/unset
      // state), which would have hidden every never-touched escalation.
      supabase
        .from("chat_messages")
        .select("id, created_at, escalation_status, stations(name)")
        .eq("venue_id", venueId)
        .eq("is_escalation", true)
        .order("created_at", { ascending: false }),
      getWeeklyDigest(supabase, venueId, sevenDaysAgo.toISOString()),
      // Suggestion assistant tile -- signal_type order gives near-miss
      // patterns (a real physical incident) priority over escalation
      // patterns over repeated gaps for "most notable", tie-broken by
      // recency. A plain .order() on signal_type would sort alphabetically
      // (escalation_pattern, near_miss_pattern, repeated_gap), not by real
      // severity, so this fetches all pending rows and ranks them here.
      supabase
        .from("content_suggestions")
        .select("id, signal_type, headline, created_at")
        .eq("venue_id", venueId)
        .eq("status", "pending"),
    ]);
  logQueryError(`[${venueSlug}] dashboard liveModules`, liveModulesError);
  logQueryError(`[${venueSlug}] dashboard staffList`, staffListError);
  logQueryError(`[${venueSlug}] dashboard progress`, progressError);
  logQueryError(`[${venueSlug}] dashboard escalationRows`, escalationRowsError);
  logQueryError(`[${venueSlug}] dashboard suggestionRows`, suggestionRowsError);

  const SIGNAL_PRIORITY: Record<string, number> = { near_miss_pattern: 0, escalation_pattern: 1, repeated_gap: 2 };
  const sortedSuggestions = (suggestionRows ?? []).slice().sort((a, b) => {
    const priorityDiff = (SIGNAL_PRIORITY[a.signal_type] ?? 3) - (SIGNAL_PRIORITY[b.signal_type] ?? 3);
    if (priorityDiff !== 0) return priorityDiff;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });

  const unresolvedEscalations = (escalationRows ?? []).filter((e) => e.escalation_status !== "resolved");

  const liveModuleCount = (liveModules ?? []).length;
  // Counts distinct completed module_ids per user, not raw rows -- see the
  // matching comment in staff/page.tsx (item 7, 18 Sep fix).
  const completedByUser = new Map<string, Set<string>>();
  for (const p of progress ?? []) {
    if (p.status === "completed" && p.user_id && p.module_id) {
      if (!completedByUser.has(p.user_id)) completedByUser.set(p.user_id, new Set());
      completedByUser.get(p.user_id)!.add(p.module_id);
    }
  }

  // Red tier first (expired certs), then Saffron (expiring certs,
  // escalation spikes), then Clay Brown (pending approval) -- per the
  // spec's "most urgent should visually dominate before Saffron/Clay Brown
  // items." Near-misses are deliberately NOT included here (Block K2):
  // they're their own dedicated cell now, not folded into this pile.
  //
  // Cert flags split by tracking_type (15 Sep 2026, VIC cert refresher
  // model): a hard_expiry cert (WWCC) is a real legal deadline and keeps
  // the red/"expired" treatment. A recommended_refresher cert (RSA, Food
  // Handling, Food Safety Supervisor, First Aid) is never a compliance
  // breach, so it never gets red or "expired" wording -- overdue refreshers
  // read as Saffron (same urgency tier as "expiring soon"), not Red.
  const flags: FlagItem[] = [
    ...needsAttention.expiredCerts.map(
      (c): FlagItem =>
        c.trackingType === "hard_expiry"
          ? {
              key: `expired-${c.id}`,
              tier: "red",
              href: `/${venueSlug}/owner/certs`,
              glyph: "cert",
              primary: `${c.staffName}’s ${c.certTypeName} expired`,
              secondary: `${Math.abs(c.daysUntil)} day(s) ago`,
            }
          : {
              key: `expired-${c.id}`,
              tier: "saffron",
              href: `/${venueSlug}/owner/certs`,
              glyph: "cert",
              primary: `${c.staffName}’s ${c.certTypeName} refresher recommended`,
              secondary: `overdue by ${Math.abs(c.daysUntil)} day(s)`,
            },
    ),
    ...needsAttention.expiringCerts.map(
      (c): FlagItem =>
        c.trackingType === "hard_expiry"
          ? {
              key: `expiring-${c.id}`,
              tier: "saffron",
              href: `/${venueSlug}/owner/certs`,
              glyph: "cert",
              primary: `${c.staffName}’s ${c.certTypeName} expires soon`,
              secondary: `${c.daysUntil} day(s) left`,
            }
          : {
              key: `expiring-${c.id}`,
              tier: "saffron",
              href: `/${venueSlug}/owner/certs`,
              glyph: "cert",
              primary: `${c.staffName}’s ${c.certTypeName} refresher recommended soon`,
              secondary: `${c.daysUntil} day(s) left`,
            },
    ),
    ...needsAttention.escalationSpikes.map(
      (s): FlagItem => ({
        key: `spike-${s.stationId}`,
        tier: "saffron",
        href: `/${venueSlug}/owner/escalations?station=${s.stationId}`,
        glyph: "escalation",
        primary: `Staff keep asking about ${s.stationName ?? "a station"}`,
        secondary: `${s.count} fallback hits in the last 7 days`,
      }),
    ),
    ...needsAttention.pendingModules.map(
      (m): FlagItem => ({
        key: `pending-${m.id}`,
        tier: "brown",
        href: `/${venueSlug}/owner/modules`,
        glyph: "module",
        primary: m.title,
        secondary: "Awaiting your approval",
      }),
    ),
  ];

  const staffRows: StaffCompletionRow[] = (staffList ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    roleName: s.staff_roles?.name ?? "No role set",
    completed: completedByUser.get(s.id)?.size ?? 0,
    total: liveModuleCount,
  }));

  return (
    <main className="min-h-screen bg-parchment px-4 py-10 md:px-6">
      <OwnerDashboardBoard
        venueSlug={venueSlug}
        flags={flags}
        nearMissCount={needsAttention.unresolvedNearMisses.length}
        nearMissRecentStation={needsAttention.unresolvedNearMisses[0]?.stationName ?? null}
        staff={staffRows}
        stations={stations}
        escalationCount={unresolvedEscalations.length}
        escalationRecentStation={unresolvedEscalations[0]?.stations?.name ?? null}
        weeklyQuestionCount={weeklyDigest.totalQuestions}
        weeklyOutOfScopeCount={weeklyDigest.outOfScope.length}
        weeklyTopQuestion={weeklyDigest.outOfScope[0]?.question ?? weeklyDigest.escalations[0]?.question ?? null}
        suggestionCount={sortedSuggestions.length}
        suggestionPreview={sortedSuggestions[0]?.headline ?? null}
      />
    </main>
  );
}
