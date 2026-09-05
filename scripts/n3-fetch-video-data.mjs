import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";

// Block N3 -- one-time snapshot of REAL Two Fires data into static JSON for
// the Remotion video to import. Mirrors home/page.tsx's exact query +
// transform logic (not a reimplementation from scratch) so the on-screen
// numbers match what the live app would actually show for this account.
// Re-run this script if the video's data needs refreshing later -- it is
// NOT wired into the running app, purely a build-time data source for the
// video composition.

const STAFF_NAME = "Tomas Reyes";
const CERT_STATUS_COLOR = {
  valid: "var(--color-bay-green)",
  expiring: "var(--color-saffron)",
  expired: "var(--color-preserve-red)",
};

function daysUntil(dateStr) {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function parseWindowRange(range) {
  const match = range.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const startMin = Number(match[1]) * 60 + Number(match[2]);
  let endMin = Number(match[3]) * 60 + Number(match[4]);
  if (endMin <= startMin) endMin += 24 * 60;
  return { startMin, endMin };
}

function getShiftContext(shiftWindows, now) {
  const entries =
    shiftWindows && typeof shiftWindows === "object" && !Array.isArray(shiftWindows)
      ? Object.entries(shiftWindows)
      : [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let current = null;
  let next = null;
  let nextStartMin = Infinity;
  for (const [key, value] of entries) {
    if (typeof value !== "string") continue;
    const parsed = parseWindowRange(value);
    if (!parsed) continue;
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    if (nowMin >= parsed.startMin && nowMin < parsed.endMin) current = { label, range: value };
    else if (parsed.startMin > nowMin && parsed.startMin < nextStartMin) {
      nextStartMin = parsed.startMin;
      next = { label, range: value };
    }
  }
  return {
    dateLabel: now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" }),
    hasAnyWindows: entries.length > 0,
    current,
    next,
  };
}

async function getPhotoLibraryUrl(supabase, storagePath) {
  const { data, error } = await supabase.storage.from("photo-library").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
  if (error) {
    console.error("signed URL error:", error.message);
    return null;
  }
  return data.signedUrl;
}

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: venueRow } = await supabase.from("venues").select("id, slug, name").eq("slug", "two-fires").single();
  const venueId = venueRow.id;
  const { data: staff } = await supabase
    .from("app_users")
    .select("id, name, venue_id, staff_role_id")
    .eq("venue_id", venueId)
    .eq("name", STAFF_NAME)
    .single();

  const now = new Date();

  const [{ data: venue }, { data: modules }, { data: progress }, { data: certTypes }, { data: certs }, { count: fallbackCount }] =
    await Promise.all([
      supabase.from("venues").select("name, cert_nudge_cadence, shift_windows").eq("id", venueId).single(),
      supabase.from("modules").select("id, title, module_roles(role_id)").eq("venue_id", venueId).in("status", ["approved", "live"]),
      supabase.from("staff_module_progress").select("module_id, status").eq("user_id", staff.id),
      supabase.from("certificate_types").select("id, name, certificate_type_roles(role_id)").eq("venue_id", venueId).order("name"),
      supabase.from("staff_certificates").select("certificate_type_id, expiry_date").eq("user_id", staff.id),
      supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", staff.id)
        .eq("role", "assistant")
        .eq("is_escalation", true)
        .gte("created_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

  const visibleModules = (modules ?? []).filter(
    (m) => m.module_roles.length === 0 || m.module_roles.some((mr) => mr.role_id === staff.staff_role_id),
  );
  const progressByModule = new Map((progress ?? []).map((p) => [p.module_id, p.status]));
  const completedCount = visibleModules.filter((m) => progressByModule.get(m.id) === "completed").length;
  const continueModule = visibleModules.find((m) => progressByModule.get(m.id) !== "completed") ?? null;
  const continueStatus = continueModule
    ? progressByModule.get(continueModule.id) === "in_progress"
      ? "In progress"
      : "Not started"
    : null;

  let continueSectionsTotal = 0;
  let continueSectionsDone = 0;
  if (continueModule) {
    const { count } = await supabase.from("module_sections").select("id", { count: "exact", head: true }).eq("module_id", continueModule.id);
    continueSectionsTotal = count ?? 0;
    continueSectionsDone = continueStatus === "In progress" ? Math.ceil(continueSectionsTotal / 2) : 0;
  }

  let continuePhotoUrl = null;
  if (continueModule) {
    const { data: taggedPhoto } = await supabase
      .from("photo_library")
      .select("storage_path")
      .eq("module_id", continueModule.id)
      .eq("tag", "module")
      .limit(1)
      .maybeSingle();
    continuePhotoUrl = taggedPhoto
      ? await getPhotoLibraryUrl(supabase, taggedPhoto.storage_path)
      : "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=640&h=480&fit=crop";
  }

  const { data: activityTaggedPhoto } = await supabase
    .from("photo_library")
    .select("storage_path")
    .eq("venue_id", venueId)
    .in("tag", ["general", "hero"])
    .order("tag")
    .limit(1)
    .maybeSingle();
  const activityPhotoUrl =
    (activityTaggedPhoto ? await getPhotoLibraryUrl(supabase, activityTaggedPhoto.storage_path) : null) ??
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=640&h=480&fit=crop";

  const cadence = (venue?.cert_nudge_cadence ?? [30, 14, 7]).slice().sort((a, b) => a - b);
  const soonestThreshold = cadence[cadence.length - 1];
  const certByType = new Map((certs ?? []).map((c) => [c.certificate_type_id, c.expiry_date]));
  const visibleCertTypes = (certTypes ?? []).filter(
    (ct) => ct.certificate_type_roles.length === 0 || ct.certificate_type_roles.some((r) => r.role_id === staff.staff_role_id),
  );
  const certRows = visibleCertTypes.map((ct) => {
    const expiry = certByType.get(ct.id);
    const days = expiry ? daysUntil(expiry) : null;
    const status = days === null ? "missing" : days < 0 ? "expired" : days <= soonestThreshold ? "expiring" : "valid";
    return {
      id: ct.id,
      name: ct.name,
      status,
      days,
      label:
        status === "missing" ? "Not uploaded" : status === "expired" ? `Expired ${Math.abs(days)}d ago` : status === "expiring" ? `Expires in ${days}d` : "Valid",
      color: status === "missing" ? "var(--color-clay-brown)" : CERT_STATUS_COLOR[status],
    };
  });
  const allCertsValid = certRows.length > 0 && certRows.every((c) => c.status === "valid");
  const STATUS_PRIORITY = { expired: 0, expiring: 1, missing: 2, valid: 3 };
  const sortedCertRows = certRows.slice().sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);
  const expiringRows = certRows.filter((c) => c.status === "expiring" && c.days !== null);
  const nextCertExpiring = expiringRows.length > 0 ? expiringRows.slice().sort((a, b) => a.days - b.days)[0] : null;

  const hour = now.getHours();
  const timeGreeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const shiftContext = getShiftContext(venue?.shift_windows, now);

  const bentoProps = {
    venueSlug: "two-fires",
    staffName: staff.name,
    venueName: venue?.name ?? "",
    timeGreeting,
    completedCount,
    totalCount: visibleModules.length,
    continueModule: continueModule ? { id: continueModule.id, title: continueModule.title, status: continueStatus } : null,
    continuePhotoUrl,
    continueSectionsTotal,
    continueSectionsDone,
    certRows: sortedCertRows,
    allCertsValid,
    nextCertExpiring,
    fallbackCount: fallbackCount ?? 0,
    activityPhotoUrl,
    shiftContext,
    stations: [], // Stations gallery not needed for the video's bento-cell shots
  };

  mkdirSync("remotion/data", { recursive: true });
  writeFileSync("remotion/data/two-fires-home.json", JSON.stringify(bentoProps, null, 2));
  console.log("Wrote remotion/data/two-fires-home.json for", staff.name);
  console.log(JSON.stringify(bentoProps, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
