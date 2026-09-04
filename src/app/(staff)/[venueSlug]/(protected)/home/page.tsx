import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPhotoLibraryUrl } from "@/lib/owner/photoLibraryUrl";
import { getStationsWithDisplay } from "@/lib/stations/getStationsWithDisplay";
import { BentoGrid } from "@/components/staff/BentoGrid";

// Forces a fresh read every request. Found live during Block O roleplay QA
// (2026-09-04): this page's module-completion count disagreed with the
// /modules list page's count for the same account moments apart -- both
// queries are logically identical, so the safest fix is ruling out any
// caching layer serving a stale response, on either this page or the one
// it's compared against.
export const dynamic = "force-dynamic";

const CERT_STATUS_COLOR: Record<string, string> = {
  valid: "var(--color-bay-green)",
  expiring: "var(--color-saffron)",
  expired: "var(--color-preserve-red)",
};

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// Shift context cell (Bento variety pass) -- lightweight v1 per the spec's
// explicit guardrail: today's date + whichever configured venues.shift_windows
// window contains the current time, no roster/"who else is working" data
// exists so this deliberately doesn't invent any. shift_windows is a flat
// jsonb map of label -> "HH:MM-HH:MM" (Tech Bible §15a), owner-editable.
function parseWindowRange(range: string): { startMin: number; endMin: number } | null {
  const match = range.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const startMin = Number(match[1]) * 60 + Number(match[2]);
  let endMin = Number(match[3]) * 60 + Number(match[4]);
  if (endMin <= startMin) endMin += 24 * 60; // crosses midnight, e.g. a late close
  return { startMin, endMin };
}

