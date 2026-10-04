import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { ComplianceSetupForm } from "@/components/onboarding/ComplianceSetupForm";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { getPreviousStep, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { logQueryError } from "@/lib/supabase/logQueryError";

// Compliance Forms Stage 0a wizard step: refrigeration units with safe
// ranges (feeds the B2 temperature log) plus three compliance settings.
export default async function ComplianceSetupPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [
    { data: units, error: unitsError },
    { data: settings, error: settingsError },
    { data: stations, error: stationsError },
    { data: session, error: sessionError },
  ] = await Promise.all([
    supabase
      .from("venue_refrigeration_units")
      .select("id, name, unit_type, min_temp_c, max_temp_c, station_id, is_active")
      .eq("venue_id", staff!.venue_id!)
      .order("created_at"),
    supabase
      .from("venue_compliance_settings")
      .select("high_risk_activities, offers_accommodation, trade_waste_agreement")
      .eq("venue_id", staff!.venue_id!)
      .maybeSingle(),
    supabase.from("stations").select("id, name").eq("venue_id", staff!.venue_id!).order("name"),
    supabase.from("wizard_sessions").select("venue_type_flags").eq("venue_id", staff!.venue_id!).maybeSingle(),
  ]);
  logQueryError(`[${venueSlug}] onboarding compliance-setup units`, unitsError);
  logQueryError(`[${venueSlug}] onboarding compliance-setup settings`, settingsError);
  logQueryError(`[${venueSlug}] onboarding compliance-setup stations`, stationsError);
  logQueryError(`[${venueSlug}] onboarding compliance-setup session`, sessionError);
  const flags = (session?.venue_type_flags as VenueTypeFlags | null) ?? {};

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("compliance-setup", flags)} />
      <ComplianceSetupForm
        venueSlug={venueSlug}
        stations={stations ?? []}
        initial={{
          units: (units ?? []).map((u) => ({
            id: u.id,
            name: u.name,
            unitType: u.unit_type,
            limitTempC: String(u.unit_type === "hot_hold" ? (u.min_temp_c ?? "") : (u.max_temp_c ?? "")),
            stationId: u.station_id ?? "",
            isActive: u.is_active,
          })),
          highRiskActivities: settings?.high_risk_activities ?? [],
          offersAccommodation: settings?.offers_accommodation ?? false,
          tradeWasteAgreement: settings?.trade_waste_agreement ?? "",
        }}
      />
    </>
  );
}
