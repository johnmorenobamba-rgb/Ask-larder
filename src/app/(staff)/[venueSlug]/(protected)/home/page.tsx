import { redirect } from "next/navigation";
import { startTimer } from "@/lib/perf/timing";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPhotoLibraryUrls } from "@/lib/owner/photoLibraryUrl";
import { getStationsWithDisplay } from "@/lib/stations/getStationsWithDisplay";
import { BentoGrid } from "@/components/staff/BentoGrid";
import { COMPLIANCE_FORMS, canSubmitForm } from "@/lib/compliance/catalog";
import { loadHub } from "@/lib/compliance/engine/hubData";
import { createAdminClient } from "@/lib/supabase/admin";
import { logQueryError } from "@/lib/supabase/logQueryError";

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

export default async function StaffHomePage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const t = startTimer(`staff-home ${venueSlug}`);
  const staff = await t.step("getCurrentStaff", getCurrentStaff());
  // Personal pages are never shown on the shared venue iPad account.
  if (staff?.isDevice) redirect(`/${venueSlug}/device`);
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();
  // Single "now" for the whole request -- reused below for the fallback-
  // count cutoff, the greeting, and the shift-context lookup, rather than
  // separate Date.now()/new Date() calls (the latter inline in a Server
  // Component body trips eslint's react-hooks/purity rule).
  const now = new Date();
  const venueId = staff.venue_id!;

  // Everything below needs only the staff row, so it all goes out in ONE
  // round (performance plan, Phase 2). The venue name and cert cadence come
  // with getCurrentStaff, the section count is embedded in the modules query,
  // the photos are looked up by venue instead of waiting for the module list,
  // and the compliance hub (which already loads the B2 temperature overview)
  // runs alongside instead of after.
  const [
    { data: modules, error: modulesError },
    { data: progress, error: progressError },
    { data: certTypes, error: certTypesError },
    { data: certs, error: certsError },
    stationsWithQr,
    { count: fallbackCount, error: fallbackCountError },
    suggestionRows,
    { data: modulePhotos, error: modulePhotosError },
    { data: activityTaggedPhoto, error: activityTaggedPhotoError },
    hubResult,
  ] = await t.step("promiseAll", Promise.all([
    supabase
      .from("modules")
      .select("id, title, module_roles(role_id), module_sections(count)")
      .eq("venue_id", venueId)
      .in("status", ["approved", "live"]),
    supabase.from("staff_module_progress").select("module_id, status").eq("user_id", staff.id),
    supabase
      .from("certificate_types")
      .select("id, name, certificate_type_roles(role_id)")
      .eq("venue_id", venueId)
      .order("name"),
    supabase.from("staff_certificates").select("certificate_type_id, expiry_date").eq("user_id", staff.id),
    getStationsWithDisplay(supabase, venueId, venueSlug),
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
    // Suggestions tile -- manager-tier only (Head Chef/Sous Chef/Manager/
    // 2IC). Never fetched for a frontline account, not just hidden client
    // side, matching how this app treats every other owner-only surface.
    staff.isManagerTier
      ? supabase.from("content_suggestions").select("id, signal_type, headline, created_at").eq("venue_id", venueId).eq("status", "pending")
      : Promise.resolve({ data: null, error: null }),
    // Module-tagged photos for the Continue cell, by venue, so this does not
    // wait for the module list; the one for the continue module is picked below.
    supabase.from("photo_library").select("module_id, storage_path").eq("venue_id", venueId).eq("tag", "module").not("module_id", "is", null),
    // "My Ask Larder activity" cell backdrop -- same tagged-library sourcing
    // as Continue, but not tied to a specific module, so it prefers a
    // "general" photo then falls back to "hero". Same accepted, flagged
    // stock-photo fallback until a venue has real photos uploaded.
    supabase
      .from("photo_library")
      .select("storage_path")
      .eq("venue_id", venueId)
      .in("tag", ["general", "hero"])
      .order("tag") // "general" sorts before "hero" -- gives it priority when both exist
      .limit(1)
      .maybeSingle(),
    // Compliance forms and temperature tiles. A failure shows a quiet message, never a clean zero.
    loadHub(supabase, createAdminClient(), venueId, { isManagerTier: staff.isManagerTier, department: staff.department }, now).then(
      (hub) => ({ hub, failed: false as const }),
      () => ({ hub: null, failed: true as const }),
    ),
  ]));
  logQueryError(`[${venueSlug}] home modules`, modulesError);
  logQueryError(`[${venueSlug}] home progress`, progressError);
  logQueryError(`[${venueSlug}] home certTypes`, certTypesError);
  logQueryError(`[${venueSlug}] home certs`, certsError);
  logQueryError(`[${venueSlug}] home fallbackCount`, fallbackCountError);
  logQueryError(`[${venueSlug}] home taggedPhoto`, modulePhotosError);
  logQueryError(`[${venueSlug}] home activityTaggedPhoto`, activityTaggedPhotoError);

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
  const continueSectionsTotal = continueModule ? (continueModule.module_sections[0]?.count ?? 0) : 0;
  const continueSectionsDone = continueStatus === "In progress" ? Math.ceil(continueSectionsTotal / 2) : 0;

  // Real venue photography (tagged "module" in the photo library, matching
  // this module) is preferred when available. TEMPORARY fallback: stock
  // photography, explicitly acknowledged as a Branding Kit anti-pattern
  // violation, accepted knowingly until a venue has real photos uploaded —
  // replace once the venue's photo library has module-tagged photos.
  const continuePhotoPath = continueModule ? ((modulePhotos ?? []).find((p) => p.module_id === continueModule.id)?.storage_path ?? null) : null;
  const activityPhotoPath = activityTaggedPhoto?.storage_path ?? null;
  // Both photos signed in one storage call.
  const signed = await t.step(
    "signedUrls",
    getPhotoLibraryUrls([continuePhotoPath, activityPhotoPath].filter((p): p is string => !!p)),
  );
  const continuePhotoUrl: string | null = continueModule
    ? continuePhotoPath
      ? (signed.get(continuePhotoPath) ?? null)
      : "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=640&h=480&fit=crop"
    : null;
  const activityPhotoUrl =
    (activityPhotoPath ? signed.get(activityPhotoPath) : undefined) ??
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=640&h=480&fit=crop";

  const cadence = (staff.venue?.certNudgeCadence ?? [30, 14, 7]).slice().sort((a, b) => a - b);
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

  // Temperature log tile: BOH staff and manager tier only. Absent entirely for everyone else. The numbers are the
  // hub's own B2 overview (the same loadB2Overview call the page used to make a second time).
  const hub = hubResult.hub;
  const temperature: { done: number; total: number; openFlags: number; degraded: boolean } | undefined = canSubmitForm(COMPLIANCE_FORMS.B2, {
    isManagerTier: staff.isManagerTier,
    department: staff.department,
  })
    ? hub
      ? { done: hub.b2.doneToday, total: hub.b2.total, openFlags: hub.b2.openFlags, degraded: hub.b2.degraded }
      : { done: 0, total: 0, openFlags: 0, degraded: true }
    : undefined;

  // Compliance forms tile: every staff member. Counts come from the hub loader; a failure shows a quiet message, never a clean zero.
  let forms: { todo: number; overdue: number; degraded: boolean };
  if (hub) {
    const mine = hub.forms.filter((f) => f.on && f.canFill);
    forms = {
      todo: mine.filter((f) => f.status.status === "not_started" || f.status.status === "overdue").length,
      overdue: mine.filter((f) => f.status.status === "overdue").length,
      degraded: hub.degraded,
    };
  } else {
    forms = { todo: 0, overdue: 0, degraded: true };
  }

  t.end();

  const hour = now.getHours();
  const timeGreeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  // Same "most notable" ranking as the owner dashboard: near-miss patterns
  // (a real physical incident) before escalation patterns before repeated
  // gaps, tie-broken by recency.
  const SIGNAL_PRIORITY: Record<string, number> = { near_miss_pattern: 0, escalation_pattern: 1, repeated_gap: 2 };
  const sortedSuggestions = (suggestionRows.data ?? [])
    .slice()
    .sort((a, b) => {
      const priorityDiff = (SIGNAL_PRIORITY[a.signal_type] ?? 3) - (SIGNAL_PRIORITY[b.signal_type] ?? 3);
      if (priorityDiff !== 0) return priorityDiff;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });

  return (
    <BentoGrid
      venueSlug={venueSlug}
      staffName={staff.name}
      venueName={staff.venue?.name ?? ""}
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
      stations={stationsWithQr}
      temperature={temperature}
      forms={forms}
      suggestions={staff.isManagerTier ? { count: sortedSuggestions.length, preview: sortedSuggestions[0]?.headline ?? null } : undefined}
    />
  );
}
