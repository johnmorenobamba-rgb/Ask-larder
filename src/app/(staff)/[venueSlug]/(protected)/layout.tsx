import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOutstandingAcknowledgements } from "@/lib/staff/outstandingAcknowledgements";
import { NearMissReportButton } from "@/components/staff/NearMissReportButton";
import { AskLarderChat } from "@/components/staff/AskLarderChat";
import { StaffTopBar } from "@/components/staff/StaffTopBar";
import { StaffHeader } from "@/components/staff/StaffHeader";
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

  const outstanding = await getOutstandingAcknowledgements(staff.id);
  if (outstanding.length > 0) {
    redirect(`/${venueSlug}/module-updates`);
  }

  let venueName = "";
  // Temperature log nav item: BOH staff plus manager tier and owners (catalog audience).
  let showTemperature = staff.isManagerTier;
  if (staff.venue_id) {
    const supabase = await createClient();
    if (!showTemperature) {
      const dept = await getStaffDepartment(supabase, staff.staff_role_id);
      showTemperature = canSubmitForm(COMPLIANCE_FORMS.B2, { isManagerTier: false, department: dept.department });
    }
    const { data: venue, error: venueError } = await supabase.from("venues").select("name").eq("id", staff.venue_id).maybeSingle();
    logQueryError(`[${venueSlug}] staff protected layout venues`, venueError);
    venueName = venue?.name ?? "";
  }

  return (
    <>
      {venueName && <StaffTopBar venueName={venueName} />}
      <StaffHeader venueSlug={venueSlug} venueName={venueName} showTemperature={showTemperature} />
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
