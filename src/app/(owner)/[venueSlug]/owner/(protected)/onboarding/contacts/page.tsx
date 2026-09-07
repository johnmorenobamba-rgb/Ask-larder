import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { VenueContactsForm } from "@/components/onboarding/VenueContactsForm";
import { CONTACT_TYPES } from "@/lib/onboarding/constants";

const BUSINESS_CONTINUITY_TYPES = CONTACT_TYPES.map((t) => t.value);

export default async function ContactsPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("venue_contacts")
    .select("id, contact_type, name, phone, email, notes")
    .eq("venue_id", staff!.venue_id!)
    .in("contact_type", BUSINESS_CONTINUITY_TYPES)
    .order("name");

  return <VenueContactsForm venueSlug={venueSlug} existing={contacts ?? []} />;
}
