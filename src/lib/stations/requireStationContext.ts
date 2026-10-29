import "server-only";
import { redirect, notFound } from "next/navigation";
import { getCurrentStaff, type CurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOutstandingAcknowledgements } from "@/lib/staff/outstandingAcknowledgements";
import { logQueryError } from "@/lib/supabase/logQueryError";

export type StationSummary = { id: string; name: string; primary_module_id: string | null };

/**
 * Shared session/station guard for every screen under
 * /[venueSlug]/station/[qrCodeSlug]/... (the hub and its three
 * sub-screens). Station entry is a sibling of (protected), so none of
 * these pages inherit that layout's auth/re-acknowledgement gate -- each
 * one checks it directly via this helper, otherwise a staff member who
 * only ever enters via QR scan would never see it.
 */
export async function requireStationContext(
  venueSlug: string,
  qrCodeSlug: string,
  currentPath: string,
): Promise<{ staff: CurrentStaff; station: StationSummary; ipadMode: boolean }> {
  const staff = await getCurrentStaff();
  if (!staff) {
    redirect(`/${venueSlug}/login?redirectTo=${encodeURIComponent(currentPath)}`);
  }
  // Known gap accepted for v1: a staff member with no role yet loses this
  // return-to after selecting a role (bounces to /modules instead).
  if (!staff.staff_role_id && !staff.isDevice) redirect(`/${venueSlug}/roles`);

  const outstanding = staff.isDevice ? [] : await getOutstandingAcknowledgements(staff.id);
  if (outstanding.length > 0) redirect(`/${venueSlug}/module-updates`);

  const supabase = await createClient();
  const { data: station, error: stationError } = await supabase
    .from("stations")
    .select("id, name, primary_module_id")
    .eq("qr_code_slug", qrCodeSlug)
    .eq("venue_id", staff.venue_id!)
    .maybeSingle();
  logQueryError(`[${venueSlug}/${qrCodeSlug}] station lookup`, stationError);
  // Station truly doesn't exist for this venue/slug (wrong QR, deleted
  // station) -- a genuine 404, not any of the "nothing here yet" states
  // the sub-screens render for a station that exists but has no content.
  // A real query error hits this same branch (logged above first) rather
  // than a distinct path -- can't show a different message from a shared
  // guard called before any page has rendered anything yet.
  if (!station) notFound();

  // Venue iPad mode: the device account is only valid while the venue has the setting on, and the station hub shows
  // the log out controls when it is on.
  const { data: venue } = await supabase.from("venues").select("ipad_mode_enabled").eq("id", staff.venue_id!).maybeSingle();
  const ipadMode = !!venue?.ipad_mode_enabled;
  if (staff.isDevice && !ipadMode) redirect(`/${venueSlug}/login`);

  return { staff, station, ipadMode };
}
