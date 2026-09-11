import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { RsaMarshalForm } from "@/components/onboarding/RsaMarshalForm";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { getPreviousStep, type VenueTypeFlags } from "@/lib/onboarding/steps";

export default async function RsaPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: staffRoles }, { data: certType }, { data: marshal }, { data: session }] = await Promise.all([
    supabase.from("staff_roles").select("id, name").eq("venue_id", staff!.venue_id!).order("name"),
    supabase.from("certificate_types").select("id").eq("venue_id", staff!.venue_id!).eq("name", "RSA").maybeSingle(),
    supabase.from("venue_key_roles").select("name, phone, email").eq("venue_id", staff!.venue_id!).eq("role_type", "rsa_marshal").maybeSingle(),
    supabase.from("wizard_sessions").select("venue_type_flags").eq("venue_id", staff!.venue_id!).maybeSingle(),
  ]);

  let roleIds: string[] = [];
  if (certType) {
    const { data: rows } = await supabase.from("certificate_type_roles").select("role_id").eq("certificate_type_id", certType.id);
    roleIds = (rows ?? []).map((r) => r.role_id);
  }

  // Whether the marshal gate has been answered at all -- and which way --
  // is read from the flag rsa/route.ts actually sets on every save, not
  // inferred from a venue_key_roles row existing. A genuine "No" answer
  // deletes that row (see rsa/route.ts), so inferring from row presence
  // alone is indistinguishable from "never asked" -- confirmed live by
  // Block Q9's real onboarding run, where this silently disabled Continue
  // on revisit after a saved "No" answer.
  const flags = (session?.venue_type_flags as VenueTypeFlags | null) ?? {};
  const marshalDesignated = flags.rsa_marshal_designated ?? null;

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("rsa", {})} />
      <RsaMarshalForm
        venueSlug={venueSlug}
        staffRoles={staffRoles ?? []}
        initial={{
          roleIds,
          marshalDesignated,
          marshalName: marshal?.name ?? "",
          marshalPhone: marshal?.phone ?? "",
          marshalEmail: marshal?.email ?? "",
        }}
      />
    </>
  );
}
