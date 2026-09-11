import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { CrowdControlForm } from "@/components/onboarding/CrowdControlForm";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { getPreviousStep } from "@/lib/onboarding/steps";
import { SECURITY_FIRM_CONTACT_TYPE, CROWD_CONTROL_LICENCES_CONTACT_TYPE } from "@/lib/onboarding/constants";

export default async function CrowdControlPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("venue_contacts")
    .select("contact_type, name, notes")
    .eq("venue_id", staff!.venue_id!)
    .in("contact_type", [SECURITY_FIRM_CONTACT_TYPE, CROWD_CONTROL_LICENCES_CONTACT_TYPE]);

  const securityFirm = contacts?.find((c) => c.contact_type === SECURITY_FIRM_CONTACT_TYPE);
  const controllerLicences = contacts?.find((c) => c.contact_type === CROWD_CONTROL_LICENCES_CONTACT_TYPE);

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("crowd-control", {})} />
      <CrowdControlForm
        venueSlug={venueSlug}
        initial={{
          required: Boolean(securityFirm || controllerLicences),
          securityFirmName: securityFirm?.name ?? "",
          controllerLicenceNumbers: controllerLicences?.notes ?? "",
        }}
      />
    </>
  );
}
