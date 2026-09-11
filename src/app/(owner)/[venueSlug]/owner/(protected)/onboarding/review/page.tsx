import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { ReviewAndActivateStep } from "@/components/onboarding/ReviewAndActivateStep";
import type { VenueTypeFlags } from "@/lib/onboarding/steps";

export default async function ReviewPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [
    { data: venue },
    { data: session },
    staffCount,
    staffRoleCount,
    moduleRows,
    certTypeRows,
    menuItemCount,
    contactCount,
    keyRoleRows,
  ] = await Promise.all([
    supabase.from("venues").select("name").eq("id", staff!.venue_id!).maybeSingle(),
    supabase.from("wizard_sessions").select("venue_type_flags").eq("venue_id", staff!.venue_id!).maybeSingle(),
    supabase.from("app_users").select("id", { count: "exact", head: true }).eq("venue_id", staff!.venue_id!).neq("role", "owner"),
    supabase.from("staff_roles").select("id", { count: "exact", head: true }).eq("venue_id", staff!.venue_id!),
    supabase.from("modules").select("status").eq("venue_id", staff!.venue_id!),
    supabase.from("certificate_types").select("id, name, certificate_type_roles(role_id)").eq("venue_id", staff!.venue_id!),
    supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("venue_id", staff!.venue_id!),
    supabase.from("venue_contacts").select("id", { count: "exact", head: true }).eq("venue_id", staff!.venue_id!),
    supabase.from("venue_key_roles").select("role_type, name, app_user_id").eq("venue_id", staff!.venue_id!),
  ]);

  const flags = (session?.venue_type_flags as VenueTypeFlags | null) ?? {};
  const modules = moduleRows.data ?? [];
  const certTypes = certTypeRows.data ?? [];
  const keyRoles = keyRoleRows.data ?? [];

  // Completeness checks that RSA/Food service pages can no longer enforce
  // themselves (Block Q6 found requiring Staff roles -- a later page -- to
  // exist before saving trapped the marshal/FSS identity fields behind it;
  // fixed by making role-linkage optional to save, checked here instead).
  const outstandingItems: string[] = [];
  const rsaType = certTypes.find((c) => c.name === "RSA");
  if (rsaType && (rsaType.certificate_type_roles?.length ?? 0) === 0) {
    outstandingItems.push("No staff roles selected yet for RSA certification.");
  }
  const foodHandlingType = certTypes.find((c) => c.name === "Food Handling");
  if (foodHandlingType && (foodHandlingType.certificate_type_roles?.length ?? 0) === 0) {
    outstandingItems.push("No staff roles selected yet for Food Handling certification.");
  }
  for (const role of keyRoles) {
    if (!role.app_user_id) {
      const label = role.role_type === "rsa_marshal" ? "RSA marshal" : "Food Safety Supervisor";
      outstandingItems.push(`${label} ${role.name} doesn't have a Larder login yet — invite them under Staff and link it.`);
    }
  }
  if (flags.licensed && flags.capacity_sourced_from_document !== true) {
    outstandingItems.push("Licensed capacity and trading hours are unconfirmed against the actual licence document — verify before relying on them.");
  }

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
        certificateTypeCount: certTypes.length,
        menuItemCount: menuItemCount.count ?? 0,
        contactCount: contactCount.count ?? 0,
      }}
      outstandingItems={outstandingItems}
    />
  );
}
