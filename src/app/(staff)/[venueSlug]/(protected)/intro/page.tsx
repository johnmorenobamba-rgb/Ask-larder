import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AskLarderExplainer } from "@/components/staff/AskLarderExplainer";

export default async function IntroPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);

  // Shown once per user, ever. There's no replay entry point yet (that's
  // the personal dashboard's job, Block E territory) so a direct hit on
  // this route after the flag is already set just returns to the app
  // rather than replaying an unskippable sequence a second time.
  if (staff.has_seen_ask_larder_intro) {
    redirect(`/${venueSlug}/modules`);
  }

  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("name")
    .eq("id", staff.venue_id!)
    .single();

  return <AskLarderExplainer venueSlug={venueSlug} venueName={venue?.name ?? "this kitchen"} />;
}
