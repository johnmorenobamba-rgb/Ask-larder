import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logQueryError } from "@/lib/supabase/logQueryError";

// P28: the second signature on a two person form must come from a different, active, manager tier person of the SAME venue
// (owner, manager, or a role marked authorized). Same definition as getCurrentStaff().isManagerTier.
type Row = { id: string; name: string; role: string | null; staff_roles: { fallback_tier: string | null } | null };

export const isManagerTierRow = (r: Pick<Row, "role" | "staff_roles">) =>
  r.role === "owner" || r.role === "manager" || r.staff_roles?.fallback_tier === "authorized";

export async function listCosigners(admin: SupabaseClient<Database>, venueId: string, excludeId: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await admin
    .from("app_users")
    .select("id, name, role, staff_roles(fallback_tier)")
    .eq("venue_id", venueId)
    .is("deactivated_at", null)
    .not("pin_hash", "is", null)
    .neq("id", excludeId)
    .order("name");
  logQueryError("form page cosigners", error);
  return ((data ?? []) as unknown as Row[]).filter(isManagerTierRow).map((p) => ({ id: p.id, name: p.name }));
}

/** True only if this person is an active manager tier member of this venue (and so may countersign). */
export async function isEligibleCosigner(admin: SupabaseClient<Database>, venueId: string, staffId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("app_users")
    .select("id, name, role, staff_roles(fallback_tier)")
    .eq("id", staffId)
    .eq("venue_id", venueId)
    .is("deactivated_at", null)
    .maybeSingle();
  logQueryError("cosigner eligibility", error);
  return !!data && isManagerTierRow(data as unknown as Row);
}
