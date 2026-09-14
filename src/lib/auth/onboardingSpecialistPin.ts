import "server-only";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const PIN_PATTERN = /^\d{4,6}$/;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const BCRYPT_COST = 10;

export class OnboardingPinError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function hashIp(ip: string): string {
  // Keyed uniformly so a raw IP is never stored -- this is a rate-limit
  // bucket key, not an identity record.
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Gates POST /api/auth/bootstrap-owner -- the real fix for the 14 Sep audit
 * finding that /onboarding/start creates a real venue+owner for any
 * anonymous request (bootstrap_owner() itself already has EXECUTE revoked
 * from anon/authenticated, but the route calling it via service role had no
 * gate of its own). A 4-6 digit PIN alone is brute-forceable, so this locks
 * out the caller's IP after repeated wrong attempts -- there's no staff
 * identity to key a lockout on the way staffPin.ts locks by app_users.id,
 * since the caller is genuinely anonymous until a valid PIN is presented.
 *
 * Returns the matching specialist's id/name so the caller can be recorded
 * against the venue it creates (venues.created_by_specialist_id) -- an
 * audit trail, and the means to revoke one specialist's PIN later without
 * affecting anyone else's.
 */
export async function verifyOnboardingSpecialistPin(
  pin: string,
  requestIp: string,
): Promise<{ specialistId: string; specialistName: string }> {
  if (!PIN_PATTERN.test(pin)) {
    throw new OnboardingPinError(400, "A valid onboarding specialist PIN is required.");
  }

  const admin = createAdminClient();
  const ipHash = hashIp(requestIp);

  const { data: attemptRow } = await admin
    .from("onboarding_pin_attempts")
    .select("id, failed_attempts, locked_until")
    .eq("ip_hash", ipHash)
    .maybeSingle();

  const lockedUntil = attemptRow?.locked_until ? new Date(attemptRow.locked_until) : null;
  if (lockedUntil && lockedUntil.getTime() > Date.now()) {
    throw new OnboardingPinError(423, `Too many attempts. Try again after ${lockedUntil.toISOString()}.`);
  }

  const { data: specialists } = await admin
    .from("onboarding_specialists")
    .select("id, name, pin_hash")
    .eq("active", true);

  let match: { id: string; name: string } | null = null;
  for (const specialist of specialists ?? []) {
    if (await bcrypt.compare(pin, specialist.pin_hash)) {
      match = { id: specialist.id, name: specialist.name };
      break;
    }
  }

  if (!match) {
    const attempts = (attemptRow?.failed_attempts ?? 0) + 1;
    const update: { failed_attempts: number; locked_until?: string; updated_at: string } = {
      failed_attempts: attempts,
      updated_at: new Date().toISOString(),
    };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      update.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
    }
    await admin.from("onboarding_pin_attempts").upsert({ ip_hash: ipHash, ...update }, { onConflict: "ip_hash" });
    throw new OnboardingPinError(401, "Incorrect onboarding specialist PIN.");
  }

  if (attemptRow) {
    await admin
      .from("onboarding_pin_attempts")
      .update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
      .eq("ip_hash", ipHash);
  }

  return { specialistId: match.id, specialistName: match.name };
}

/** Seeds/rotates a specialist's PIN -- used by the one-off seed script, and available for a future admin UI. */
export async function setOnboardingSpecialistPin(name: string, pin: string): Promise<string> {
  if (!PIN_PATTERN.test(pin)) {
    throw new OnboardingPinError(400, "pin must be 4-6 digits.");
  }
  const admin = createAdminClient();
  const pinHash = await bcrypt.hash(pin, BCRYPT_COST);
  const { data, error } = await admin
    .from("onboarding_specialists")
    .insert({ name, pin_hash: pinHash, active: true })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create onboarding specialist.");
  return data.id;
}
