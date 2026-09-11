import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { FoodServiceGateForm } from "@/components/onboarding/FoodServiceGateForm";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { getPreviousStep, type VenueTypeFlags } from "@/lib/onboarding/steps";

export default async function FoodServicePage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: staffRoles }, { data: session }, { data: fss }, { data: foodHandlingType }] = await Promise.all([
    supabase.from("staff_roles").select("id, name").eq("venue_id", staff!.venue_id!).order("name"),
    supabase.from("wizard_sessions").select("venue_type_flags").eq("venue_id", staff!.venue_id!).maybeSingle(),
    supabase.from("venue_key_roles").select("name, phone, email").eq("venue_id", staff!.venue_id!).eq("role_type", "food_safety_supervisor").maybeSingle(),
    supabase.from("certificate_types").select("id").eq("venue_id", staff!.venue_id!).eq("name", "Food Handling").maybeSingle(),
  ]);

  let foodHandlingRoleIds: string[] = [];
  if (foodHandlingType) {
    const { data: rows } = await supabase.from("certificate_type_roles").select("role_id").eq("certificate_type_id", foodHandlingType.id);
    foodHandlingRoleIds = (rows ?? []).map((r) => r.role_id);
  }

  const flags = (session?.venue_type_flags as VenueTypeFlags | null) ?? {};

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("food-service", flags)} />
      <FoodServiceGateForm
        venueSlug={venueSlug}
        staffRoles={staffRoles ?? []}
        initial={{
          level: flags.food_service_level ?? "",
          fssName: fss?.name ?? "",
          fssPhone: fss?.phone ?? "",
          fssEmail: fss?.email ?? "",
          foodHandlingRoleIds,
        }}
      />
    </>
  );
}
