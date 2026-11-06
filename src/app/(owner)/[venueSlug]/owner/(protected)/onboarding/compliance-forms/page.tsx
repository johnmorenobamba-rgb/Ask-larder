import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwnerPageStaff } from "@/lib/auth/ownerPage";
import { ComplianceFormsStep } from "@/components/onboarding/ComplianceFormsStep";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { getPreviousStep } from "@/lib/onboarding/steps";
import { logQueryError } from "@/lib/supabase/logQueryError";
import { FORMS, HELD_FORMS, LINKED_FEATURES } from "@/lib/compliance/engine/forms";
import { buildActivationGroups, countFormsOn, missingActivationAnswers } from "@/lib/compliance/engine/activationGroups";
import { loadActivationContext, loadActivationRows } from "@/lib/compliance/engine/hubData";

export const dynamic = "force-dynamic";

// Wizard step: the compliance forms review, just before Review & activate. Uses the same activation data and
// switches as Owner, Forms, so the two can never disagree.
export default async function ComplianceFormsPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await requireOwnerPageStaff(venueSlug);
  const supabase = await createClient();
  const venueId = staff!.venue_id!;

  const [{ ctx, degraded }, { rows, degraded: rowsDegraded }, units] = await Promise.all([
    loadActivationContext(supabase, createAdminClient(), venueId),
    loadActivationRows(supabase, venueId),
    supabase.from("venue_refrigeration_units").select("id", { count: "exact", head: true }).eq("venue_id", venueId).eq("is_active", true),
  ]);
  logQueryError(`[${venueSlug}] onboarding compliance-forms units`, units.error);

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("compliance-forms", {})} />
      <ComplianceFormsStep
        venueSlug={venueSlug}
        groups={buildActivationGroups(rows, ctx)}
        formsOn={countFormsOn(rows, ctx)}
        formsTotal={FORMS.length}
        activeUnitCount={units.count ?? 0}
        missing={missingActivationAnswers(ctx)}
        linked={LINKED_FEATURES.map((f) => ({ id: f.id, title: f.title, note: f.note }))}
        held={HELD_FORMS.map((f) => ({ id: f.id, title: f.title, note: f.reason }))}
        degraded={degraded || rowsDegraded || !!units.error}
      />
    </>
  );
}
