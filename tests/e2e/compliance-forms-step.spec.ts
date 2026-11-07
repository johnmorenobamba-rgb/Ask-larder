import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { adminClient, createFixture, destroyFixture, loginOwner, nativeClick, FIXTURE_NAMES, PIN, type Fixture } from "./helpers/stage0";
import { pickerName } from "./helpers/pickerName";
import { FORMS } from "../../src/lib/compliance/engine/forms";
import type { Json } from "../../src/lib/supabase/types";

// Compliance forms wizard step (PR #2, verified 8 Nov 2026), on a DISPOSABLE fixture venue removed afterwards. Never the
// coachmans-arms-wizard demo venue. Covers: pub defaults, an owner switch that Owner, Forms agrees with, the "Check these
// answers" panel and its links, the no units warning, back links, the POST route refusing a frontline staff login and the
// venue iPad device account, and confirm setting compliance_forms_reviewed so Review & activate drops the outstanding item.
// Screenshots (mobile, iPad, desktop, with and without the panel) go to docs/screenshots/compliance-forms-step/.
//
// Local: npx playwright test compliance-forms-step
// Production smoke (defaults, a switch, confirm, then the venue is removed; no screenshots, no device pairing):
//   CF_STEP_SMOKE=1 PLAYWRIGHT_BASE_URL=https://asklarder.com.au npx playwright test compliance-forms-step

const SMOKE = process.env.CF_STEP_SMOKE === "1";
const SHOTS = path.resolve(__dirname, "../../docs/screenshots/compliance-forms-step");
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  ipad: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
} as const;
const CAFE_PACK = ["Coffee machine cleaning", "Coffee machine descale", "Display cabinet temperatures"];
const PUB_DEFAULT_ON = FORMS.length - CAFE_PACK.length;

test.describe.configure({ mode: "serial", timeout: 240_000 });
test.use({ viewport: VIEWPORTS.ipad, hasTouch: true });

let fx: Fixture;
const stepPath = () => `/${fx.slug}/owner/onboarding/compliance-forms`;
const reviewPath = () => `/${fx.slug}/owner/onboarding/review`;

async function setSettings(patch: { venue_type?: "pub" | null; trade_waste_agreement?: "yes" | "unsure" }) {
  await adminClient().from("venue_compliance_settings").update(patch).eq("venue_id", fx.venueId).throwOnError();
}
async function setFlags(flags: { [key: string]: Json }) {
  await adminClient().from("wizard_sessions").update({ venue_type_flags: flags }).eq("venue_id", fx.venueId).throwOnError();
}
async function reviewedFlag(): Promise<boolean | undefined> {
  const { data } = await adminClient().from("wizard_sessions").select("venue_type_flags").eq("venue_id", fx.venueId).maybeSingle();
  return (data?.venue_type_flags as { compliance_forms_reviewed?: boolean } | null)?.compliance_forms_reviewed;
}
async function openStep(page: Page) {
  await page.goto(stepPath());
  await expect(page.getByRole("heading", { name: "Compliance forms", exact: true })).toBeVisible({ timeout: 90_000 });
}
async function switchStates(page: Page): Promise<{ on: string[]; off: string[] }> {
  const all = await page.getByRole("switch").evaluateAll((els) => els.map((e) => ({ name: e.getAttribute("aria-label") ?? "", on: e.getAttribute("aria-checked") === "true" })));
  return { on: all.filter((s) => s.on).map((s) => s.name).sort(), off: all.filter((s) => !s.on).map((s) => s.name).sort() };
}
async function shoot(page: Page, state: string) {
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(400);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(SHOTS, `${name}-${state}.png`), fullPage: true });
  }
  await page.setViewportSize(VIEWPORTS.ipad);
}

test.beforeAll(async () => {
  fx = await createFixture("cfs");
  // The fixture is a general licence pub with a full kitchen and a trade waste agreement; give it the venue type too.
  await setSettings({ venue_type: "pub" });
});

// The cold load splash plays for about 2.5s once per day per browser (localStorage). Every test context is fresh, so mark it
// as already shown, or it covers the first viewport of the screenshots.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
    } catch {}
  });
});

test.afterAll(async () => {
  if (!fx) return;
  const admin = adminClient();
  // destroyFixture removes the owner and staff auth users; the device account's auth user (made on iPad resume) is ours to remove.
  const { data: device } = await admin.from("app_users").select("auth_id").eq("venue_id", fx.venueId).eq("role", "device").maybeSingle();
  await destroyFixture(fx);
  if (device?.auth_id) await admin.auth.admin.deleteUser(device.auth_id);
});

