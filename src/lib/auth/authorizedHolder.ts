import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// B1: only the owner may deactivate, reactivate, delete or demote someone who holds an Authorized tier role, an app role
// manager or an owner. The database refuses it too (20261005100000); this gives a plain message first.
export const AUTHORIZED_HOLDER_MESSAGE = "Only the owner can do this for someone with an Authorized role.";

export function isProtectedTarget(target: { role: string; staff_roles: { fallback_tier: string | null } | null }): boolean {
  return target.role === "owner" || target.role === "manager" || target.staff_roles?.fallback_tier === "authorized";
}

/** Looks the person up in the caller's venue; null when not found. */
export async function loadTarget(supabase: SupabaseClient<Database>, venueId: string, staffUserId: string) {
  const { data } = await supabase
    .from("app_users")
    .select("id, role, auth_id, staff_roles(fallback_tier)")
    .eq("id", staffUserId)
    .eq("venue_id", venueId)
    .maybeSingle();
  return data;
}

/** True when the database guard refused because the target holds an Authorized role. */
export function isAuthorizedHolderRefusal(message: string | undefined): boolean {
  return /Only the owner can (remove|deactivate)/i.test(message ?? "");
}
