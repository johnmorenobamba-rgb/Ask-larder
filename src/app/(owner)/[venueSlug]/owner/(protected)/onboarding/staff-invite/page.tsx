import { createClient } from "@/lib/supabase/server";
import { requireOwnerPageStaff } from "@/lib/auth/ownerPage";
import { StaffInviteForm } from "@/components/onboarding/StaffInviteForm";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { getPreviousStep } from "@/lib/onboarding/steps";
import { logQueryError } from "@/lib/supabase/logQueryError";

export default async function StaffInvitePage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await requireOwnerPageStaff(venueSlug);
  const supabase = await createClient();

  const [{ data: staffRoles, error: staffRolesError }, { data: existing, error: existingError }] = await Promise.all([
    supabase.from("staff_roles").select("id, name").eq("venue_id", staff!.venue_id!).order("name"),
    supabase
      .from("app_users")
      .select("id, name, email, phone, auth_id, staff_roles(name)")
      .eq("venue_id", staff!.venue_id!)
      .neq("role", "owner")
      .order("name"),
  ]);
  logQueryError(`[${venueSlug}] onboarding staff-invite staffRoles`, staffRolesError);
  logQueryError(`[${venueSlug}] onboarding staff-invite existing`, existingError);

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("staff-invite", {})} />
      <StaffInviteForm venueSlug={venueSlug} staffRoles={staffRoles ?? []} existing={existing ?? []} />
    </>
  );
}
