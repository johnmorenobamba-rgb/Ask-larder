import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { OwnerNav } from "@/components/owner/OwnerNav";
import { logQueryError } from "@/lib/supabase/logQueryError";

// Mirrors (staff)/[venueSlug]/(protected)/layout.tsx's per-page session gate
// -- no middleware, it was removed project-wide and stays removed. Checks
// role (owner/manager only) on top of the session check the staff layout
// already does, plus a venue-slug match: cheap defense against an owner
// from venue A landing on venue B's URL and hitting a confusing failure
// deep in a query instead of a clean redirect (RLS already prevents any
// actual cross-venue read, this is just a better failure mode).
export default async function OwnerProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();

  if (!staff || !["owner", "manager"].includes(staff.role)) {
    redirect(`/${venueSlug}/owner/login`);
  }

  const supabase = await createClient();
  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id, slug, name")
    .eq("id", staff.venue_id!)
    .maybeSingle();
  // A real query failure here used to redirect to login exactly like "not
  // the right owner" -- indistinguishable from a wrong credential, the
  // exact confusion that cost real debugging time this session. Can't
  // show a distinct message from a layout without a bigger redesign, but
  // it must never be silent: logged clearly so a real failure is at least
  // diagnosable from the server logs instead of leaving zero trace.
  if (venueError) logQueryError(`[${venueSlug}] owner protected layout venues`, venueError);
  if (!venue || venue.slug !== venueSlug) {
    redirect(`/${venueSlug}/owner/login`);
  }

  return (
    <>
      <OwnerNav venueSlug={venueSlug} venueName={venue.name} />
      {children}
    </>
  );
}
