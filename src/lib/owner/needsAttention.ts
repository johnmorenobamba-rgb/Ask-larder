import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type ExpiringCertFlag = {
  id: string;
  staffName: string;
  certTypeName: string;
  daysUntil: number;
};

export type PendingModuleFlag = {
  id: string;
  title: string;
};

export type UnresolvedNearMissFlag = {
  id: string;
  stationName: string | null;
  createdAt: string;
};

export type EscalationSpikeFlag = {
  stationId: string;
  stationName: string | null;
  count: number;
};

export type NeedsAttention = {
  expiredCerts: ExpiringCertFlag[];
  expiringCerts: ExpiringCertFlag[];
  pendingModules: PendingModuleFlag[];
  unresolvedNearMisses: UnresolvedNearMissFlag[];
  escalationSpikes: EscalationSpikeFlag[];
};

const ESCALATION_SPIKE_THRESHOLD = 3;
const ESCALATION_SPIKE_WINDOW_DAYS = 7;

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Owner dashboard "Needs attention" board — Owner Admin Panel spec, updated
 * 28 Aug 2026. Four flag types, most urgent first. Escalation spikes (3+
 * fallback hits on the same station in 7 days) locked by John 28 Aug 2026 —
 * grouped by station_id since chat_messages has no module_id to group by.
 */
export async function getNeedsAttention(
  supabase: SupabaseClient<Database>,
  venueId: string,
): Promise<NeedsAttention> {
  const windowStart = new Date(
    Date.now() - ESCALATION_SPIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [{ data: certs }, { data: venue }, { data: modules }, { data: nearMisses }, { data: escalations }] =
    await Promise.all([
      supabase
        .from("staff_certificates")
        .select("id, expiry_date, app_users(name), certificate_types(name)")
        .order("expiry_date"),
      supabase.from("venues").select("cert_nudge_cadence").eq("id", venueId).single(),
      supabase.from("modules").select("id, title").eq("status", "pending_approval").order("title"),
      supabase
        .from("near_miss_reports")
        .select("id, created_at, stations(name)")
        .eq("status", "open")
        .order("created_at", { ascending: false }),
      supabase
        .from("chat_messages")
        .select("id, station_id, stations(name)")
        .eq("is_escalation", true)
        .gte("created_at", windowStart),
    ]);

  const cadence = (venue?.cert_nudge_cadence ?? [30, 14, 7]).slice().sort((a, b) => a - b);
  const soonestThreshold = cadence[cadence.length - 1];

  const expiredCerts: ExpiringCertFlag[] = [];
  const expiringCerts: ExpiringCertFlag[] = [];
  for (const c of certs ?? []) {
    if (!c.expiry_date) continue;
    const days = daysUntil(c.expiry_date);
    const flag: ExpiringCertFlag = {
      id: c.id,
      staffName: c.app_users?.name ?? "Unknown staff",
      certTypeName: c.certificate_types?.name ?? "Unknown cert",
      daysUntil: days,
    };
    if (days < 0) expiredCerts.push(flag);
    else if (days <= soonestThreshold) expiringCerts.push(flag);
  }

  const pendingModules: PendingModuleFlag[] = (modules ?? []).map((m) => ({ id: m.id, title: m.title }));

  const unresolvedNearMisses: UnresolvedNearMissFlag[] = (nearMisses ?? []).map((r) => ({
    id: r.id,
    stationName: r.stations?.name ?? null,
    createdAt: r.created_at ?? "",
  }));

  const spikesByStation = new Map<string, { stationName: string | null; count: number }>();
  for (const e of escalations ?? []) {
    if (!e.station_id) continue;
    const existing = spikesByStation.get(e.station_id);
    if (existing) existing.count += 1;
    else spikesByStation.set(e.station_id, { stationName: e.stations?.name ?? null, count: 1 });
  }
  const escalationSpikes: EscalationSpikeFlag[] = Array.from(spikesByStation.entries())
    .filter(([, v]) => v.count >= ESCALATION_SPIKE_THRESHOLD)
    .map(([stationId, v]) => ({ stationId, stationName: v.stationName, count: v.count }));

  return { expiredCerts, expiringCerts, pendingModules, unresolvedNearMisses, escalationSpikes };
}

export function hasAnyFlags(n: NeedsAttention): boolean {
  return (
    n.expiredCerts.length > 0 ||
    n.expiringCerts.length > 0 ||
    n.pendingModules.length > 0 ||
    n.unresolvedNearMisses.length > 0 ||
    n.escalationSpikes.length > 0
  );
}
