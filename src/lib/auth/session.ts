import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { logQueryError } from "@/lib/supabase/logQueryError";

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
// isDevice is true for the shared venue iPad account (role 'device', venue iPad mode). That account may read venue
// content at the lowest access level and use Ask Larder, but never records anything under a person's name.
//
// department and venue come from the same query (embeds, under the caller's own RLS), so the layouts and pages no
// longer need their own staff_roles and venues lookups.
export type CurrentStaffVenue = {
  name: string;
  slug: string | null;
  ipadModeEnabled: boolean;
  certNudgeCadence: number[] | null;
};

export type CurrentStaff = Tables<"app_users"> & {
  isManagerTier: boolean;
  isDevice: boolean;
  /** The person's own job role department (staff_roles.department), null with no role. */
  department: string | null;
  /** The person's venue, null only if RLS hides it (it never should for a signed in member). */
  venue: CurrentStaffVenue | null;
};

/**
 * The signed-in staff/owner/manager row for the current request, or null if
 * unauthenticated. RLS scopes the app_users lookup to the caller's own row,
 * so this can't leak another venue's data even if auth_id were guessed.
 *
 * Wrapped in React cache(): the protected layout and the page of one request
 * (which render at the same time) share one result instead of each paying for
 * the auth check and the app_users lookup. The cache lasts one server request,
 * so deactivation still takes effect on the very next request.
 */
export const getCurrentStaff = cache(async (): Promise<CurrentStaff | null> => {
  const supabase = await createClient();

  // getClaims(), not getUser(): this project signs JWTs with an asymmetric key
  // (ES256), so the token is verified locally against the cached public key
  // (supabase-js keeps the JWKS at module level) instead of a round trip to the
  // auth server on every request. Trade-off: a token that was signed out
  // elsewhere stays valid until it expires (one hour by default), where
  // getUser() would reject it at once. Deactivation is NOT affected by that:
  // it is enforced by the deactivated_at filter below, on every request
  // (tests/e2e/deactivation-instant.spec.ts proves it). If the project ever
  // moves back to a symmetric secret, getClaims() falls back to the same
  // auth server call getUser() makes, so this stays correct either way.
  const { data: claimsData } = await supabase.auth.getClaims();
  const authId = claimsData?.claims?.sub;

  if (!authId) return null;

  // Block U -- the one real enforcement point for staff deactivation.
  // Filtering here (not just at PIN login) is what makes deactivation
  // "immediate": an already-issued Supabase session/JWT would otherwise
  // keep authenticating successfully until it naturally expires, no matter
  // how thoroughly login itself is blocked.
  //
  // The staff_roles embed makes isManagerTier and department computable
  // everywhere getCurrentStaff() is already called; the venues embed gives
  // the layouts the venue name, slug and iPad mode without a second query.
  const { data: appUser, error } = await supabase
    .from("app_users")
    .select("*, staff_roles(fallback_tier, department), venues(name, slug, ipad_mode_enabled, cert_nudge_cadence)")
    .eq("auth_id", authId)
    .is("deactivated_at", null)
    .maybeSingle();
  // A failed lookup signs the person out of this request (null), exactly like
  // a wrong credential, so it must at least leave a trace in the logs.
  logQueryError("getCurrentStaff app_users", error);

  if (!appUser) return null;

  const { staff_roles, venues, ...row } = appUser as Tables<"app_users"> & {
    staff_roles: { fallback_tier: string | null; department: string | null } | null;
    venues: { name: string; slug: string | null; ipad_mode_enabled: boolean | null; cert_nudge_cadence: number[] | null } | null;
  };
  const isManagerTier = row.role === "owner" || row.role === "manager" || staff_roles?.fallback_tier === "authorized";

  return {
    ...row,
    isManagerTier,
    isDevice: row.role === "device",
    department: staff_roles?.department ?? null,
    venue: venues
      ? { name: venues.name, slug: venues.slug, ipadModeEnabled: !!venues.ipad_mode_enabled, certNudgeCadence: venues.cert_nudge_cadence }
      : null,
  };
});
