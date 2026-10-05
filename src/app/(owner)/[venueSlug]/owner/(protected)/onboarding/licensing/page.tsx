import { createClient } from "@/lib/supabase/server";
import { requireOwnerPageStaff } from "@/lib/auth/ownerPage";
import { LicensingGateForm } from "@/components/onboarding/LicensingGateForm";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { getPreviousStep } from "@/lib/onboarding/steps";
import { logQueryError } from "@/lib/supabase/logQueryError";

export default async function LicensingPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await requireOwnerPageStaff(venueSlug);
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("venue_licence_profile")
    .select("licence_status")
    .eq("venue_id", staff!.venue_id!)
    .maybeSingle();
  logQueryError(`[${venueSlug}] onboarding licensing profile`, profileError);

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("licensing", {})} />
      <LicensingGateForm venueSlug={venueSlug} initial={profile?.licence_status ?? ""} />
    </>
  );
}
