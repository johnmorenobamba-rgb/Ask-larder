import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyOnboardingSpecialistPin } from "@/lib/auth/onboardingSpecialistPin";

export interface BootstrapOwnerInput {
  venueName: string;
  venueSlug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  specialistPin: string;
  requestIp: string;
}

export interface BootstrapOwnerResult {
  venueId: string;
  ownerId: string;
  authUserId: string;
}

export class BootstrapOwnerError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;

// Basic shape check, not full RFC 5322 -- good enough to catch a
// fat-fingered or missing @, not meant to validate every edge case.
const EMAIL_SHAPE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// RFC 2606 reserves these domains (and the .test/.example/.invalid/
// .localhost TLDs generally) specifically for documentation and testing --
// there is no legitimate real-venue owner email on any of them. Confirmed
// gap during the 14 Sep pre-launch audit: Two Fires' owner account is
// two-fires-owner@example.com with nothing here to have caught it, and
// this function had zero email-format checking at all beyond truthiness.
const RESERVED_TEST_DOMAINS = new Set(["example.com", "example.org", "example.net", "example.edu"]);
const RESERVED_TEST_TLDS = [".test", ".example", ".invalid", ".localhost"];

function looksLikeRealEmail(email: string): boolean {
  if (!EMAIL_SHAPE_RE.test(email)) return false;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (RESERVED_TEST_DOMAINS.has(domain)) return false;
  if (RESERVED_TEST_TLDS.some((tld) => domain.endsWith(tld))) return false;
  return true;
}

/**
 * Creates a Supabase Auth user, then a venue + owner app_users row
 * atomically via the public.bootstrap_owner DB function. Compensates
 * by deleting the auth user if the DB step fails, so a retry doesn't
 * collide on "email already registered".
 *
 * Service-role only, by design — v1 has no self-serve signup. Gated by a
 * real onboarding-specialist PIN, checked server-side here (not just as a
 * UI gate) — this is the actual fix for the 14 Sep audit finding that this
 * route succeeded for any anonymous request. See onboardingSpecialistPin.ts.
 */
export async function bootstrapOwner(
  input: BootstrapOwnerInput,
): Promise<BootstrapOwnerResult> {
  const { venueName, venueSlug, ownerName, ownerEmail, ownerPassword, specialistPin, requestIp } = input;

  if (!venueName || !venueSlug || !ownerName || !ownerEmail || !ownerPassword) {
    throw new BootstrapOwnerError(400, "venueName, venueSlug, ownerName, ownerEmail, and ownerPassword are all required.");
  }
  if (!SLUG_PATTERN.test(venueSlug)) {
    throw new BootstrapOwnerError(400, "venueSlug must contain only lowercase letters, numbers, and hyphens.");
  }
  if (!looksLikeRealEmail(ownerEmail)) {
    throw new BootstrapOwnerError(400, "ownerEmail doesn't look like a real address the owner can actually receive mail at.");
  }
  if (ownerPassword.length < 8) {
    throw new BootstrapOwnerError(400, "ownerPassword must be at least 8 characters.");
  }

  // Checked before anything is created -- an invalid PIN never gets as far
  // as a real auth user, let alone a venue.
  let specialist: { specialistId: string; specialistName: string };
  try {
    specialist = await verifyOnboardingSpecialistPin(specialistPin ?? "", requestIp || "unknown");
  } catch (err) {
    if (err instanceof Error && "status" in err) {
      throw new BootstrapOwnerError((err as { status: number }).status, err.message);
    }
    throw err;
  }

  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
  });

  if (authError || !authData?.user) {
    const status = authError?.status === 422 ? 409 : 500;
    throw new BootstrapOwnerError(status, authError?.message ?? "Failed to create auth user.");
  }

  const authUserId = authData.user.id;

  const { data, error: rpcError } = await admin.rpc("bootstrap_owner", {
    p_auth_id: authUserId,
    p_venue_name: venueName,
    p_venue_slug: venueSlug,
    p_owner_name: ownerName,
    p_owner_email: ownerEmail,
    p_created_by_specialist_id: specialist.specialistId,
  });

  if (rpcError || !data) {
    await admin.auth.admin.deleteUser(authUserId);
    const status = rpcError?.message.includes("duplicate key") ? 409 : 500;
    throw new BootstrapOwnerError(status, rpcError?.message ?? "Failed to create venue/owner record.");
  }

  const result = data as { venue_id: string; app_user_id: string };

  return {
    venueId: result.venue_id,
    ownerId: result.app_user_id,
    authUserId,
  };
}
