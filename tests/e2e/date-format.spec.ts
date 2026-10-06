import { test, expect } from "@playwright/test";
import { adminClient, createFixture, destroyFixture, loginOwner, loginStaff, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// Dates are written day, month, year ("6 Oct 2026") on the owner and staff screens, never "10/6/2026" (month first), even though the
// server and the browser here default to a US locale. Disposable venue, removed afterwards.
test.describe.configure({ timeout: 600_000, mode: "serial" });
test.use({ locale: "en-US" }); // the browser default must not decide the order
let fx: Fixture;
const AU = /\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}\b/;
const NUMERIC = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/;
let moduleId = "";

test.beforeAll(async () => {
  fx = await createFixture("qr");
  const admin = adminClient();
  const { data: mod } = await admin.from("modules").insert({ venue_id: fx.venueId, title: "Fixture module (test data)", status: "live", version: 1 }).select("id").single();
  moduleId = mod!.id;
  await admin.from("module_versions").insert({ module_id: moduleId, version: 2, changelog: "Fixture changelog" }).throwOnError();
  await admin.from("chat_messages").insert({ venue_id: fx.venueId, user_id: fx.staff.waiter.id, role: "assistant", message: "Ask your supervisor for assistance, as they have access to the safe.", is_escalation: true }).throwOnError();
  await admin.from("near_miss_reports").insert({ venue_id: fx.venueId, description: "Fixture near miss", is_anonymous: false, reported_by: fx.staff.waiter.id }).throwOnError();
  const { data: ct } = await admin.from("certificate_types").insert({ venue_id: fx.venueId, name: "RSA certificate", cert_kind: "rsa", tracking_type: "hard_expiry", validity_years: 3 }).select("id").single();
  await admin.from("staff_certificates").insert({ user_id: fx.staff.waiter.id, certificate_type_id: ct!.id, issued_date: "2026-01-02", expiry_date: "2029-01-02" }).throwOnError();
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

async function expectAuDates(page: import("@playwright/test").Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  const text = await page.locator("main").first().innerText();
  expect(text, `${url} shows a day month year date`).toMatch(AU);
  expect(text, `${url} shows no month first numeric date`).not.toMatch(NUMERIC);
}

test("owner screens write dates day, month, year", async ({ page }) => {
  await loginOwner(page, fx);
  await expectAuDates(page, `/${fx.slug}/owner/escalations`);
  await expectAuDates(page, `/${fx.slug}/owner/near-misses`);
  await expectAuDates(page, `/${fx.slug}/owner/modules/${moduleId}/versions`);
  await expectAuDates(page, `/${fx.slug}/owner/certs`);
});

test("staff screens write dates day, month, year", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await expectAuDates(page, `/${fx.slug}/certs`);
  await page.goto(`/${fx.slug}/forms`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
  expect(await page.locator("main").first().innerText()).not.toMatch(NUMERIC);
});
