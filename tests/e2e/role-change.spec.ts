import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { randomPassword } from "../helpers/secrets";
import { adminClient, createFixture, destroyFixture, loginOwner, loginStaff, nativeClick, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// Role change screen (20261005060000), through the real app on a disposable venue: the owner changes roles (including
// Authorized ones), a manager only moves people between Frontline roles, nobody changes their own role, Authorized tier staff
// who are not managers and frontline staff cannot change roles, and every change is logged. Allowed and denied database
// cases are also proven in rolled back transactions (tests/sql/role-change.sql).
test.describe.configure({ timeout: 600_000, mode: "serial" });
let fx: Fixture;
const roleId: Record<string, string> = {};
let ownerAppId = "";
let managerAppId = "";
let managerAuthId = "";
let managerEmail = "";
const MANAGER_NAME = "Fixture Manager";
const managerPassword = randomPassword();

test.beforeAll(async () => {
  fx = await createFixture("rc");
  const admin = adminClient();
  const { data } = await admin.from("staff_roles").select("id, name").eq("venue_id", fx.venueId);
  for (const r of data ?? []) roleId[r.name] = r.id;
  // an app role manager (a frontline job role with manager access) with their own generated login, like an owner invite
  managerEmail = `delivered+rcm${randomUUID().slice(0, 8)}@resend.dev`;
  const { data: au, error: ae } = await admin.auth.admin.createUser({ email: managerEmail, password: managerPassword, email_confirm: true });
  if (ae || !au.user) throw ae ?? new Error("no manager login");
  managerAuthId = au.user.id;
  const { data: mrow, error: me } = await admin.from("app_users").insert({ venue_id: fx.venueId, role: "manager", name: MANAGER_NAME, auth_id: managerAuthId, staff_role_id: roleId["Bartender"], onboarding_completed_at: new Date().toISOString() }).select("id").single();
  if (me) throw me;
  managerAppId = mrow!.id;
  ownerAppId = (await admin.from("app_users").select("id").eq("venue_id", fx.venueId).eq("role", "owner").single()).data!.id;
});
test.afterAll(async () => {
  await destroyFixture(fx);
  if (managerAuthId) await adminClient().auth.admin.deleteUser(managerAuthId);
});

async function loginManager(page: import("@playwright/test").Page) {
  await page.context().clearCookies();
  await page.goto(`/${fx.slug}/owner/login`);
  await page.locator('input[type="email"]').fill(managerEmail);
  await page.locator('input[type="password"]').fill(managerPassword);
  await nativeClick(page, "Log in");
  await page.waitForURL(/\/owner\/(dashboard|onboarding)/, { waitUntil: "commit", timeout: 60_000 });
}

const currentRole = async (staffId: string) => (await adminClient().from("app_users").select("staff_role_id").eq("id", staffId).single()).data?.staff_role_id;

test("the owner changes a role on the staff screen, including to and from an Authorized role, and it is logged", async ({ page }) => {
  await loginOwner(page, fx);
  await page.goto(`/${fx.slug}/owner/staff`);
  const select = page.getByLabel(`Role for ${FIXTURE_NAMES.kitchenHand}`);
  await expect(select).toBeVisible({ timeout: 90_000 });
  await select.selectOption({ label: "Waiter, Front of house" });
  await expect(page.getByText("Role changed to Waiter.")).toBeVisible({ timeout: 60_000 });
  expect(await currentRole(fx.staff.kitchenHand.id)).toBe(roleId["Waiter"]);

  await page.getByLabel(`Role for ${FIXTURE_NAMES.kitchenHand}`).selectOption({ label: "Head Chef, Back of house" });
  await expect(page.getByText("Role changed to Head Chef.")).toBeVisible({ timeout: 60_000 });
  expect(await currentRole(fx.staff.kitchenHand.id)).toBe(roleId["Head Chef"]);
  await page.getByLabel(`Role for ${FIXTURE_NAMES.kitchenHand}`).selectOption({ label: "Kitchen Hand, Back of house" });
  await expect(page.getByText("Role changed to Kitchen Hand.")).toBeVisible({ timeout: 60_000 });
  expect(await currentRole(fx.staff.kitchenHand.id)).toBe(roleId["Kitchen Hand"]);

  const { data: log } = await adminClient().from("staff_role_changes").select("changed_by, old_role_name, new_role_name, old_tier, new_tier").eq("staff_user_id", fx.staff.kitchenHand.id).order("changed_at");
  expect(log).toHaveLength(3);
  expect(log![0]).toMatchObject({ changed_by: ownerAppId, old_role_name: "Kitchen Hand", new_role_name: "Waiter", old_tier: "frontline", new_tier: "frontline" });
  expect(log![1]).toMatchObject({ new_role_name: "Head Chef", new_tier: "authorized" });
  expect(log![2]).toMatchObject({ old_tier: "authorized", new_tier: "frontline" });
});

test("a manager moves people between Frontline roles but cannot touch Authorized roles or their own role", async ({ page }) => {
  await loginManager(page);
  await page.goto(`/${fx.slug}/owner/staff`);
  const kh = page.getByLabel(`Role for ${FIXTURE_NAMES.kitchenHand}`);
  await expect(kh).toBeVisible({ timeout: 90_000 });
  // Authorized options are disabled for a manager
  await expect(kh.locator("option", { hasText: "Head Chef" })).toBeDisabled();
  await kh.selectOption({ label: "Waiter, Front of house" });
  await expect(page.getByText("Role changed to Waiter.")).toBeVisible({ timeout: 60_000 });
  expect(await currentRole(fx.staff.kitchenHand.id)).toBe(roleId["Waiter"]);
  // an Authorized person's select is locked, and so is the manager's own
  await expect(page.getByLabel(`Role for ${FIXTURE_NAMES.headChef}`)).toBeDisabled();
  await expect(page.getByLabel(`Role for ${MANAGER_NAME}`)).toBeDisabled();
  await expect(page.getByText("Only the owner can change an Authorized role.").first()).toBeVisible();

  const api = (staffId: string, role: string) => page.request.post(`/api/owner/staff/${staffId}/role`, { data: { roleId: role } });
  expect((await api(fx.staff.kitchenHand.id, roleId["Head Chef"])).status()).toBe(403); // assign Authorized
  expect((await api(fx.staff.headChef.id, roleId["Waiter"])).status()).toBe(403); // remove Authorized
  expect((await api(managerAppId, roleId["Waiter"])).status()).toBe(403); // own role
  expect(await currentRole(fx.staff.kitchenHand.id)).toBe(roleId["Waiter"]);
  expect(await currentRole(fx.staff.headChef.id)).toBe(roleId["Head Chef"]);
  expect(await currentRole(managerAppId)).toBe(roleId["Bartender"]);
});

test("an Authorized tier staff member who is not a manager, and a frontline person, cannot change roles", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.dutyManager);
  const denied = await page.request.post(`/api/owner/staff/${fx.staff.waiter.id}/role`, { data: { roleId: roleId["Bartender"] } });
  expect(denied.status()).toBe(403);
  await page.goto(`/${fx.slug}/owner/staff`);
  await expect(page.getByLabel(`Role for ${FIXTURE_NAMES.waiter}`)).toBeDisabled({ timeout: 90_000 });
  await expect(page.getByText("Only the owner or a manager can change roles.").first()).toBeVisible();

  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  expect((await page.request.post(`/api/owner/staff/${fx.staff.kitchenHand.id}/role`, { data: { roleId: roleId["Bartender"] } })).status()).toBe(403);
  expect((await page.request.post(`/api/owner/staff/${fx.staff.waiter.id}/role`, { data: { roleId: roleId["Head Chef"] } })).status()).toBe(403);
  expect(await currentRole(fx.staff.waiter.id)).toBe(roleId["Waiter"]);
  expect(await currentRole(fx.staff.kitchenHand.id)).toBe(roleId["Waiter"]);
});

