import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

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
  const { data: venue } = await supabase.from("venues").select("id, slug").eq("id", staff.venue_id!).maybeSingle();
  if (!venue || venue.slug !== venueSlug) {
    redirect(`/${venueSlug}/owner/login`);
  }

  return <>{children}</>;
}
