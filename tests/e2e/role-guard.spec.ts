import { test, expect } from "@playwright/test";
import { adminClient, createFixture, destroyFixture, loginOwner, loginStaff, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// Role write guard (20261005000000), through the real app: the welcome role pick only offers frontline roles, the server
// refuses a self pick of a manager tier role and a second change, and a manager cannot add a manager tier role through the
// wizard route (owner only). Disposable fixture venue only.
test.describe.configure({ timeout: 600_000, mode: "serial" });
let fx: Fixture;
const roleId: Record<string, string> = {};
test.beforeAll(async () => {
  fx = await createFixture("rg");
  const { data } = await adminClient().from("staff_roles").select("id, name").eq("venue_id", fx.venueId);
  for (const r of data ?? []) roleId[r.name] = r.id;
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

test("a new hire sees only frontline roles, cannot pick Duty Manager, can pick a frontline role once", async ({ page }) => {
  await adminClient().from("app_users").update({ staff_role_id: null, onboarding_completed_at: null }).eq("id", fx.staff.waiter.id);
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await page.goto(`/${fx.slug}/roles`);
  await expect(page.getByRole("heading", { name: "What's your role?" })).toBeVisible({ timeout: 90_000 });
  const text = (await page.locator("main").innerText()).toLowerCase();
  expect(text).toContain("waiter");
  expect(text).not.toContain("duty manager");
  expect(text).not.toContain("head chef");

  const denied = await page.request.post("/api/staff/set-role", { data: { roleId: roleId["Duty Manager"] } });
  expect(denied.status()).toBe(403);
  const { data: still } = await adminClient().from("app_users").select("staff_role_id").eq("id", fx.staff.waiter.id).single();
  expect(still?.staff_role_id).toBeNull();

  const ok = await page.request.post("/api/staff/set-role", { data: { roleId: roleId["Waiter"] } });
  expect(ok.status()).toBe(200);
  const second = await page.request.post("/api/staff/set-role", { data: { roleId: roleId["Bartender"] } });
  expect(second.status()).toBe(403);
  const { data: after } = await adminClient().from("app_users").select("staff_role_id").eq("id", fx.staff.waiter.id).single();
  expect(after?.staff_role_id).toBe(roleId["Waiter"]);
});

test("the owner can still add a manager tier role through the wizard route; a frontline person cannot call it", async ({ page }) => {
  await loginOwner(page, fx);
  const res = await page.request.post("/api/owner/onboarding/staff-roles", { data: { name: "Floor Lead", department: "FOH", fallbackTier: "authorized" } });
  expect(res.status()).toBe(200);
  const { data } = await adminClient().from("staff_roles").select("fallback_tier").eq("venue_id", fx.venueId).eq("name", "Floor Lead").single();
  expect(data?.fallback_tier).toBe("authorized");
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  const denied = await page.request.post("/api/owner/onboarding/staff-roles", { data: { name: "Sneaky", department: "FOH", fallbackTier: "authorized" } });
  expect(denied.status()).toBe(403);
  const { data: none } = await adminClient().from("staff_roles").select("id").eq("venue_id", fx.venueId).eq("name", "Sneaky");
  expect(none?.length ?? 0).toBe(0);
});