function getShiftContext(shiftWindows: unknown, now: Date) {
  const entries =
    shiftWindows && typeof shiftWindows === "object" && !Array.isArray(shiftWindows)
      ? Object.entries(shiftWindows as Record<string, unknown>)
      : [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let current: { label: string; range: string } | null = null;
  let next: { label: string; range: string } | null = null;
  let nextStartMin = Infinity;

  for (const [key, value] of entries) {
    if (typeof value !== "string") continue;
    const parsed = parseWindowRange(value);
    if (!parsed) continue;
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    if (nowMin >= parsed.startMin && nowMin < parsed.endMin) {
      current = { label, range: value };
    } else if (parsed.startMin > nowMin && parsed.startMin < nextStartMin) {
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

export default async function StaffHomePage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();
  // Single "now" for the whole request -- reused below for the fallback-
  // count cutoff, the greeting, and the shift-context lookup, rather than
  // separate Date.now()/new Date() calls (the latter inline in a Server
  // Component body trips eslint's react-hooks/purity rule).
  const now = new Date();

  const [
    { data: venue },
    { data: modules },
    { data: progress },
    { data: certTypes },
    { data: certs },
    stationsWithQr,
    { count: fallbackCount },
  ] = await Promise.all([
    supabase.from("venues").select("name, cert_nudge_cadence, shift_windows").eq("id", staff.venue_id!).single(),
    supabase
      .from("modules")
      .select("id, title, module_roles(role_id)")
      .eq("venue_id", staff.venue_id!)
      .in("status", ["approved", "live"]),
    supabase.from("staff_module_progress").select("module_id, status").eq("user_id", staff.id),
    supabase
      .from("certificate_types")
      .select("id, name, certificate_type_roles(role_id)")
      .eq("venue_id", staff.venue_id!)
      .order("name"),
    supabase.from("staff_certificates").select("certificate_type_id, expiry_date").eq("user_id", staff.id),
    getStationsWithDisplay(supabase, staff.venue_id!, venueSlug),
    // "My Ask Larder activity" (Bento variety pass, Personal Dashboard spec)
    // -- this staff member's OWN fallback-triggered questions only, never
    // the owner's venue-wide escalations digest. 30 days mirrors the
    // recency framing already used for cert-nudge cadence elsewhere.
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
    ? (progressByModule.get(continueModule.id) as "in_progress" | undefined)
      ? "In progress"
      : "Not started"
    : null;

  // Section count is real; how many are actually done isn't (per-section
  // completion isn't persisted anywhere — ModuleRunner only tracks step
  // client-side, same limitation already accepted for the checklist's
  // in-progress ring). "in_progress" renders as roughly half-filled ticks,
  // a representative approximation, not a literal count.
  let continueSectionsTotal = 0;
  let continueSectionsDone = 0;
  if (continueModule) {
    const { count } = await supabase
      .from("module_sections")
      .select("id", { count: "exact", head: true })
      .eq("module_id", continueModule.id);
    continueSectionsTotal = count ?? 0;
    continueSectionsDone = continueStatus === "In progress" ? Math.ceil(continueSectionsTotal / 2) : 0;
  }

  // Real venue photography (tagged "module" in the photo library, matching
  // this module) is preferred when available. TEMPORARY fallback: stock
  // photography, explicitly acknowledged as a Branding Kit anti-pattern
  // violation, accepted knowingly until a venue has real photos uploaded —
  // replace once the venue's photo library has module-tagged photos.
  let continuePhotoUrl: string | null = null;
  if (continueModule) {
    const { data: taggedPhoto } = await supabase
      .from("photo_library")
      .select("storage_path")
      .eq("module_id", continueModule.id)
      .eq("tag", "module")
      .limit(1)
      .maybeSingle();
    continuePhotoUrl = taggedPhoto
      ? await getPhotoLibraryUrl(taggedPhoto.storage_path)
      : "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=640&h=480&fit=crop";
  }

  // "My Ask Larder activity" cell backdrop -- same tagged-library sourcing
  // as Continue above, but not tied to a specific module, so it prefers a
  // "general" photo then falls back to "hero". Same accepted, flagged
  // stock-photo fallback until a venue has real photos uploaded.
  const { data: activityTaggedPhoto } = await supabase
    .from("photo_library")
    .select("storage_path")
    .eq("venue_id", staff.venue_id!)
    .in("tag", ["general", "hero"])
    .order("tag") // "general" sorts before "hero" -- gives it priority when both exist
    .limit(1)
    .maybeSingle();
  const activityPhotoUrl =
    (activityTaggedPhoto ? await getPhotoLibraryUrl(activityTaggedPhoto.storage_path) : null) ??
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
        status === "missing"
          ? "Not uploaded"
          : status === "expired"
            ? `Expired ${Math.abs(days!)}d ago`
            : status === "expiring"
              ? `Expires in ${days}d`
              : "Valid",
      color: status === "missing" ? "var(--color-clay-brown)" : CERT_STATUS_COLOR[status],
    };
  });
  const allCertsValid = certRows.length > 0 && certRows.every((c) => c.status === "valid");

  // Front-of-stack ordering for the fanned card visual: most urgent first
  // (expired, then soonest-expiring, then missing, then valid last).
  const STATUS_PRIORITY: Record<string, number> = { expired: 0, expiring: 1, missing: 2, valid: 3 };
  const sortedCertRows = certRows.slice().sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);

  // "Next cert expiring" standalone cell (Bento variety pass) -- soonest
  // genuinely-expiring row by actual day count, not just status category
  // (sortedCertRows above only sorts by status, not by days within one).
  // null when nothing is expiring soon, which collapses the cell entirely.
  const expiringRows = certRows.filter((c) => c.status === "expiring" && c.days !== null);
  const nextCertExpiring = expiringRows.length > 0 ? expiringRows.slice().sort((a, b) => a.days! - b.days!)[0] : null;

  const hour = now.getHours();
  const timeGreeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const shiftContext = getShiftContext(venue?.shift_windows, now);

  return (
    <BentoGrid
      venueSlug={venueSlug}
      staffName={staff.name}
      venueName={venue?.name ?? ""}
      timeGreeting={timeGreeting}
      completedCount={completedCount}
      totalCount={visibleModules.length}
      continueModule={continueModule ? { id: continueModule.id, title: continueModule.title, status: continueStatus! } : null}
      continuePhotoUrl={continuePhotoUrl}
      continueSectionsTotal={continueSectionsTotal}
      continueSectionsDone={continueSectionsDone}
      certRows={sortedCertRows}
      allCertsValid={allCertsValid}
      nextCertExpiring={nextCertExpiring}
      fallbackCount={fallbackCount ?? 0}
      activityPhotoUrl={activityPhotoUrl}
      shiftContext={shiftContext}
      stations={stationsWithQr}
    />
  );
}
