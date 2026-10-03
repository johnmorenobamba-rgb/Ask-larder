import { config } from "dotenv";
config({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import type { Database } from "../../../src/lib/supabase/types";

// Disposable fixture venue for the Stage 0 compliance forms specs and the staff UI guide screenshots.
// It is MODELLED ON the demo pub (a general licence pub with a full kitchen, a bar, a trade waste
// agreement and four stations) but it is NEVER the demo venue or any real venue. Every name below is
// disclosed fixture data. The venue and its auth users are removed with the service role afterwards.
// Owner emails use Resend's test address so nothing could ever reach a person. No email is sent: the
// alert email flag is never set by any spec.

export function adminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const PIN = "4821";
const OWNER_PASSWORD = "FixtureOwner123!";

export type Fixture = {
  slug: string;
  venueId: string;
  ownerEmail: string;
  ownerAuthId: string;
  staff: Record<string, { id: string; name: string }>;
  stations: string[];
  unitIds: Record<string, string>;
};

export const FIXTURE_NAMES = {
  kitchenHand: "Fixture Kitchen Hand",
  headChef: "Fixture Head Chef",
  waiter: "Fixture Waiter",
  bartender: "Fixture Bartender",
  dutyManager: "Fixture Duty Manager",
  owner: "Fixture Owner",
} as const;

export async function createFixture(prefix = "s0"): Promise<Fixture> {
  const admin = adminClient();
  const suffix = randomUUID().slice(0, 8);
  const slug = `${prefix}-${suffix}`;
  const ownerEmail = `delivered+${prefix}${suffix}@resend.dev`;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({ email: ownerEmail, password: OWNER_PASSWORD, email_confirm: true });
  if (authError || !authData.user) throw authError ?? new Error("no owner user");
  const { data: boot, error } = await admin.rpc("bootstrap_owner", {
    p_auth_id: authData.user.id,
    p_venue_name: "Fixture Pub (test data)",
    p_venue_slug: slug,
    p_owner_name: FIXTURE_NAMES.owner,
    p_owner_email: ownerEmail,
  });
  if (error || !boot) throw error ?? new Error("no bootstrap data");
  const venueId = (boot as { venue_id: string }).venue_id;

  await admin.from("venue_licence_profile").upsert({ venue_id: venueId, state: "VIC", licence_type: "general" }, { onConflict: "venue_id" });
  await admin.from("venue_compliance_settings").upsert({ venue_id: venueId, trade_waste_agreement: "yes", offers_accommodation: false, high_risk_activities: [] }, { onConflict: "venue_id" });
  await admin.from("wizard_sessions").insert({ venue_id: venueId, status: "complete", venue_type_flags: { food_service_level: "full_kitchen" } });

  const stationNames = ["Pizza oven", "Fryer", "Grill", "Bar and glass wash"];
  for (const [i, name] of stationNames.entries()) {
    await admin.from("stations").insert({ venue_id: venueId, name, qr_code_slug: `fx-${i}-${suffix}` });
  }

  const mkRole = async (name: string, department: "BOH" | "FOH" | "BAR", tier: "frontline" | "authorized") => {
    const { data, error: e } = await admin.from("staff_roles").insert({ venue_id: venueId, name, department, fallback_tier: tier }).select("id").single();
    if (e) throw e;
    return data!.id;
  };
  const roles = {
    kitchenHand: await mkRole("Kitchen Hand", "BOH", "frontline"),
    headChef: await mkRole("Head Chef", "BOH", "authorized"),
    waiter: await mkRole("Waiter", "FOH", "frontline"),
    bartender: await mkRole("Bartender", "BAR", "frontline"),
    dutyManager: await mkRole("Duty Manager", "FOH", "authorized"),
  };
  const pinHash = await bcrypt.hash(PIN, 10);
  const staff: Fixture["staff"] = {};
  const stamp = new Date().toISOString();
  for (const key of ["kitchenHand", "headChef", "waiter", "bartender", "dutyManager"] as const) {
    const name = FIXTURE_NAMES[key];
    const { data, error: e } = await admin
      .from("app_users")
      .insert({ venue_id: venueId, role: "staff", name, staff_role_id: roles[key], pin_hash: pinHash, pin_set_at: stamp, onboarding_completed_at: stamp })
      .select("id")
      .single();
    if (e) throw e;
    staff[key] = { id: data!.id, name };
  }

  const unitIds: Record<string, string> = {};
  const mkUnit = async (key: string, name: string, unit_type: string, min: number | null, max: number | null) => {
    const { data, error: e } = await admin.from("venue_refrigeration_units").insert({ venue_id: venueId, name, unit_type, min_temp_c: min, max_temp_c: max }).select("id").single();
    if (e) throw e;
    unitIds[key] = data!.id;
  };
  await mkUnit("coolroom", "Walk in cool room", "cold", null, 5);
  await mkUnit("freezer", "Chest freezer", "frozen", null, -15);
  await mkUnit("bain", "Bain marie", "hot_hold", 60, null);
  await mkUnit("barfridge", "Bar fridge", "cold", null, 5);

  return { slug, venueId, ownerEmail, ownerAuthId: authData.user.id, staff, stations: stationNames, unitIds };
}

export async function destroyFixture(fx: Fixture | null) {
  if (!fx) return;
  const admin = adminClient();
  await admin.from("venues").delete().eq("id", fx.venueId); // cascades over records, activation rows, units, stations, staff
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of authList?.users ?? []) {
    if (u.id === fx.ownerAuthId || Object.values(fx.staff).some((s) => u.email === `staff-${s.id}@venue.internal`)) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }
}

export async function nativeClick(page: Page, text: string, tag = "button") {
  const clicked = await page.evaluate(
    ({ tag, text }) => {
      const el = Array.from(document.querySelectorAll(tag)).find((e) => e.textContent?.trim() === text) as HTMLElement | undefined;
      if (!el) return false;
      el.click();
      return true;
    },
    { tag, text },
  );
  if (!clicked) throw new Error(`nativeClick: no <${tag}> with exact text "${text}" found`);
}

export async function loginStaff(page: Page, fx: Fixture, name: string) {
  await page.context().clearCookies();
  await page.goto(`/${fx.slug}/login`);
  await nativeClick(page, name);
  await page.locator('input[type="password"]').fill(PIN);
  await nativeClick(page, "Log in");
  await page.waitForURL(/\/(welcome|roles|modules|home)$/, { waitUntil: "commit", timeout: 60_000 });
}

export async function loginOwner(page: Page, fx: Fixture) {
  await page.context().clearCookies();
  await page.goto(`/${fx.slug}/owner/login`);
  await page.locator('input[type="email"]').fill(fx.ownerEmail);
  await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
  await nativeClick(page, "Log in");
  await page.waitForURL(/\/owner\/(dashboard|onboarding)/, { waitUntil: "commit", timeout: 60_000 });
}
