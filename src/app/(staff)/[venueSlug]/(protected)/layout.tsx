import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOutstandingAcknowledgements } from "@/lib/staff/outstandingAcknowledgements";
import { NearMissReportButton } from "@/components/staff/NearMissReportButton";
import { AskLarderChat } from "@/components/staff/AskLarderChat";
import { StaffTopBar } from "@/components/staff/StaffTopBar";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { DeviceHeader } from "@/components/staff/DeviceHeader";
import { IdleSignOut } from "@/components/staff/IdleSignOut";
import { logQueryError } from "@/lib/supabase/logQueryError";
import { COMPLIANCE_FORMS, canSubmitForm } from "@/lib/compliance/catalog";
import { getStaffDepartment } from "@/lib/compliance/b2Data";

// Gates every route under [venueSlug]/(protected)/* behind an active staff
// session. `login` is a sibling of (protected), not nested inside it, so it
// never hits this redirect itself. Same for `module-updates` (the
// re-acknowledgement interstitial below) — it does its own session check,
// so redirecting to it here can't loop.
export default async function ProtectedStaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();

  if (!staff) {
    redirect(`/${venueSlug}/login`);
  }

  // The shared venue iPad account has nothing to acknowledge and no role, so it skips that check.
  const outstanding = staff.isDevice ? [] : await getOutstandingAcknowledgements(staff.id);
  if (outstanding.length > 0) {
    redirect(`/${venueSlug}/module-updates`);
  }

  let venueName = "";
  let ipadMode = false;
  // Temperature log nav item: BOH staff plus manager tier and owners (catalog audience).
  let showTemperature = staff.isManagerTier;
  if (staff.venue_id) {
    const supabase = await createClient();
    if (!showTemperature) {
      const dept = await getStaffDepartment(supabase, staff.staff_role_id);
      showTemperature = canSubmitForm(COMPLIANCE_FORMS.B2, { isManagerTier: false, department: dept.department });
    }
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("name, ipad_mode_enabled")
      .eq("id", staff.venue_id)
      .maybeSingle();
    logQueryError(`[${venueSlug}] staff protected layout venues`, venueError);
    venueName = venue?.name ?? "";
    ipadMode = !!venue?.ipad_mode_enabled;
  }

  // Venue iPad mode: the device account is only valid while the venue has the setting on.
  if (staff.isDevice) {
    if (!ipadMode) redirect(`/${venueSlug}/login`);
    return (
      <>
        <DeviceHeader venueSlug={venueSlug} venueName={venueName} />
        {children}
        <AskLarderChat venueSlug={venueSlug} />
      </>
    );
  }

  return (
    <>
      {venueName && <StaffTopBar venueName={venueName} />}
      <StaffHeader venueSlug={venueSlug} venueName={venueName} showTemperature={showTemperature} ipadMode={ipadMode} />
      {ipadMode && <IdleSignOut venueSlug={venueSlug} />}
      {/* On a phone the two floating buttons (near miss, Ask Larder) sit in the bottom corners: leave room under every page so a primary action is never underneath them. */}
      <style>{`@media (max-width: 639px) { main { padding-bottom: 6rem !important; } [data-near-miss-fab] { bottom: 1rem !important; } }`}</style>
      {children}
      {staff.venue_id && (
        <>
          <NearMissReportButton venueSlug={venueSlug} venueId={staff.venue_id} />
          <AskLarderChat venueSlug={venueSlug} />
        </>
      )}
    </>
  );
}
