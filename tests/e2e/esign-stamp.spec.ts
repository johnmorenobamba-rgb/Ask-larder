import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { adminClient, fixtureOwnerPassword, createFixture, destroyFixture, loginStaff, nativeClick, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// E-signature stamp (20261005040000), through the real app on a disposable venue: the route computes the IP and device from the
// request headers, a forged ip or device in the request body is ignored, the signature page still signs through the UI, and the
// record keeps working (one row per completed module, progress linked, a second sign adds nothing). Direct client calls to the
// database function are proven denied in tests/sql/esign-stamp.sql. No email is sent by this flow in the code today.
test.describe.configure({ timeout: 600_000, mode: "serial" });
let fx: Fixture;
let moduleId = "";

test.beforeAll(async () => {
  fx = await createFixture("es");
  const admin = adminClient();
  const { data, error } = await admin.from("modules").insert({ venue_id: fx.venueId, title: "Fixture module (test data)", status: "live" }).select("id").single();
  if (error) throw error;
  moduleId = data!.id;
  for (const who of ["waiter", "kitchenHand"] as const) {
    await admin.from("staff_module_progress").insert({ user_id: fx.staff[who].id, module_id: moduleId, status: "completed", completed_at: new Date().toISOString() });
  }
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

test("the signature page signs through the UI and stamps from the server", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await page.goto(`/${fx.slug}/signature`);
  await expect(page.getByRole("heading", { name: "Sign to confirm" })).toBeVisible({ timeout: 90_000 });
  await page.getByPlaceholder("Full name").fill(FIXTURE_NAMES.waiter);
  await nativeClick(page, "Confirm and sign");
  await page.waitForURL(new RegExp(`/${fx.slug}/complete$`), { waitUntil: "commit", timeout: 90_000 });
  const { data } = await adminClient().from("esignatures").select("typed_name, ip_address, device_info, module_id").eq("user_id", fx.staff.waiter.id);
  expect(data).toHaveLength(1);
  expect(data![0].typed_name).toBe(FIXTURE_NAMES.waiter);
  expect(data![0].module_id).toBe(moduleId);
  expect(data![0].ip_address).toBeTruthy();
  expect(data![0].device_info).toContain("Mozilla"); // the browser's own user agent header, read on the server
  const { data: prog } = await adminClient().from("staff_module_progress").select("esignature_id").eq("user_id", fx.staff.waiter.id).single();
  expect(prog?.esignature_id).toBeTruthy();
});

test("a forged ip or device in the request body is ignored; the stamp comes from the headers", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  const res = await page.request.post("/api/staff/complete-signature", {
    headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "Es Test Agent/1.0" },
    data: { typedName: FIXTURE_NAMES.kitchenHand, ip: "6.6.6.6", device: "forged device", ip_address: "6.6.6.6", device_info: "forged device", p_ip: "6.6.6.6", p_device: "forged device" },
  });
  expect(res.status()).toBe(200);
  const { data } = await adminClient().from("esignatures").select("ip_address, device_info").eq("user_id", fx.staff.kitchenHand.id);
  expect(data).toHaveLength(1);
  expect(data![0].ip_address).toBe("203.0.113.7");
  expect(data![0].device_info).toBe("Es Test Agent/1.0");
  // signing again adds nothing, a blank name is refused, and a signed out caller is refused
  const again = await page.request.post("/api/staff/complete-signature", { data: { typedName: FIXTURE_NAMES.kitchenHand } });
  expect(again.status()).toBe(200);
  expect((await adminClient().from("esignatures").select("id").eq("user_id", fx.staff.kitchenHand.id)).data).toHaveLength(1);
  expect((await page.request.post("/api/staff/complete-signature", { data: { typedName: "   " } })).status()).toBe(400);
  await page.context().clearCookies();
  expect((await page.request.post("/api/staff/complete-signature", { data: { typedName: "Nobody" } })).status()).toBe(401);
});

// Part 2 (20261005040100): a signed in client calling the old database function directly, with its own ip and device, is denied
// and nothing is written. Needs the migration applied (it is, once the new route is live).
test("a client calling the old signature function directly is denied", async () => {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email: fx.ownerEmail, password: fixtureOwnerPassword() });
  expect(signInError).toBeNull();
  const { data: owner } = await adminClient().from("app_users").select("id").eq("auth_id", fx.ownerAuthId).single();
  const count = async () => (await adminClient().from("esignatures").select("id", { count: "exact", head: true }).eq("user_id", owner!.id)).count;
  const before = await count();
  const { error } = await client.rpc("complete_onboarding_signature", { p_typed_name: "Forged", p_ip: "6.6.6.6", p_device: "forged device" });
  expect(error).not.toBeNull();
  expect(error!.message).toMatch(/permission denied|not allowed|not found/i);
  const after = await count();
  expect(after).toBe(before);
});
