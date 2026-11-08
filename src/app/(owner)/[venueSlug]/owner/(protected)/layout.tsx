import { redirect } from "next/navigation";
import { startTimer } from "@/lib/perf/timing";
import { getCurrentStaff } from "@/lib/auth/session";
import { OwnerHeader } from "@/components/owner/OwnerHeader";

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
  const t = startTimer(`owner-layout ${venueSlug}`);
  const staff = await t.step("getCurrentStaff", getCurrentStaff());

  if (!staff || !staff.isManagerTier) {
    redirect(`/${venueSlug}/owner/login`);
  }

  // The venue comes embedded in the session lookup (getCurrentStaff), so no
  // second venues query. A failure of that lookup is logged there
  // (logQueryError "getCurrentStaff app_users"), so a real query failure
  // still leaves a trace in the server logs instead of looking exactly like
  // a wrong credential.
  const venue = staff.venue;
  if (!staff.venue_id || !venue || venue.slug !== venueSlug) {
    redirect(`/${venueSlug}/owner/login`);
  }

  t.end();

  return (
    <>
      <OwnerHeader venueSlug={venueSlug} venueName={venue.name} />
      <div className="pt-24 print:pt-0">{children}</div>
    </>
  );
}
