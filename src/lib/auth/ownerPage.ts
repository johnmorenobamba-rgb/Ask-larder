import { redirect } from "next/navigation";
import { getCurrentStaff, type CurrentStaff } from "@/lib/auth/session";

// Owner pages render at the same time as the owner layout, so a page cannot assume the layout's redirect has already stopped an
// unauthenticated request: dereferencing a missing session threw a TypeError that was logged as a runtime error before the
// layout's redirect won. This gives pages the same redirect (same target as the layout), with the staff row typed as present.
export async function requireOwnerPageStaff(venueSlug: string): Promise<CurrentStaff & { venue_id: string }> {
  const staff = await getCurrentStaff();
  if (!staff || !staff.isManagerTier || !staff.venue_id) {
    redirect(`/${venueSlug}/owner/login`);
  }
  return staff as CurrentStaff & { venue_id: string };
}