test("the route rejects bad input: another venue's role, an owner, an unknown person, a missing role", async ({ page }) => {
  await loginOwner(page, fx);
  const post = (staffId: string, role?: string) => page.request.post(`/api/owner/staff/${staffId}/role`, { data: role === undefined ? {} : { roleId: role } });
  expect((await post(fx.staff.kitchenHand.id)).status()).toBe(400);
  expect((await post(fx.staff.kitchenHand.id, "00000000-0000-0000-0000-000000000000")).status()).toBe(404);
  expect((await post("00000000-0000-0000-0000-000000000000", roleId["Waiter"])).status()).toBe(404);
  expect((await post(ownerAppId, roleId["Waiter"])).status()).toBe(403);
  const same = await post(fx.staff.kitchenHand.id, roleId["Waiter"]);
  expect(same.status()).toBe(200);
  expect((await same.json()).unchanged).toBe(true);
});

test("screenshots: the staff screen with role selects at mobile, iPad and desktop", async ({ page }) => {
  await loginOwner(page, fx);
  const dir = "scratch/compliance-hardening2-report/shots";
  const fs = await import("node:fs");
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, w, h] of [["mobile", 390, 844], ["ipad", 820, 1180], ["desktop", 1280, 900]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`/${fx.slug}/owner/staff`);
    await expect(page.getByLabel(`Role for ${FIXTURE_NAMES.kitchenHand}`)).toBeVisible({ timeout: 90_000 });
    await page.screenshot({ path: `${dir}/role-change-${name}.png`, fullPage: true });
  }
});
