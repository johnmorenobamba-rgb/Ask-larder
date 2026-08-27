import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CompleteScreen } from "@/components/staff/CompleteScreen";

export default async function CompletePage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);

  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("name")
    .eq("id", staff.venue_id!)
    .single();

  return (
    <CompleteScreen
      venueSlug={venueSlug}
      staffName={staff.name}
      venueName={venue?.name ?? "the team"}
      completedDate={new Date().toLocaleDateString()}
      hasSeenIntro={staff.has_seen_ask_larder_intro}
    />
  );
}
