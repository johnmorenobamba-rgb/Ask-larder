import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";

// Gates every route under [venueSlug]/(protected)/* behind an active staff
// session. `login` is a sibling of (protected), not nested inside it, so it
// never hits this redirect itself.
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

  return <>{children}</>;
}
