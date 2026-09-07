import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { PromotionsForm } from "@/components/onboarding/PromotionsForm";

export default async function PromotionsPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: promotions } = await supabase
    .from("venue_promotions")
    .select("id, day_of_week, start_time, end_time, description")
    .eq("venue_id", staff!.venue_id!)
    .order("day_of_week");

  return <PromotionsForm venueSlug={venueSlug} existing={promotions ?? []} />;
}
