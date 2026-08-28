import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { getOutstandingAcknowledgements } from "@/lib/staff/outstandingAcknowledgements";
import { NearMissReportButton } from "@/components/staff/NearMissReportButton";
import { AskLarderChat } from "@/components/staff/AskLarderChat";

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

  return (
    <>
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
