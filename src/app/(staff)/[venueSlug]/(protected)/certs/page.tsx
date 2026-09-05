import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PassSlide } from "@/components/staff/PassSlide";
import { PressableLink } from "@/components/shared/PressableLink";

export default async function CertsPage({
  params,
}: {
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();

  const { data: certTypes } = await supabase
    .from("certificate_types")
    .select("id, name, certificate_type_roles(role_id)")
    .eq("venue_id", staff.venue_id!)
    .order("name");

  // Same "zero rows = unrestricted" convention as module_roles (see
  // modules/page.tsx) — a cert type with no certificate_type_roles rows
  // applies to every role, otherwise only to the roles explicitly listed.
  const visibleCertTypes = (certTypes ?? []).filter(
    (ct) =>
      ct.certificate_type_roles.length === 0 ||
      ct.certificate_type_roles.some((r) => r.role_id === staff.staff_role_id),
  );

  const { data: certs } = await supabase
    .from("staff_certificates")
    .select("certificate_type_id, expiry_date")
    .eq("user_id", staff.id);

  const certByType = new Map((certs ?? []).map((c) => [c.certificate_type_id, c.expiry_date]));

  return (
    <main className="min-h-screen bg-parchment px-6 pb-10 pt-24">
      <PassSlide>
        <div className="mx-auto w-full max-w-lg space-y-6">
          <h1 className="font-display text-3xl font-bold text-ink">Your certificates</h1>
          {visibleCertTypes.length === 0 ? (
            <p className="font-sans text-ink">
              No certificates required for your venue yet. Ask your supervisor if you think
              that&apos;s wrong.
            </p>
          ) : (
            <ul className="space-y-2">
              {visibleCertTypes.map((certType) => {
                const expiry = certByType.get(certType.id);
                return (
                  <li key={certType.id}>
                    <PressableLink
                      href={`/${venueSlug}/certs/${certType.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border-2 border-clay-brown/20 px-4 py-4 hover:border-preserve-red"
                    >
                      <span className="font-sans text-ink">{certType.name}</span>
                      <span className="font-mono text-xs text-clay-brown">
                        {expiry ? `Expires ${expiry}` : "Not uploaded"}
                      </span>
                    </PressableLink>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PassSlide>
    </main>
  );
}
