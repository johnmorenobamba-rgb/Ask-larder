import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { getOutstandingAcknowledgements } from "@/lib/staff/outstandingAcknowledgements";
import { ModuleUpdateNotice } from "@/components/staff/ModuleUpdateNotice";

// Sibling of (protected), like login/station — owns its own session check
// so the (protected) layout's redirect here can't loop.
export default async function ModuleUpdatesPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);

  const outstanding = await getOutstandingAcknowledgements(staff.id);
  if (outstanding.length === 0) redirect(`/${venueSlug}/modules`);

  return <ModuleUpdateNotice venueSlug={venueSlug} outstanding={outstanding} />;
}
