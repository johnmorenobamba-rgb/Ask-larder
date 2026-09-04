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

  const [{ data: venue }, { data: modules }, { data: progress }, { data: certTypes }, { data: certs }, stationsWithQr] =
    await Promise.all([
      supabase.from("venues").select("name, cert_nudge_cadence").eq("id", staff.venue_id!).single(),
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

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

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
      stations={stationsWithQr}
    />
  );
}
