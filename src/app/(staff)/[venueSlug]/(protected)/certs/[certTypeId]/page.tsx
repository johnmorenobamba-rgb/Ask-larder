import { redirect, notFound } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getCertPhotoUrl } from "@/lib/staff/certPhotoUrl";
import { CertUploadForm } from "@/components/staff/CertUploadForm";

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

  const { data: certType } = await supabase
    .from("certificate_types")
    .select("id, name")
    .eq("id", certTypeId)
    .single();
  if (!certType) notFound();

  const { data: existing } = await supabase
    .from("staff_certificates")
    .select("photo_ref, issued_date, expiry_date")
    .eq("user_id", staff.id)
    .eq("certificate_type_id", certTypeId)
    .maybeSingle();

  const existingPhotoUrl = existing?.photo_ref ? await getCertPhotoUrl(existing.photo_ref) : null;

  return (
    <CertUploadForm
      venueSlug={venueSlug}
      venueId={staff.venue_id!}
      userId={staff.id}
      certTypeId={certType.id}
      certTypeName={certType.name}
      existingIssuedDate={existing?.issued_date ?? null}
      existingExpiryDate={existing?.expiry_date ?? null}
      existingPhotoRef={existing?.photo_ref ?? null}
      existingPhotoUrl={existingPhotoUrl}
    />
  );
}
