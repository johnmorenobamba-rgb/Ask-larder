import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SignatureForm } from "@/components/staff/SignatureForm";

export default async function SignaturePage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();

  // Same role-visibility filter as the module checklist — signing off is
  // only unlocked once every module actually assigned to this role, plus
  // every venue-wide required certificate, is done.
  const { data: modules } = await supabase
    .from("modules")
    .select("id, module_roles(role_id)")
    .eq("venue_id", staff.venue_id!)
    .in("status", ["approved", "live"]);

  const visibleModuleIds = (modules ?? [])
    .filter(
      (m) =>
        m.module_roles.length === 0 ||
        m.module_roles.some((mr) => mr.role_id === staff.staff_role_id),
    )
    .map((m) => m.id);

  const { data: progress } =
    visibleModuleIds.length > 0
      ? await supabase
          .from("staff_module_progress")
          .select("module_id, status")
          .eq("user_id", staff.id)
          .in("module_id", visibleModuleIds)
      : { data: [] };

  const completedModuleIds = new Set(
    (progress ?? []).filter((p) => p.status === "completed").map((p) => p.module_id),
  );
  const allModulesDone = visibleModuleIds.every((id) => completedModuleIds.has(id));

  const { data: certTypes } = await supabase
    .from("certificate_types")
    .select("id, certificate_type_roles(role_id)")
    .eq("venue_id", staff.venue_id!);

  // Same role-visibility filter as the certs checklist (certs/page.tsx) —
  // this gate must only require certs actually relevant to this role, not
  // every cert type the venue has ever defined.
  const visibleCertTypes = (certTypes ?? []).filter(
    (ct) =>
      ct.certificate_type_roles.length === 0 ||
      ct.certificate_type_roles.some((r) => r.role_id === staff.staff_role_id),
  );

  const { data: certs } = await supabase
    .from("staff_certificates")
    .select("certificate_type_id")
    .eq("user_id", staff.id);

  const certifiedTypeIds = new Set((certs ?? []).map((c) => c.certificate_type_id));
  const allCertsDone = visibleCertTypes.every((ct) => certifiedTypeIds.has(ct.id));

  if (!allModulesDone || !allCertsDone) {
    redirect(`/${venueSlug}/modules`);
  }

  return <SignatureForm venueSlug={venueSlug} />;
}
