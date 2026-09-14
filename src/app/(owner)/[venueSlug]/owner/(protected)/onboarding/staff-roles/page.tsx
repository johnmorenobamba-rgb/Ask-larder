import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { StaffRolesForm } from "@/components/onboarding/StaffRolesForm";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { getPreviousStep } from "@/lib/onboarding/steps";
import { logQueryError } from "@/lib/supabase/logQueryError";

export default async function StaffRolesPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: roles, error: rolesError }, { data: venue, error: venueError }] = await Promise.all([
    supabase.from("staff_roles").select("id, name, department, fallback_tier").eq("venue_id", staff!.venue_id!).order("name"),
    supabase.from("venues").select("roster_location").eq("id", staff!.venue_id!).maybeSingle(),
  ]);
  logQueryError(`[${venueSlug}] onboarding staff-roles roles`, rolesError);
  logQueryError(`[${venueSlug}] onboarding staff-roles venue`, venueError);

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("staff-roles", {})} />
      <StaffRolesForm venueSlug={venueSlug} existing={roles ?? []} initialRosterLocation={venue?.roster_location ?? ""} />
    </>
  );
}
