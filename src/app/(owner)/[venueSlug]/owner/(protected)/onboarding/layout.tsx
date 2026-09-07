import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { WizardShell } from "@/components/onboarding/WizardShell";
import type { VenueTypeFlags } from "@/lib/onboarding/steps";

/**
 * Wizard shell for every /onboarding/<step> page. Auth/role/venue-slug are
 * already checked by the parent (protected) layout — this only adds the
 * step rail. Reads (not writes) wizard_sessions.venue_type_flags so the
 * rail can mute steps a branch answer has made not-yet-relevant, per Q2
 * §1's "resume hint only, never a gate" rule.
 */
export default async function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ venueSlug: string }>;
}) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: venue }, { data: session }] = await Promise.all([
    supabase.from("venues").select("name").eq("id", staff!.venue_id!).maybeSingle(),
    supabase.from("wizard_sessions").select("current_step, venue_type_flags").eq("venue_id", staff!.venue_id!).maybeSingle(),
  ]);

  const flags = (session?.venue_type_flags as VenueTypeFlags | null) ?? {};

  return (
    <WizardShell venueSlug={venueSlug} venueName={venue?.name ?? venueSlug} currentSlug={session?.current_step ?? "venue-basics"} flags={flags}>
      {children}
    </WizardShell>
  );
}
