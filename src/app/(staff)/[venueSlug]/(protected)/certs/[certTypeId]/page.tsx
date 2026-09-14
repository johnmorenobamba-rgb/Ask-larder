import { redirect, notFound } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getCertPhotoUrl } from "@/lib/staff/certPhotoUrl";
import { CertUploadForm } from "@/components/staff/CertUploadForm";
import { logQueryError } from "@/lib/supabase/logQueryError";

export default async function CertUploadPage({
  params,
}: {
  params: Promise<{ venueSlug: string; certTypeId: string }>;
}) {
  const { venueSlug, certTypeId } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();

  const { data: certType, error: certTypeError } = await supabase
    .from("certificate_types")
    .select("id, name, tracking_type, validity_years, certificate_type_roles(role_id)")
    .eq("id", certTypeId)
    .single();
  logQueryError(`[${venueSlug}] cert upload certType`, certTypeError);
  if (!certType) notFound();

  // Same "zero rows = unrestricted" convention as the certs checklist —
  // block direct-URL access to a cert type restricted to other roles.
  const isVisible =
    certType.certificate_type_roles.length === 0 ||
    certType.certificate_type_roles.some((r) => r.role_id === staff.staff_role_id);
  if (!isVisible) notFound();

  const { data: existing, error: existingError } = await supabase
    .from("staff_certificates")
    .select("photo_ref, issued_date, expiry_date")
    .eq("user_id", staff.id)
    .eq("certificate_type_id", certTypeId)
    .maybeSingle();
  logQueryError(`[${venueSlug}] cert upload existing`, existingError);

  const existingPhotoUrl = existing?.photo_ref ? await getCertPhotoUrl(existing.photo_ref) : null;

  return (
    <CertUploadForm
      venueSlug={venueSlug}
      venueId={staff.venue_id!}
      userId={staff.id}
      certTypeId={certType.id}
      certTypeName={certType.name}
      trackingType={certType.tracking_type as "hard_expiry" | "recommended_refresher"}
      validityYears={certType.validity_years}
      existingIssuedDate={existing?.issued_date ?? null}
      existingPhotoRef={existing?.photo_ref ?? null}
      existingPhotoUrl={existingPhotoUrl}
    />
  );
}
