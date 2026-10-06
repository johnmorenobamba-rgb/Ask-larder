import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { randomPassword } from "../helpers/secrets";
import { adminClient, createFixture, destroyFixture, loginOwner, nativeClick, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// Authorized role holders (20261005100000), through the real app on a disposable venue: only the owner deactivates, reactivates
// or deletes someone who holds an Authorized role; a manager still handles Frontline people; the screen explains instead of
// offering the button; direct API calls get a plain 403; every deactivation is logged. Database cases are also proven in rolled
// back transactions (tests/sql/authorized-holder.sql).
test.describe.configure({ timeout: 600_000, mode: "serial" });
let fx: Fixture;
let managerAuthId = "";
let managerEmail = "";
let headChefRoleId = "";
let inviteId = "";
const MANAGER_NAME = "Fixture Manager";
const managerPassword = randomPassword();

test.beforeAll(async () => {
  fx = await createFixture("ah");
  const admin = adminClient();
  const { data: roles } = await admin.from("staff_roles").select("id, name").eq("venue_id", fx.venueId);
  headChefRoleId = roles!.find((r) => r.name === "Head Chef")!.id;
  const waiterRoleId = roles!.find((r) => r.name === "Waiter")!.id;
  managerEmail = `delivered+ahm${randomUUID().slice(0, 8)}@resend.dev`;
  const { data: au, error: ae } = await admin.auth.admin.createUser({ email: managerEmail, password: managerPassword, email_confirm: true });
  if (ae || !au.user) throw ae ?? new Error("no manager login");
  managerAuthId = au.user.id;
  const { error: me } = await admin.from("app_users").insert({ venue_id: fx.venueId, role: "manager", name: MANAGER_NAME, auth_id: managerAuthId, staff_role_id: waiterRoleId, onboarding_completed_at: new Date().toISOString() });
  if (me) throw me;
  // an invited person with no login yet and an Authorized role (a wizard invite)
  const { data: inv, error: ie } = await admin.from("app_users").insert({ venue_id: fx.venueId, role: "staff", name: "Invited Sous Chef", staff_role_id: headChefRoleId }).select("id").single();
  if (ie) throw ie;
  inviteId = inv!.id;
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
const deactivatedAt = async (id: string) => (await adminClient().from("app_users").select("deactivated_at").eq("id", id).single()).data?.deactivated_at;

test("a manager deactivates a Frontline person on the staff screen, but is not offered the button for an Authorized role holder", async ({ page }) => {
  await loginManager(page);
  await page.goto(`/${fx.slug}/owner/staff`);
  const hc = page.getByTestId("staff-row").filter({ hasText: FIXTURE_NAMES.headChef });
  await expect(hc).toBeVisible({ timeout: 90_000 });
  await expect(hc.getByText("Only the owner can deactivate or reset the PIN of someone with an Authorized role.")).toBeVisible();
  await expect(hc.getByRole("button", { name: "Deactivate" })).toHaveCount(0);
  const kh = page.getByTestId("staff-row").filter({ hasText: FIXTURE_NAMES.kitchenHand });
  await kh.getByRole("button", { name: "Deactivate" }).click();
  await nativeClick(page, `Confirm: remove ${FIXTURE_NAMES.kitchenHand}?`);
  await expect.poll(() => deactivatedAt(fx.staff.kitchenHand.id), { timeout: 60_000 }).not.toBeNull();
  await expect(page.getByRole("heading", { name: "Deactivated" })).toBeVisible({ timeout: 60_000 });
});

test("a manager calling the API directly is refused for an Authorized role holder and for an invited Authorized person", async ({ page }) => {
  await loginManager(page);
  const res = await page.request.post(`/api/owner/staff/${fx.staff.headChef.id}/deactivate`);
  expect(res.status()).toBe(403);
  expect((await res.json()).error).toBe("Only the owner can do this for someone with an Authorized role.");
  expect(await deactivatedAt(fx.staff.headChef.id)).toBeNull();
  const pinRes = await page.request.post(`/api/owner/staff/${fx.staff.headChef.id}/reset-pin`);
  expect(pinRes.status()).toBe(403);
  const dutyRes = await page.request.post(`/api/owner/staff/${fx.staff.dutyManager.id}/deactivate`);
  expect(dutyRes.status()).toBe(403);
  const del = await page.request.delete(`/api/owner/onboarding/staff-invite?id=${inviteId}`);
  expect(del.status()).toBe(403);
  expect((await adminClient().from("app_users").select("id").eq("id", inviteId)).data).toHaveLength(1);
  // a Frontline person is still allowed
  const ok = await page.request.post(`/api/owner/staff/${fx.staff.waiter.id}/deactivate`);
  expect(ok.status()).toBe(200);
});

test("the owner deactivates and reactivates an Authorized role holder, a manager cannot reactivate them, and it is logged", async ({ page }) => {
  await loginOwner(page, fx);
  await page.goto(`/${fx.slug}/owner/staff`);
  const hc = page.getByTestId("staff-row").filter({ hasText: FIXTURE_NAMES.headChef });
  await expect(hc).toBeVisible({ timeout: 90_000 });
  await hc.getByRole("button", { name: "Deactivate" }).click();
  await nativeClick(page, `Confirm: remove ${FIXTURE_NAMES.headChef}?`);
  await expect.poll(() => deactivatedAt(fx.staff.headChef.id), { timeout: 60_000 }).not.toBeNull();

  await loginManager(page);
  const refused = await page.request.post(`/api/owner/staff/${fx.staff.headChef.id}/reactivate`);
  expect(refused.status()).toBe(403);
  expect(await deactivatedAt(fx.staff.headChef.id)).not.toBeNull();
  await page.goto(`/${fx.slug}/owner/staff`);
  await expect(page.getByText("Only the owner can reactivate someone with an Authorized role.")).toBeVisible({ timeout: 90_000 });

  await loginOwner(page, fx);
  await page.goto(`/${fx.slug}/owner/staff`);
  const row = page.locator("div").filter({ hasText: FIXTURE_NAMES.headChef }).filter({ has: page.getByRole("button", { name: "Reactivate" }) }).last();
  await row.getByRole("button", { name: "Reactivate" }).click();
  await expect.poll(() => deactivatedAt(fx.staff.headChef.id), { timeout: 60_000 }).toBeNull();

  const { data: log } = await adminClient().from("staff_access_changes").select("action, role_name, tier").eq("staff_user_id", fx.staff.headChef.id).order("changed_at");
  expect(log?.map((l) => l.action)).toEqual(["deactivated", "reactivated"]);
  expect(log?.[0].role_name).toBe("Head Chef");
  expect(log?.[0].tier).toBe("authorized");
});

test("the owner removes an invited Authorized person", async ({ page }) => {
  await loginOwner(page, fx);
  const del = await page.request.delete(`/api/owner/onboarding/staff-invite?id=${inviteId}`);
  expect(del.status()).toBe(200);
  expect((await adminClient().from("app_users").select("id").eq("id", inviteId)).data).toHaveLength(0);
});
