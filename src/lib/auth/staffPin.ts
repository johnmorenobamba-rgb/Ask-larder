import "server-only";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

const PIN_PATTERN = /^\d{4,6}$/;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const BCRYPT_COST = 10;

export class PinAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface SetPinInput {
  staffUserId: string;
  pin: string;
  callerVenueId: string;
}

/**
 * Owner/manager-initiated: sets or resets a staff member's PIN and clears
 * any lockout. Scoped to callerVenueId -- the caller-session + role check
 * happens in the route (Block E's owner dashboard now exists to sit
 * behind), this is the last line of defense: a cross-venue reset attempt
 * fails the same way as a nonexistent staffUserId (404), not a distinct
 * error that would leak whether the id exists in another venue.
 */
export async function setStaffPin({ staffUserId, pin, callerVenueId }: SetPinInput): Promise<void> {
  if (!PIN_PATTERN.test(pin)) {
    throw new PinAuthError(400, "pin must be 4-6 digits.");
  }

  const admin = createAdminClient();
  const pinHash = await bcrypt.hash(pin, BCRYPT_COST);

  const { data, error } = await admin
    .from("app_users")
    .update({
      pin_hash: pinHash,
      pin_set_at: new Date().toISOString(),
      pin_failed_attempts: 0,
      pin_locked_until: null,
    })
    .eq("id", staffUserId)
    .eq("venue_id", callerVenueId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new PinAuthError(500, error.message);
  }
  if (!data) {
    throw new PinAuthError(404, "Staff user not found.");
  }
}

export interface LoginWithPinInput {
  venueSlug: string;
  staffUserId: string;
  pin: string;
}

export interface LoginWithPinResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | undefined;
  userId: string;
}

/**
 * Verifies a staff PIN, then mints a real Supabase session via a
 * server-side magic-link exchange: generateLink() issues a one-time
 * token, verifyOtp() redeems it immediately — no email is sent, no
 * browser redirect happens. If the staff app_users row has no auth_id
 * yet, a real auth.users row is created first (synthetic email if none
 * was collected at intake, since Supabase Auth needs an email-shaped
 * identifier even for PIN-only login).
 */
export async function loginWithStaffPin({
  venueSlug,
  staffUserId,
  pin,
}: LoginWithPinInput): Promise<LoginWithPinResult> {
  const admin = createAdminClient();

  const { data: staff, error: lookupError } = await admin
    .from("app_users")
    .select("id, auth_id, email, pin_hash, pin_failed_attempts, pin_locked_until, venues!inner(slug)")
    .eq("id", staffUserId)
    .eq("venues.slug", venueSlug)
    .maybeSingle();

  if (lookupError) {
    throw new PinAuthError(500, lookupError.message);
  }
  if (!staff) {
    throw new PinAuthError(404, "Staff user not found for this venue.");
  }
  if (!staff.pin_hash) {
    throw new PinAuthError(400, "PIN has not been set for this staff member.");
  }

  const lockedUntil = staff.pin_locked_until ? new Date(staff.pin_locked_until) : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    throw new PinAuthError(423, `Too many attempts. Try again after ${lockedUntil.toISOString()}.`);
  }

  const matches = await bcrypt.compare(pin, staff.pin_hash);

  if (!matches) {
    const attempts = (staff.pin_failed_attempts ?? 0) + 1;
    const update: { pin_failed_attempts: number; pin_locked_until?: string } = {
      pin_failed_attempts: attempts,
    };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      update.pin_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
    }
    await admin.from("app_users").update(update).eq("id", staffUserId);
    throw new PinAuthError(401, "Incorrect PIN.");
  }

  await admin
    .from("app_users")
    .update({ pin_failed_attempts: 0, pin_locked_until: null })
    .eq("id", staffUserId);

  let authId = staff.auth_id;
  // Resolved once here (not just inside the !authId branch) so a returning
  // staff member's second login also has a real email to pass to
  // generateLink() below — previously this stayed null after the first
  // login, since the synthetic email was used to create the auth user but
  // never persisted back to app_users.email, breaking every login after
  // the first for any staff member without a real email on file.
  const authEmail = staff.email ?? `staff-${staffUserId}@venue.internal`;

  if (!authId) {
    const { data: newAuthUser, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      email_confirm: true,
    });
    if (createError || !newAuthUser?.user) {
      throw new PinAuthError(500, createError?.message ?? "Failed to provision staff auth account.");
    }
    authId = newAuthUser.user.id;
    await admin
      .from("app_users")
      .update({ auth_id: authId, email: authEmail })
      .eq("id", staffUserId);
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: authEmail!,
  });
  if (linkError || !linkData) {
    throw new PinAuthError(500, linkError?.message ?? "Failed to generate session token.");
  }

  const { data: otpData, error: otpError } = await admin.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (otpError || !otpData?.session) {
    throw new PinAuthError(500, otpError?.message ?? "Failed to exchange session token.");
  }

  return {
    accessToken: otpData.session.access_token,
    refreshToken: otpData.session.refresh_token,
    expiresAt: otpData.session.expires_at,
    userId: authId,
  };
}
