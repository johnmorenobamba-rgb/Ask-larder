import { config } from "dotenv";
config({ path: ".env.local" });

import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/types";

// P5 (venues and venue_licence_profile write policies). The three routes that write `venues` with
// the signed in user's own client must keep working for the manager tier (a Head Chef is manager
// tier through fallback_tier = authorized, and is NOT the owner) and must stay refused for
// frontline staff. A disposable venue is created and removed with the service role. No real or
// demo venue is touched, and no email is involved.
test.describe.configure({ timeout: 240_000 });

function adminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const suffix = randomUUID().slice(0, 8);
const SLUG = `p5-routes-${suffix}`;
const OWNER_EMAIL = `delivered+p5${suffix}@resend.dev`;
const PIN = "4821";
let venueId = "";
let ownerAuthId = "";
const staffIds: string[] = [];

async function nativeClick(page: Page, text: string) {
  const ok = await page.evaluate((t) => {
    const el = Array.from(document.querySelectorAll("button")).find((e) => e.textContent?.trim() === t) as HTMLElement | undefined;
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!ok) throw new Error(`no button "${text}"`);
}

async function loginAs(page: Page, name: string) {
  await page.context().clearCookies();
  await page.goto(`/${SLUG}/login`);
  await nativeClick(page, name);
  await page.locator('input[type="password"]').fill(PIN);
  await nativeClick(page, "Log in");
  await page.waitForURL(/\/(welcome|roles|modules|home)$/, { waitUntil: "commit", timeout: 60_000 });
}

test.beforeAll(async () => {
  const admin = adminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({ email: OWNER_EMAIL, password: "P5RoutesOwner123!", email_confirm: true });
  if (authError || !authData.user) throw authError ?? new Error("no owner user");
  ownerAuthId = authData.user.id;
  const { data: boot, error } = await admin.rpc("bootstrap_owner", {
    p_auth_id: ownerAuthId,
    p_venue_name: "P5 Routes Test Venue",
    p_venue_slug: SLUG,
    p_owner_name: "P5 Owner",
    p_owner_email: OWNER_EMAIL,
  });
  if (error || !boot) throw error ?? new Error("no bootstrap data");
  venueId = (boot as { venue_id: string }).venue_id;
  await admin.from("venue_licence_profile").upsert({ venue_id: venueId, state: "VIC" }, { onConflict: "venue_id" });
  const { data: chefRole } = await admin.from("staff_roles").insert({ venue_id: venueId, name: "Head Chef", department: "BOH", fallback_tier: "authorized" }).select("id").single();
  const { data: handRole } = await admin.from("staff_roles").insert({ venue_id: venueId, name: "Kitchen Hand", department: "BOH", fallback_tier: "frontline" }).select("id").single();
  const pin_hash = await bcrypt.hash(PIN, 10);
  const stamp = new Date().toISOString();
  for (const [name, roleId] of [["Chef Hana", chefRole!.id], ["Kit Hand", handRole!.id]] as const) {
    const { data: u } = await admin
      .from("app_users")
      .insert({ venue_id: venueId, role: "staff", name, staff_role_id: roleId, pin_hash, pin_set_at: stamp, onboarding_completed_at: stamp })
      .select("id")
      .single();
    staffIds.push(u!.id);
  }
});

test.afterAll(async () => {
  const admin = adminClient();
  if (venueId) await admin.from("venues").delete().eq("id", venueId);
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of authList?.users ?? []) {
    if (u.id === ownerAuthId || staffIds.some((id) => u.email === `staff-${id}@venue.internal`)) await admin.auth.admin.deleteUser(u.id);
  }
});

const state = async () => {
  const admin = adminClient();
  const { data: v } = await admin.from("venues").select("name, roster_location").eq("id", venueId).single();
  const { data: p } = await admin.from("venue_licence_profile").select("address, legal_name").eq("venue_id", venueId).single();
  return { name: v?.name, roster: v?.roster_location, address: p?.address, legal: p?.legal_name };
};

test("manager tier non owner (Head Chef) can still write venue name, roster location and licence profile", async ({ page }) => {
  await loginAs(page, "Chef Hana");

  const patch = await page.request.patch(`/api/owner/settings/client-details`, {
    data: { tradingName: "P5 Renamed By Head Chef", legalName: "P5 Legal Pty Ltd", abn: "12345678901", address: "1 Test Street", ownerName: "Chef Hana", ownerPhone: "" },
  });
  expect(patch.status()).toBe(200);
  let s = await state();
  expect(s.name).toBe("P5 Renamed By Head Chef");
  expect(s.legal).toBe("P5 Legal Pty Ltd");
  expect(s.address).toBe("1 Test Street");

  const roster = await page.request.post(`/api/owner/onboarding/staff-roles`, { data: { rosterLocation: "Pass noticeboard" } });
  expect(roster.status()).toBe(200);
  s = await state();
  expect(s.roster).toBe("Pass noticeboard");

  const basics = await page.request.post(`/api/owner/onboarding/venue-basics`, {
    data: { state: "VIC", address: "2 Basics Lane", abn: "12345678901", legalName: "P5 Basics Pty Ltd", tradingName: "P5 Basics Name" },
  });
  expect(basics.status()).toBe(200);
  s = await state();
  expect(s.name).toBe("P5 Basics Name");
  expect(s.address).toBe("2 Basics Lane");
  expect(s.legal).toBe("P5 Basics Pty Ltd");
});

test("frontline staff are refused by all three routes and nothing changes", async ({ page }) => {
  const before = await state();
  await loginAs(page, "Kit Hand");
  const a = await page.request.patch(`/api/owner/settings/client-details`, { data: { tradingName: "Hacked", ownerName: "x" } });
  const b = await page.request.post(`/api/owner/onboarding/staff-roles`, { data: { rosterLocation: "Hacked" } });
  const c = await page.request.post(`/api/owner/onboarding/venue-basics`, { data: { state: "VIC", address: "Hacked", abn: "12345678901", tradingName: "Hacked" } });
  expect([a.status(), b.status(), c.status()]).toEqual([403, 403, 403]);
  expect(await state()).toEqual(before);
});
