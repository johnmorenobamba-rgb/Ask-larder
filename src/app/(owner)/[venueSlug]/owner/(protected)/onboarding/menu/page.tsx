import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { MenuReviewTable } from "@/components/onboarding/MenuReviewTable";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { getPreviousStep } from "@/lib/onboarding/steps";

export default async function MenuPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("menu_items")
    .select("id, name, category, description, base_allergens, menu_item_modifier_groups(id, name, menu_item_modifiers(id, name, allergens_added, allergens_removed))")
    .eq("venue_id", staff!.venue_id!)
    .order("name");

  const existingItems = (items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.description,
    base_allergens: item.base_allergens,
    modifierGroups: (item.menu_item_modifier_groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      modifiers: g.menu_item_modifiers ?? [],
    })),
  }));

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("menu", {})} />
      <MenuReviewTable venueSlug={venueSlug} venueId={staff!.venue_id!} existingItems={existingItems} />
    </>
  );
}
