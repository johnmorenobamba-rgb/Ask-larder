import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { LicenceDetailForm } from "@/components/onboarding/LicenceDetailForm";

export default async function LicenceDetailPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("venue_licence_profile")
    .select("licence_type, licence_number, licensed_capacity, late_night_endorsement, conditions, approved_trading_hours")
    .eq("venue_id", staff!.venue_id!)
    .maybeSingle();

  return (
    <LicenceDetailForm
      venueSlug={venueSlug}
      initial={{
        licenceType: profile?.licence_type ?? "",
        licenceNumber: profile?.licence_number ?? "",
        licensedCapacity: profile?.licensed_capacity ? String(profile.licensed_capacity) : "",
        lateNightEndorsement: profile?.late_night_endorsement ?? false,
        conditions: profile?.conditions ?? "",
        tradingHours: (profile?.approved_trading_hours as Record<string, { closed: boolean; open: string; close: string }>) ?? {},
      }}
    />
  );
}
