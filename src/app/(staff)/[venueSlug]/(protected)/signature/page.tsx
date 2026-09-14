import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SignatureForm } from "@/components/staff/SignatureForm";
import { logQueryError } from "@/lib/supabase/logQueryError";

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
  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("id, module_roles(role_id)")
    .eq("venue_id", staff.venue_id!)
    .in("status", ["approved", "live"]);
  logQueryError("signature/page modules", modulesError);
  // Fail closed, not open: `[].every(...)` is vacuously true, so a query
  // error here must never fall through to the completion-gate math below
  // as if the venue simply had zero modules -- that would let a staff
  // member reach a real e-signature attestation without actually having
  // their completion checked. Redirect exactly like the real "not done
  // yet" case (below), not a different error path, since the risk here
  // is specifically about not silently treating "unknown" as "done."
  if (modulesError) redirect(`/${venueSlug}/modules`);

  const visibleModuleIds = (modules ?? [])
    .filter(
      (m) =>
        m.module_roles.length === 0 ||
        m.module_roles.some((mr) => mr.role_id === staff.staff_role_id),
    )
    .map((m) => m.id);

  const { data: progress, error: progressError } =
    visibleModuleIds.length > 0
      ? await supabase
          .from("staff_module_progress")
          .select("module_id, status")
          .eq("user_id", staff.id)
          .in("module_id", visibleModuleIds)
      : { data: [], error: null };
  logQueryError("signature/page progress", progressError);
  // Already fails closed on error (an empty completedModuleIds set makes
  // allModulesDone false whenever visibleModuleIds is non-empty), unlike
  // the two queries above -- logged for observability, not blocked.

  const completedModuleIds = new Set(
    (progress ?? []).filter((p) => p.status === "completed").map((p) => p.module_id),
  );
  const allModulesDone = visibleModuleIds.every((id) => completedModuleIds.has(id));

  const { data: certTypes, error: certTypesError } = await supabase
    .from("certificate_types")
    .select("id, certificate_type_roles(role_id)")
    .eq("venue_id", staff.venue_id!);
  logQueryError("signature/page certTypes", certTypesError);
  // Same fail-closed reasoning as the modules query above.
  if (certTypesError) redirect(`/${venueSlug}/modules`);

  // Same role-visibility filter as the certs checklist (certs/page.tsx) —
  // this gate must only require certs actually relevant to this role, not
  // every cert type the venue has ever defined.
  const visibleCertTypes = (certTypes ?? []).filter(
    (ct) =>
      ct.certificate_type_roles.length === 0 ||
      ct.certificate_type_roles.some((r) => r.role_id === staff.staff_role_id),
  );

  const { data: certs, error: certsError } = await supabase
    .from("staff_certificates")
    .select("certificate_type_id")
    .eq("user_id", staff.id);
  logQueryError("signature/page certs", certsError);
  // Already fails closed on error, same reasoning as progress above.

  const certifiedTypeIds = new Set((certs ?? []).map((c) => c.certificate_type_id));
  const allCertsDone = visibleCertTypes.every((ct) => certifiedTypeIds.has(ct.id));

  if (!allModulesDone || !allCertsDone) {
    redirect(`/${venueSlug}/modules`);
  }

  return <SignatureForm venueSlug={venueSlug} />;
}
