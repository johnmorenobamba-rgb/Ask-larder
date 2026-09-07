import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { VenueBasicsForm } from "@/components/onboarding/VenueBasicsForm";

export default async function VenueBasicsPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: venue }, { data: profile }] = await Promise.all([
    supabase.from("venues").select("name").eq("id", staff!.venue_id!).maybeSingle(),
    supabase.from("venue_licence_profile").select("legal_name, state, address, abn").eq("venue_id", staff!.venue_id!).maybeSingle(),
  ]);

  return (
    <VenueBasicsForm
      venueSlug={venueSlug}
      initial={{
        tradingName: venue?.name ?? "",
        legalName: profile?.legal_name ?? "",
        state: profile?.state ?? "",
        address: profile?.address ?? "",
        abn: profile?.abn ?? "",
      }}
    />
  );
}
