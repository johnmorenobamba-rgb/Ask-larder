import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { LicensingGateForm } from "@/components/onboarding/LicensingGateForm";

export default async function LicensingPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("venue_licence_profile")
    .select("licence_status")
    .eq("venue_id", staff!.venue_id!)
    .maybeSingle();

  return <LicensingGateForm venueSlug={venueSlug} initial={profile?.licence_status ?? ""} />;
}
