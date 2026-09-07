import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { RsaMarshalForm } from "@/components/onboarding/RsaMarshalForm";

export default async function RsaPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: staffRoles }, { data: certType }, { data: marshal }] = await Promise.all([
    supabase.from("staff_roles").select("id, name").eq("venue_id", staff!.venue_id!).order("name"),
    supabase.from("certificate_types").select("id").eq("venue_id", staff!.venue_id!).eq("name", "RSA").maybeSingle(),
    supabase.from("venue_key_roles").select("name, phone, email").eq("venue_id", staff!.venue_id!).eq("role_type", "rsa_marshal").maybeSingle(),
  ]);

  let roleIds: string[] = [];
  if (certType) {
    const { data: rows } = await supabase.from("certificate_type_roles").select("role_id").eq("certificate_type_id", certType.id);
    roleIds = (rows ?? []).map((r) => r.role_id);
  }

  return (
    <RsaMarshalForm
      venueSlug={venueSlug}
      staffRoles={staffRoles ?? []}
      initial={{
        roleIds,
        marshalDesignated: Boolean(marshal),
        marshalName: marshal?.name ?? "",
        marshalPhone: marshal?.phone ?? "",
        marshalEmail: marshal?.email ?? "",
      }}
    />
  );
}
