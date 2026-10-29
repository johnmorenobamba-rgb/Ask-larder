import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Venue iPad mode. A shared venue iPad signs in as a device account (app_users.role = 'device'): no PIN, no staff
// role, lowest access. The iPad stays paired through an httpOnly cookie holding a random token; only its SHA 256
// hash is stored (venue_devices.token_hash). Anything that records WHO did something is refused for the device
// account (rejectDevice), so a person signs in with their own PIN for it.

export const DEVICE_COOKIE = "larder_device";
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year; the owner can revoke at any time

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class DeviceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function mintSessionForAuthUser(email: string) {
  const admin = createAdminClient();
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !linkData) throw new DeviceError(500, "Couldn't start a session.");
  const { data: otpData, error: otpError } = await admin.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });
  if (otpError || !otpData?.session) throw new DeviceError(500, "Couldn't start a session.");
  return {
    accessToken: otpData.session.access_token,
    refreshToken: otpData.session.refresh_token,
    expiresAt: otpData.session.expires_at,
  };
}

/**
 * Pairs the iPad making this request. Caller must already have checked that they are manager tier of `venueId`.
 * Creates the venue's device account on first use (one per venue), stores a new token hash and sets the cookie.
 * Any earlier pairing for this venue stays valid until revoked, so a venue can pair more than one iPad.
 */
export async function pairDevice({ venueId, pairedBy, label }: { venueId: string; pairedBy: string; label?: string }) {
  const admin = createAdminClient();

  const { data: venue, error: venueError } = await admin
    .from("venues")
    .select("id, ipad_mode_enabled")
    .eq("id", venueId)
    .maybeSingle();
  if (venueError || !venue) throw new DeviceError(404, "Venue not found.");
  if (!venue.ipad_mode_enabled) throw new DeviceError(403, "iPad mode is not switched on for this venue.");

  let { data: deviceUser } = await admin
    .from("app_users")
    .select("id")
    .eq("venue_id", venueId)
    .eq("role", "device")
    .maybeSingle();
  if (!deviceUser) {
    const { data: created, error: createError } = await admin
      .from("app_users")
      .insert({ venue_id: venueId, role: "device", name: "Venue iPad" })
      .select("id")
      .single();
    if (createError || !created) throw new DeviceError(500, "Couldn't set up the iPad account.");
    deviceUser = created;
  }

  const token = randomBytes(32).toString("base64url");
  const { error: insertError } = await admin.from("venue_devices").insert({
    venue_id: venueId,
    app_user_id: deviceUser.id,
    token_hash: hashDeviceToken(token),
    label: label?.trim() || "Venue iPad",
    paired_by: pairedBy,
  });
  if (insertError) throw new DeviceError(500, "Couldn't pair this iPad.");

  const jar = await cookies();
  jar.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
}

/** True when this request carries a device cookie (it may still be revoked; resume decides). */
export async function hasDeviceCookie(): Promise<boolean> {
  const jar = await cookies();
  return !!jar.get(DEVICE_COOKIE)?.value;
}

/**
 * Signs the paired iPad in as the venue's device account. The venue slug must match the venue the token was paired
 * to, and the venue must still have iPad mode on. A revoked, unknown or mismatched token clears the cookie.
 */
export async function resumeDevice(venueSlug: string) {
  const jar = await cookies();
  const token = jar.get(DEVICE_COOKIE)?.value;
  if (!token) throw new DeviceError(401, "This iPad is not paired.");

  const admin = createAdminClient();
  const { data: device } = await admin
    .from("venue_devices")
    .select("id, revoked_at, app_user_id, venues!inner(slug, ipad_mode_enabled)")
    .eq("token_hash", hashDeviceToken(token))
    .maybeSingle();

  const venue = device ? (device.venues as unknown as { slug: string; ipad_mode_enabled: boolean }) : null;
  if (!device || device.revoked_at || !venue || venue.slug !== venueSlug || !venue.ipad_mode_enabled) {
    if (!device || device.revoked_at) jar.delete(DEVICE_COOKIE);
    throw new DeviceError(401, "This iPad is not paired.");
  }

  const { data: user } = await admin
    .from("app_users")
    .select("id, auth_id, email, deactivated_at")
    .eq("id", device.app_user_id)
    .eq("role", "device")
    .maybeSingle();
  if (!user || user.deactivated_at) throw new DeviceError(401, "This iPad is not paired.");

  const authEmail = user.email ?? `device-${user.id}@venue.internal`;
  if (!user.auth_id) {
    const { data: newAuthUser, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      email_confirm: true,
    });
    if (createError || !newAuthUser?.user) throw new DeviceError(500, "Couldn't start a session.");
    await admin.from("app_users").update({ auth_id: newAuthUser.user.id, email: authEmail }).eq("id", user.id);
  }

  const session = await mintSessionForAuthUser(authEmail);
  await admin.from("venue_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);
  return session;
}

/** Owner side: stops a paired iPad resuming. Scoped to the caller's venue. */
export async function revokeDevices(venueId: string, deviceId?: string) {
  const admin = createAdminClient();
  let q = admin
    .from("venue_devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("venue_id", venueId)
    .is("revoked_at", null);
  if (deviceId) q = q.eq("id", deviceId);
  const { error } = await q;
  if (error) throw new DeviceError(500, "Couldn't revoke.");
}

/**
 * For API routes that record WHO did something (module completion, signatures, certificates, forms, near misses,
 * roles, PINs). Returns a 403 response when the caller is the shared device account, otherwise null.
 */
export async function rejectDevice(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // each route's own check answers 401
  const { data: row } = await supabase.from("app_users").select("role").eq("auth_id", user.id).maybeSingle();
  if (row?.role === "device") {
    return NextResponse.json({ error: "Log in with your own PIN to do this." }, { status: 403 });
  }
  return null;
}