test("defaults: a pub with a full kitchen and trade waste has every form on except the cafe pack", async ({ page }) => {
  await loginOwner(page, fx);
  await openStep(page);
  const { on, off } = await switchStates(page);
  expect(off).toEqual([...CAFE_PACK].sort());
  expect(on).toHaveLength(PUB_DEFAULT_ON);
  await expect(page.getByText(`${PUB_DEFAULT_ON} of ${FORMS.length} forms on, plus the temperature log.`)).toBeVisible();
  await expect(page.getByText("The temperature log is always on and covers 4 units.")).toBeVisible();
  expect(await page.locator("li", { has: page.getByRole("link", { name: /^Go to / }) }).allInnerTexts()).toEqual([]);
  await expect(page.getByText("Check these answers")).toHaveCount(0);
  if (!SMOKE) await shoot(page, "defaults");
});

test("a switch on the step says so and Owner, Forms shows the same", async ({ page }) => {
  await loginOwner(page, fx);
  await openStep(page);
  const sw = page.getByRole("switch", { name: "Lost property log" });
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false");
  const row = page.locator("li", { has: sw });
  await expect(row.getByText("Switched off by the owner")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`${PUB_DEFAULT_ON - 1} of ${FORMS.length} forms on`, { exact: false })).toBeVisible();

  const { data: stored } = await adminClient().from("venue_compliance_forms").select("enabled").eq("venue_id", fx.venueId).eq("form_id", "F13").maybeSingle();
  expect(stored?.enabled).toBe(false);

  await page.goto(`/${fx.slug}/owner/forms`);
  const ownerSw = page.getByRole("switch", { name: "Lost property log" });
  await expect(ownerSw).toHaveAttribute("aria-checked", "false", { timeout: 60_000 });
  await expect(page.locator("li", { has: ownerSw }).getByText("Switched off by the owner")).toBeVisible();

  // Back on from the step, so the counts later in this file are the pub defaults again.
  await openStep(page);
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await expect(row.getByText("Switched on by the owner")).toBeVisible({ timeout: 15_000 });
  await page.goto(`/${fx.slug}/owner/forms`);
  await expect(page.locator("li", { has: ownerSw }).getByText("Switched on by the owner")).toBeVisible({ timeout: 60_000 });
});

test("the no units warning shows when the venue has no active refrigeration units", async ({ page }) => {
  test.skip(SMOKE, "local only");
  const admin = adminClient();
  await admin.from("venue_refrigeration_units").update({ is_active: false }).eq("venue_id", fx.venueId).throwOnError();
  try {
    await loginOwner(page, fx);
    await openStep(page);
    await expect(page.getByText("no fridges, freezers or hot hold units are listed yet", { exact: false })).toBeVisible();
    const add = page.getByRole("link", { name: "Add units" });
    await expect(add).toHaveAttribute("href", `/${fx.slug}/owner/onboarding/compliance-setup`);
  } finally {
    await admin.from("venue_refrigeration_units").update({ is_active: true }).eq("venue_id", fx.venueId).throwOnError();
  }
});

test("Check these answers appears for a missing venue type, food service and an unsure trade waste answer", async ({ page }) => {
  test.skip(SMOKE, "local only");
  await loginOwner(page, fx);

  // One at a time first, so each condition is proven to raise the panel on its own.
  const cases: { name: string; apply: () => Promise<void>; text: string; href: string }[] = [
    { name: "venue type", apply: () => setSettings({ venue_type: null }), text: "Venue type isn't set.", href: "compliance-setup" },
    { name: "food service", apply: () => setFlags({}), text: "Food service level isn't set", href: "food-service" },
    { name: "trade waste", apply: () => setSettings({ trade_waste_agreement: "unsure" }), text: "Trade Waste Agreement is unsure", href: "compliance-setup" },
  ];
  const restore = async () => {
    await setSettings({ venue_type: "pub", trade_waste_agreement: "yes" });
    await setFlags({ food_service_level: "full_kitchen" });
  };
  try {
    for (const c of cases) {
      await restore();
      await c.apply();
      await openStep(page);
      await expect(page.getByText("Check these answers")).toBeVisible();
      const item = page.locator("li", { hasText: c.text });
      await expect(item).toHaveCount(1);
      await expect(page.locator("li", { has: page.getByRole("link", { name: /^Go to / }) })).toHaveCount(1);
      await expect(item.getByRole("link")).toHaveAttribute("href", `/${fx.slug}/owner/onboarding/${c.href}`);
    }

    // All three together: the panel for the screenshots, and following each kind of link lands on its step.
    await restore();
    for (const c of cases) await c.apply();
    await openStep(page);
    await expect(page.locator("li", { has: page.getByRole("link", { name: /^Go to / }) })).toHaveCount(3);
    await shoot(page, "check-these-answers");
    await page.getByRole("link", { name: "Go to Food service" }).click();
    await page.waitForURL(/\/onboarding\/food-service$/, { timeout: 60_000 });
    await openStep(page);
    await page.getByRole("link", { name: "Go to Fridges and compliance" }).first().click();
    await page.waitForURL(/\/onboarding\/compliance-setup$/, { timeout: 60_000 });
  } finally {
    await restore();
  }
});

