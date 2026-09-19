import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

// isManagerTier is computed here, not a real app_users column -- it's the
// ONE shared source of "does this person get owner-dashboard/manager-tier
// authority," folding in both the coarse app_users.role (owner/manager) and
// the per-venue staff_roles.fallback_tier (authorized/frontline) a staff
// member's own job role carries. Before this, the owner-dashboard gate
// (every /owner/* page and API route) checked only staff.role, while Ask
// Larder's role-tiered fallback checked only fallback_tier -- two
// independent mechanisms that happened to overlap in intent, not one
// shared source, with real risk of drifting apart (exactly what happened:
// Head Chef/Sous Chef could already get full Ask Larder answers if their
// role was ever marked authorized, but could never reach the owner
// dashboard at all, no matter what their fallback_tier said). Every caller
// that needs to know "is this person authorized" should read
// staff.isManagerTier, not staff.role directly.
export type CurrentStaff = Tables<"app_users"> & { isManagerTier: boolean };

/**
 * The signed-in staff/owner/manager row for the current request, or null if
 * unauthenticated. RLS scopes the app_users lookup to the caller's own row,
 * so this can't leak another venue's data even if auth_id were guessed.
 */
export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Block U -- the one real enforcement point for staff deactivation.
  // Filtering here (not just at PIN login) is what makes deactivation
  // "immediate": an already-issued Supabase session/JWT would otherwise
  // keep authenticating successfully until it naturally expires, no matter
  // how thoroughly login itself is blocked.
  //
  // The staff_roles(fallback_tier) embed is the one extra join that makes
  // isManagerTier computable everywhere getCurrentStaff() is already
  // called, instead of every owner-dashboard route needing its own second
  // query the way ask-larder/route.ts used to.
  const { data: appUser } = await supabase
    .from("app_users")
    .select("*, staff_roles(fallback_tier)")
    .eq("auth_id", user.id)
    .is("deactivated_at", null)
    .maybeSingle();

  if (!appUser) return null;

  const { staff_roles, ...row } = appUser as Tables<"app_users"> & {
    staff_roles: { fallback_tier: string | null } | null;
  };
  const isManagerTier = row.role === "owner" || row.role === "manager" || staff_roles?.fallback_tier === "authorized";

  return { ...row, isManagerTier };
}
