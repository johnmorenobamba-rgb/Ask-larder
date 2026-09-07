import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import type { VenueTypeFlags } from "./steps";

type TypedClient = SupabaseClient<Database>;

/**
 * wizard_sessions is a resume-position + branching-flag store only — never
 * a staging copy of real data (Q2 §1). Every domain API route upserts this
 * alongside its own real-table write so venue_type_flags stays correct
 * without a second client round trip; the dedicated /api/owner/onboarding/
 * session route (WizardShell) handles plain current_step bookkeeping as the
 * owner navigates between pages.
 */
export async function getWizardFlags(supabase: TypedClient, venueId: string): Promise<VenueTypeFlags> {
  const { data } = await supabase.from("wizard_sessions").select("venue_type_flags").eq("venue_id", venueId).maybeSingle();
  return (data?.venue_type_flags as VenueTypeFlags | null) ?? {};
}

function setEscalationFlag(flags: VenueTypeFlags, key: string, present: boolean): VenueTypeFlags {
  const set = new Set(flags.founder_escalation ?? []);
  if (present) set.add(key);
  else set.delete(key);
  return { ...flags, founder_escalation: Array.from(set) };
}

export async function upsertWizardSession(
  supabase: TypedClient,
  venueId: string,
  patch: {
    /** A WizardStepSlug for most callers, but the SOP intake hub also
     * writes compound values like "sop_intake:<topic_key>" (Q2 Page 12) —
     * kept as a plain string here rather than importing WizardStepSlug, so
     * this file doesn't need to know about that compound-value convention. */
    currentStep?: string;
    flags?: Partial<VenueTypeFlags>;
    /** Recomputes founder_escalation[key] to exactly this presence, rather than only ever adding — a state answer that changes back to Victoria, or a gaming answer that changes back to "no", should un-flag, not accumulate stale flags. */
    escalation?: { key: string; present: boolean };
    startedBy?: string | null;
  },
): Promise<VenueTypeFlags> {
  const { data: existing } = await supabase
    .from("wizard_sessions")
    .select("id, venue_type_flags")
    .eq("venue_id", venueId)
    .maybeSingle();

  let mergedFlags: VenueTypeFlags = { ...(((existing?.venue_type_flags as VenueTypeFlags | null) ?? {})), ...(patch.flags ?? {}) };
  if (patch.escalation) {
    mergedFlags = setEscalationFlag(mergedFlags, patch.escalation.key, patch.escalation.present);
  }

  if (existing) {
    await supabase
      .from("wizard_sessions")
      .update({
        ...(patch.currentStep ? { current_step: patch.currentStep } : {}),
        venue_type_flags: mergedFlags as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("wizard_sessions").insert({
      venue_id: venueId,
      started_by: patch.startedBy ?? null,
      current_step: patch.currentStep ?? "venue-basics",
      venue_type_flags: mergedFlags as unknown as Json,
    });
  }

  return mergedFlags;
}
