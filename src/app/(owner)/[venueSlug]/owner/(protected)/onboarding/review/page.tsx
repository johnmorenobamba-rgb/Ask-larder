import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { ReviewAndActivateStep } from "@/components/onboarding/ReviewAndActivateStep";
import type { VenueTypeFlags } from "@/lib/onboarding/steps";

export default async function ReviewPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: venue }, { data: session }, staffCount, staffRoleCount, moduleRows, certTypeCount, menuItemCount, contactCount] =
    await Promise.all([
      supabase.from("venues").select("name").eq("id", staff!.venue_id!).maybeSingle(),
      supabase.from("wizard_sessions").select("venue_type_flags").eq("venue_id", staff!.venue_id!).maybeSingle(),
      supabase.from("app_users").select("id", { count: "exact", head: true }).eq("venue_id", staff!.venue_id!).neq("role", "owner"),
      supabase.from("staff_roles").select("id", { count: "exact", head: true }).eq("venue_id", staff!.venue_id!),
      supabase.from("modules").select("status").eq("venue_id", staff!.venue_id!),
      supabase.from("certificate_types").select("id", { count: "exact", head: true }).eq("venue_id", staff!.venue_id!),
      supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("venue_id", staff!.venue_id!),
      supabase.from("venue_contacts").select("id", { count: "exact", head: true }).eq("venue_id", staff!.venue_id!),
    ]);

  const flags = (session?.venue_type_flags as VenueTypeFlags | null) ?? {};
  const modules = moduleRows.data ?? [];

  return (
    <ReviewAndActivateStep
      venueSlug={venueSlug}
      venueName={venue?.name ?? venueSlug}
      flags={flags}
      summary={{
        staffCount: staffCount.count ?? 0,
        staffRoleCount: staffRoleCount.count ?? 0,
        moduleCount: modules.length,
        pendingModuleCount: modules.filter((m) => m.status === "pending_approval").length,
        certificateTypeCount: certTypeCount.count ?? 0,
        menuItemCount: menuItemCount.count ?? 0,
        contactCount: contactCount.count ?? 0,
      }}
    />
  );
}
