import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface BootstrapOwnerInput {
  venueName: string;
  venueSlug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
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

/**
 * Creates a Supabase Auth user, then a venue + owner app_users row
 * atomically via the public.bootstrap_owner DB function. Compensates
 * by deleting the auth user if the DB step fails, so a retry doesn't
 * collide on "email already registered".
 *
 * Service-role only, by design — v1 has no self-serve signup.
 */
export async function bootstrapOwner(
  input: BootstrapOwnerInput,
): Promise<BootstrapOwnerResult> {
  const { venueName, venueSlug, ownerName, ownerEmail, ownerPassword } = input;

  if (!venueName || !venueSlug || !ownerName || !ownerEmail || !ownerPassword) {
    throw new BootstrapOwnerError(400, "venueName, venueSlug, ownerName, ownerEmail, and ownerPassword are all required.");
  }
  if (!SLUG_PATTERN.test(venueSlug)) {
    throw new BootstrapOwnerError(400, "venueSlug must contain only lowercase letters, numbers, and hyphens.");
  }
  if (ownerPassword.length < 8) {
    throw new BootstrapOwnerError(400, "ownerPassword must be at least 8 characters.");
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