test("back links: the step goes back to Certificate types, Review goes back to the step, and Review lists it as outstanding", async ({ page }) => {
  test.skip(SMOKE, "local only");
  await loginOwner(page, fx);
  await openStep(page);
  await expect(page.getByRole("link", { name: /Back/ })).toHaveAttribute("href", `/${fx.slug}/owner/onboarding/certificate-types`);
  await page.goto(reviewPath());
  await expect(page.getByRole("link", { name: /Back/ })).toHaveAttribute("href", `/${fx.slug}/owner/onboarding/compliance-forms`, { timeout: 90_000 });
  await expect(page.getByText("Compliance forms haven't been reviewed yet. Check which forms are on under Compliance forms.")).toBeVisible();
});

test("the confirm route refuses a frontline staff login and the venue iPad device account", async ({ browser }) => {
  test.skip(SMOKE, "local only");
  const route = "/api/owner/onboarding/compliance-forms";
  // A non touch context: on a touch device the staff login shows the on screen PIN pad, not the password field the
  // shared loginStaff helper fills.
  const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
  const page = await context.newPage();

  // Frontline staff (Kitchen Hand, fallback tier frontline). Real Playwright clicks rather than the shared loginStaff
  // helper: its DOM click can fire before the login page hydrates on a dev server, and then nothing happens.
  await page.goto(`/${fx.slug}/login`);
  await page.getByRole("button", { name: pickerName(FIXTURE_NAMES.kitchenHand) }).click();
  await page.locator('input[type="password"]').fill(PIN);
  await nativeClick(page, "Log in"); // inside a floating card: never "stable" to Playwright (project gotcha)
  await page.waitForURL(/\/(welcome|roles|modules|home)$/, { timeout: 60_000 });
  const asStaff = await page.request.post(route);
  expect(asStaff.status()).toBe(403);

  // Venue iPad: iPad mode on, the owner pairs this browser, then only the pairing cookie is kept and the login page
  // resumes the device account (the real path an iPad takes).
  await adminClient().from("venues").update({ ipad_mode_enabled: true }).eq("id", fx.venueId).throwOnError();
  await loginOwner(page, fx);
  const pair = await page.request.post("/api/owner/ipad", { data: { label: "Fixture iPad" } });
  expect(pair.status()).toBe(200);
  const deviceCookie = (await page.context().cookies()).filter((c) => c.name === "larder_device");
  expect(deviceCookie).toHaveLength(1);
  await page.context().clearCookies();
  await page.context().addCookies(deviceCookie);
  await page.goto(`/${fx.slug}/login`);
  await page.waitForURL(new RegExp(`/${fx.slug}/device$`), { timeout: 60_000 });
  const asDevice = await page.request.post(route);
  expect(asDevice.status()).toBe(403);

  expect(await reviewedFlag()).not.toBe(true);
  await context.close();
});

test("confirm records the review and Review & activate drops the outstanding item", async ({ page }) => {
  await loginOwner(page, fx);
  await openStep(page);
  expect(await reviewedFlag()).not.toBe(true);
  await page.getByRole("button", { name: "Confirm forms and continue" }).click();
  await page.waitForURL(/\/onboarding\/review$/, { timeout: 60_000 });
  expect(await reviewedFlag()).toBe(true);
  await expect(page.getByText("Compliance forms on", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Compliance forms on", { exact: true }).locator("xpath=preceding-sibling::p[1]")).toHaveText(String(PUB_DEFAULT_ON));
  await expect(page.getByText("Compliance forms haven't been reviewed yet", { exact: false })).toHaveCount(0);
});
