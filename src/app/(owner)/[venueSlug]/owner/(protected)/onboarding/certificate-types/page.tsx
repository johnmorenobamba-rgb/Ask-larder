import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { CertificateTypesForm } from "@/components/onboarding/CertificateTypesForm";

export default async function CertificateTypesPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: certTypes }, { data: profile }] = await Promise.all([
    supabase.from("certificate_types").select("id, name").eq("venue_id", staff!.venue_id!).order("name"),
    supabase.from("venue_licence_profile").select("state").eq("venue_id", staff!.venue_id!).maybeSingle(),
  ]);

  return <CertificateTypesForm venueSlug={venueSlug} state={profile?.state ?? null} existing={certTypes ?? []} />;
}
