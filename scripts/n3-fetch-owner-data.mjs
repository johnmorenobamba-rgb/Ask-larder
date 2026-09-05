import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";

// Block N3 -- owner-side counterpart to n3-fetch-video-data.mjs. Mirrors
// dashboard/page.tsx + needsAttention.ts's exact logic, scoped explicitly
// to Two Fires here since this script uses the service-role client (no
// RLS to lean on, unlike the real app's request-scoped client).

const ESCALATION_SPIKE_THRESHOLD = 3;
const ESCALATION_SPIKE_WINDOW_DAYS = 7;

function daysUntil(dateStr) {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: venueRow } = await supabase.from("venues").select("id, slug, name, cert_nudge_cadence").eq("slug", "two-fires").single();
  const venueId = venueRow.id;
  const venueSlug = venueRow.slug;

  const windowStart = new Date(Date.now() - ESCALATION_SPIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: certs }, { data: liveModules }, { data: pendingModules }, { data: staffList }, { data: progress }, { data: nearMisses }, { data: escalations }] =
    await Promise.all([
      supabase
        .from("staff_certificates")
        .select("id, expiry_date, app_users!inner(name, venue_id), certificate_types(name)")
        .eq("app_users.venue_id", venueId)
        .order("expiry_date"),
      supabase.from("modules").select("id").eq("venue_id", venueId).eq("status", "live"),
      supabase.from("modules").select("id, title").eq("venue_id", venueId).eq("status", "pending_approval").order("title"),
      supabase.from("app_users").select("id, name, staff_roles(name)").eq("venue_id", venueId).neq("role", "owner").order("name"),
      supabase.from("staff_module_progress").select("user_id, module_id, status, app_users!inner(venue_id)").eq("app_users.venue_id", venueId),
      supabase
        .from("near_miss_reports")
        .select("id, created_at, stations(name)")
        .eq("venue_id", venueId)
        .eq("status", "open")
        .order("created_at", { ascending: false }),
      supabase
        .from("chat_messages")
        .select("id, station_id, stations(name)")
        .eq("venue_id", venueId)
        .eq("is_escalation", true)
        .gte("created_at", windowStart),
    ]);

  const cadence = (venueRow.cert_nudge_cadence ?? [30, 14, 7]).slice().sort((a, b) => a - b);
  const soonestThreshold = cadence[cadence.length - 1];

  const expiredCerts = [];
  const expiringCerts = [];
  for (const c of certs ?? []) {
    if (!c.expiry_date) continue;
    const days = daysUntil(c.expiry_date);
    const flag = { id: c.id, staffName: c.app_users?.name ?? "Unknown staff", certTypeName: c.certificate_types?.name ?? "Unknown cert", daysUntil: days };
    if (days < 0) expiredCerts.push(flag);
    else if (days <= soonestThreshold) expiringCerts.push(flag);
  }

  const spikesByStation = new Map();
  for (const e of escalations ?? []) {
    if (!e.station_id) continue;
    const existing = spikesByStation.get(e.station_id);
    if (existing) existing.count += 1;
    else spikesByStation.set(e.station_id, { stationName: e.stations?.name ?? null, count: 1 });
  }
  const escalationSpikes = Array.from(spikesByStation.entries())
    .filter(([, v]) => v.count >= ESCALATION_SPIKE_THRESHOLD)
    .map(([stationId, v]) => ({ stationId, stationName: v.stationName, count: v.count }));

  const flags = [
    ...expiredCerts.map((c) => ({ key: `expired-${c.id}`, tier: "red", href: `/${venueSlug}/owner/certs`, glyph: "cert", primary: `${c.staffName}'s ${c.certTypeName} expired`, secondary: `${Math.abs(c.daysUntil)} day(s) ago` })),
    ...expiringCerts.map((c) => ({ key: `expiring-${c.id}`, tier: "saffron", href: `/${venueSlug}/owner/certs`, glyph: "cert", primary: `${c.staffName}'s ${c.certTypeName} expires soon`, secondary: `${c.daysUntil} day(s) left` })),
    ...escalationSpikes.map((s) => ({ key: `spike-${s.stationId}`, tier: "saffron", href: `/${venueSlug}/owner/escalations?station=${s.stationId}`, glyph: "escalation", primary: `Staff keep asking about ${s.stationName ?? "a station"}`, secondary: `${s.count} fallback hits in the last 7 days` })),
    ...(pendingModules ?? []).map((m) => ({ key: `pending-${m.id}`, tier: "brown", href: `/${venueSlug}/owner/modules`, glyph: "module", primary: m.title, secondary: "Awaiting your approval" })),
  ];

  const liveModuleCount = (liveModules ?? []).length;
  const completedByUser = new Map();
  for (const p of progress ?? []) {
    if (p.status === "completed" && p.user_id) completedByUser.set(p.user_id, (completedByUser.get(p.user_id) ?? 0) + 1);
  }
  const staffRows = (staffList ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    roleName: s.staff_roles?.name ?? "No role set",
    completed: completedByUser.get(s.id) ?? 0,
    total: liveModuleCount,
  }));

  const ownerProps = {
    venueSlug,
    flags,
    nearMissCount: (nearMisses ?? []).length,
    nearMissRecentStation: nearMisses?.[0]?.stations?.name ?? null,
    staff: staffRows,
    stations: [],
  };

  mkdirSync("remotion/data", { recursive: true });
  writeFileSync("remotion/data/two-fires-owner.json", JSON.stringify(ownerProps, null, 2));
  console.log("Wrote remotion/data/two-fires-owner.json");
  console.log(JSON.stringify(ownerProps, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
