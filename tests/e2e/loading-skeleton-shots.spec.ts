import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { DEMO_VENUE_SLUG as SLUG, demoRoleId, demoVenueId, makeDemoAccount, sessionCookies, sweepDemoAccounts } from "./helpers/demoSession";

// Screenshots of the content area loading skeleton (performance plan, Phase 3) at mobile, iPad and desktop
// (CLAUDE.md rule 5). Each shot taps a nav drawer item while the next screen's data request is held for a few
// seconds, so the skeleton is on screen under the still visible header. Also asserts the header stays visible and
// no full screen overlay appears. Throwaway demo venue accounts, removed afterwards.

const SHOTS = path.resolve(__dirname, "../../docs/screenshots/loading-skeletons");
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  ipad: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
} as const;

let venueId: string;
let staffEmail: string;
let managerEmail: string;

test.describe.configure({ mode: "serial", timeout: 300_000 });

test.beforeAll(async () => {
  venueId = await demoVenueId();
  await sweepDemoAccounts(venueId);
  staffEmail = await makeDemoAccount(venueId, "staff", await demoRoleId(venueId, "Kitchen Hand"));
  managerEmail = await makeDemoAccount(venueId, "manager", null);
  fs.mkdirSync(SHOTS, { recursive: true });
});

test.afterAll(async () => {
  if (venueId) await sweepDemoAccounts(venueId);
});

/** Opens the drawer, holds the RSC request for the destination, taps the link and returns once the skeleton shows. */
async function tapAndHold(page: Page, link: RegExp, destination: string) {
  await page.getByRole("button", { name: "Open menu" }).click();
  // Opening the drawer brings its links into view, which prefetches each one's loading shell: let that land first,
  // then hold only the navigation's own data request. Needs a production build (the dev server never prefetches):
  //   npx next build --webpack && npx next start -p 3100, then PLAYWRIGHT_BASE_URL=http://localhost:3100
  await page.waitForTimeout(1_500);
  await page.route(
    (u) => u.pathname.endsWith(destination) && u.searchParams.has("_rsc"),
    async (route) => {
      await new Promise((r) => setTimeout(r, 4_000));
      await route.continue().catch(() => {});
    },
  );
  await page.getByRole("link", { name: link }).filter({ visible: true }).first().click();
  const skeleton = page.locator('[role="status"][aria-busy="true"]');
  await expect(skeleton).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(600); // past the 150ms entrance delay and fade
  // The header stays visible and nothing covers the whole screen.
  await expect(page.locator("header").first()).toBeVisible();
  expect(await page.locator('.fixed.inset-0[role="status"]').count()).toBe(0);
}

for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
  test(`staff skeletons at ${vpName}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport });
    await context.addCookies(await sessionCookies(staffEmail, baseURL!));
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
      } catch {}
    });
    const page = await context.newPage();
    await page.goto(`/${SLUG}/home`);
    await expect(page.locator("h1").filter({ hasText: /^(Morning|Afternoon|Evening), / })).toBeVisible({ timeout: 60_000 });

    await tapAndHold(page, /^Modules$/, "/modules");
    await page.screenshot({ path: path.join(SHOTS, `staff-list-${vpName}.png`) });
    await expect(page.locator("h1").filter({ hasText: /^Your modules$/ })).toBeVisible({ timeout: 30_000 });
    await page.unrouteAll({ behavior: "ignoreErrors" });

    await tapAndHold(page, /^Larder Home$/, "/home");
    await page.screenshot({ path: path.join(SHOTS, `staff-home-${vpName}.png`) });
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await context.close();
  });

  test(`owner skeletons at ${vpName}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport });
    await context.addCookies(await sessionCookies(managerEmail, baseURL!));
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
      } catch {}
    });
    const page = await context.newPage();
    await page.goto(`/${SLUG}/owner/staff`);
    await expect(page.locator("h1").filter({ hasText: /^Staff$/ })).toBeVisible({ timeout: 60_000 });

    await tapAndHold(page, /^Dashboard$/, "/owner/dashboard");
    await page.screenshot({ path: path.join(SHOTS, `owner-dashboard-${vpName}.png`) });
    await expect(page.locator("h1").filter({ hasText: /^Dashboard$/ })).toBeVisible({ timeout: 30_000 });
    await page.unrouteAll({ behavior: "ignoreErrors" });

    await tapAndHold(page, /^Certificates$/, "/owner/certs");
    await page.screenshot({ path: path.join(SHOTS, `owner-list-${vpName}.png`) });
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await context.close();
  });
}
