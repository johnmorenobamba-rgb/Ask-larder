import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { VenueContactsForm } from "@/components/onboarding/VenueContactsForm";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { getPreviousStep, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { logQueryError } from "@/lib/supabase/logQueryError";

export default async function ContactsPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: contacts, error: contactsError }, { data: session, error: sessionError }] = await Promise.all([
    supabase
      .from("venue_contacts")
      .select("id, contact_type, name, phone, email, notes, check_first_step")
      .eq("venue_id", staff!.venue_id!)
      .order("name"),
    // Needed only for the Back link -- contacts' previous step branches on
    // licensed (promotions if licensed, equipment if not), the one other
    // branch point besides food-service. This page had no reason to fetch
    // flags before this fix.
    supabase.from("wizard_sessions").select("venue_type_flags").eq("venue_id", staff!.venue_id!).maybeSingle(),
  ]);
  logQueryError(`[${venueSlug}] onboarding contacts contacts`, contactsError);
  logQueryError(`[${venueSlug}] onboarding contacts session`, sessionError);
  const flags = (session?.venue_type_flags as VenueTypeFlags | null) ?? {};

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("contacts", flags)} />
      <VenueContactsForm venueSlug={venueSlug} existing={contacts ?? []} />
    </>
  );
}
