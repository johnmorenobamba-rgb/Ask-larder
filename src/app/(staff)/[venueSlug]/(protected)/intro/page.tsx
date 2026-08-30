import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AskLarderExplainer } from "@/components/staff/AskLarderExplainer";

export default async function IntroPage({
  params,
  searchParams,
}: {
  params: Promise<{ venueSlug: string }>;
  searchParams: Promise<{ replay?: string }>;
}) {
  const { venueSlug } = await params;
  const { replay } = await searchParams;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);

  // Shown once per user, ever, unless explicitly replayed from Settings'
  // "How Ask Larder works" link (?replay=1) — replaying doesn't touch the
  // has_seen_ask_larder_intro flag, it's just a rewatch.
  if (staff.has_seen_ask_larder_intro && !replay) {
    redirect(`/${venueSlug}/home`);
  }

  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("name")
    .eq("id", staff.venue_id!)
    .single();

  return (
    <AskLarderExplainer
      venueSlug={venueSlug}
      venueName={venue?.name ?? "this kitchen"}
      redirectTo={replay ? `/${venueSlug}/settings` : `/${venueSlug}/home`}
    />
  );
}
