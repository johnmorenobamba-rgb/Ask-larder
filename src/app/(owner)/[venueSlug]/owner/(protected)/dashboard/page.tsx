import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { getNeedsAttention } from "@/lib/owner/needsAttention";
import { getStationsWithDisplay } from "@/lib/stations/getStationsWithDisplay";
import { OwnerDashboardBoard, type FlagItem } from "@/components/owner/OwnerDashboardBoard";
import type { StaffCompletionRow } from "@/components/owner/StaffCompletionList";

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

  const [needsAttention, { data: liveModules }, { data: staffList }, { data: progress }, stations] = await Promise.all([
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
    supabase.from("app_users").select("id, name, staff_roles(name)").neq("role", "owner").order("name"),
    supabase.from("staff_module_progress").select("user_id, module_id, status"),
    getStationsWithDisplay(supabase, venueId, venueSlug),
  ]);

  const liveModuleCount = (liveModules ?? []).length;
  const completedByUser = new Map<string, number>();
  for (const p of progress ?? []) {
    if (p.status === "completed" && p.user_id) {
      completedByUser.set(p.user_id, (completedByUser.get(p.user_id) ?? 0) + 1);
    }
  }

  // Red tier first (expired certs), then Saffron (expiring certs,
  // escalation spikes), then Clay Brown (pending approval) -- per the
  // spec's "most urgent should visually dominate before Saffron/Clay Brown
  // items." Near-misses are deliberately NOT included here (Block K2):
  // they're their own dedicated cell now, not folded into this pile.
  const flags: FlagItem[] = [
    ...needsAttention.expiredCerts.map(
      (c): FlagItem => ({
        key: `expired-${c.id}`,
        tier: "red",
        href: `/${venueSlug}/owner/certs`,
        glyph: "cert",
        primary: `${c.staffName}’s ${c.certTypeName} expired`,
        secondary: `${Math.abs(c.daysUntil)} day(s) ago`,
      }),
    ),
    ...needsAttention.expiringCerts.map(
      (c): FlagItem => ({
        key: `expiring-${c.id}`,
        tier: "saffron",
        href: `/${venueSlug}/owner/certs`,
        glyph: "cert",
        primary: `${c.staffName}’s ${c.certTypeName} expires soon`,
        secondary: `${c.daysUntil} day(s) left`,
      }),
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
    completed: completedByUser.get(s.id) ?? 0,
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
      />
    </main>
  );
}
