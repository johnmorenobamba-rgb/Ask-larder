import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { IdleSignOut } from "@/components/staff/IdleSignOut";

// Station screens are a sibling of (protected), so they never inherited its
// venue iPad idle sign out: a person who signed in on the iPad and walked away
// on a station page stayed signed in. Same rule as the protected layout: iPad
// mode on, a real person (never the shared device account). Auth and station
// checks stay in requireStationContext on each page.
export default async function StationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();

  let ipadMode = false;
  if (staff && !staff.isDevice && staff.venue_id) {
    const supabase = await createClient();
    const { data: venue } = await supabase
      .from("venues")
      .select("ipad_mode_enabled")
      .eq("id", staff.venue_id)
      .maybeSingle();
    ipadMode = !!venue?.ipad_mode_enabled;
  }

  return (
    <>
      {ipadMode && <IdleSignOut venueSlug={venueSlug} />}
      {children}
    </>
  );
}
