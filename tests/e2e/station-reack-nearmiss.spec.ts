import { test, expect } from "@playwright/test";
import { adminClient, createFixture, destroyFixture, loginStaff, nativeClick, PIN, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// Coverage lost with the old phase4 smoke spec (hardening-3 B7), on a DISPOSABLE venue removed afterwards:
//   C9  a module version published after a completion makes the staff member acknowledge it before anything else, once;
//   C8  a QR station scan with no session goes to the login with a way back, and after login lands on that station page;
//   C10 the near miss quick report from the station page, named and anonymous, and what is stored for each.
test.describe.configure({ timeout: 600_000, mode: "serial" });
let fx: Fixture;
let stationSlug = "";
let moduleId = "";
let versionId = "";

async function pinLogin(page: import("@playwright/test").Page, name: string) {
  await nativeClick(page, name);
  await page.locator('input[type="password"]').fill(PIN);
  await nativeClick(page, "Log in");
}

test.beforeAll(async () => {
  fx = await createFixture("qr");
  const admin = adminClient();
  const { data: mod, error } = await admin.from("modules").insert({ venue_id: fx.venueId, title: "Fixture module (test data)", status: "live", version: 1 }).select("id").single();
  if (error) throw error;
  moduleId = mod!.id;
  await admin.from("module_sections").insert({ module_id: moduleId, section_order: 1, content: "Wash your hands before you start." }).throwOnError();
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
  await admin.from("staff_module_progress").insert({ user_id: fx.staff.waiter.id, module_id: moduleId, status: "completed", completed_at: twoDaysAgo }).throwOnError();
  const { data: ver, error: ve } = await admin.from("module_versions").insert({ module_id: moduleId, version: 2, changelog: "Fixture changelog: wash for twenty seconds." }).select("id").single();
  if (ve) throw ve;
  versionId = ver!.id;
  const { data: st } = await admin.from("stations").select("id, qr_code_slug").eq("venue_id", fx.venueId).eq("name", "Pizza oven").single();
  stationSlug = st!.qr_code_slug;
  await admin.from("stations").update({ primary_module_id: moduleId }).eq("id", st!.id).throwOnError();
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

test("C9: a published update is shown before anything else, acknowledged once, and does not come back", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto(`/${fx.slug}/login`);
  await pinLogin(page, FIXTURE_NAMES.waiter);
  await page.waitForURL(/\/module-updates$/, { waitUntil: "commit", timeout: 90_000 });
  await expect(page.getByText("Fixture module (test data)")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Fixture changelog: wash for twenty seconds.")).toBeVisible();
  // another protected page sends the person back to the update until it is acknowledged
  await page.goto(`/${fx.slug}/modules`);
  await expect(page).toHaveURL(/\/module-updates$/, { timeout: 60_000 });
  await nativeClick(page, "Acknowledge and continue");
  await expect(page).toHaveURL(/\/modules$/, { timeout: 60_000 });
  const { data: acks } = await adminClient().from("staff_module_acknowledgements").select("module_version_id").eq("user_id", fx.staff.waiter.id);
  expect(acks).toHaveLength(1);
  expect(acks![0].module_version_id).toBe(versionId);
  await page.goto(`/${fx.slug}/modules`);
  await expect(page).toHaveURL(/\/modules$/);
  await page.goto(`/${fx.slug}/home`);
  await expect(page).not.toHaveURL(/module-updates/);
});

test("C8: a QR scan with no session goes to the login and, after login, lands on that station", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto(`/${fx.slug}/station/${stationSlug}`);
  await expect(page).toHaveURL(/\/login\?redirectTo=/, { timeout: 60_000 });
  expect(decodeURIComponent(page.url())).toContain(`/${fx.slug}/station/${stationSlug}`);
  await pinLogin(page, FIXTURE_NAMES.waiter);
  await page.waitForURL(new RegExp(`/station/${stationSlug}$`), { waitUntil: "commit", timeout: 90_000 });
  await expect(page.getByText("Pizza oven").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /Ask Larder/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Something felt unsafe?" })).toBeVisible();
});

test("C8: a QR code that belongs to no station of this venue shows a clean not found, not an error", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  const res = await page.goto(`/${fx.slug}/station/no-such-station-${stationSlug}`);
  // a signed in person asking for an unknown code: the app answers with a normal page (not a 500)
  expect(res!.status()).toBeLessThan(500);
  expect(res!.status()).toBe(404); // reported finding if this differs
});

test("C10: the near miss quick report from a station, named and anonymous, stores what the person chose", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await page.goto(`/${fx.slug}/station/${stationSlug}`);
  await expect(page.getByRole("button", { name: "Something felt unsafe?" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Something felt unsafe?" }).click();
  await page.getByPlaceholder("What happened?").fill("Wet floor near the pass, no sign out.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Thanks. That's been sent.")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Something felt unsafe?" }).click();
  await page.getByPlaceholder("What happened?").fill("Knife left on the edge of the bench.");
  await page.getByLabel("Report anonymously").check();
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Thanks. That's been sent.")).toBeVisible({ timeout: 60_000 });

  const { data: rows } = await adminClient().from("near_miss_reports").select("description, is_anonymous, reported_by, station_id, status").eq("venue_id", fx.venueId).order("created_at");
  expect(rows).toHaveLength(2);
  const named = rows!.find((r) => r.description?.startsWith("Wet floor"))!;
  const anon = rows!.find((r) => r.description?.startsWith("Knife"))!;
  expect(named.is_anonymous).toBe(false);
  expect(named.reported_by).toBe(fx.staff.waiter.id);
  expect(named.station_id).toBeTruthy();
  expect(anon.is_anonymous).toBe(true);
  expect(anon.reported_by).toBeNull(); // an anonymous report keeps no reporter
  expect(anon.station_id).toBeTruthy();
});
