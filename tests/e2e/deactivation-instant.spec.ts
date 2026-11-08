import { config } from "dotenv";
config({ path: ".env.local" });

import { test, expect } from "@playwright/test";
import { DEMO_VENUE_SLUG as SLUG, admin, demoRoleId, demoVenueId, makeDemoAccount, signedInContext, sweepDemoAccounts } from "./helpers/demoSession";

// Block U: deactivating a person locks them out on their very next request, even though their session token is still
// valid. getCurrentStaff verifies the token locally (auth.getClaims, ES256) and enforces deactivation through the
// app_users lookup's deactivated_at filter, so this proves the switch away from auth.getUser kept that guarantee.
// Runs against the dev server or a deployment. Throwaway demo venue accounts, removed afterwards.

let venueId: string;

test.describe.configure({ mode: "serial", timeout: 120_000 });

test.beforeAll(async () => {
  venueId = await demoVenueId();
  await sweepDemoAccounts(venueId);
});

test.afterAll(async () => {
  if (venueId) await sweepDemoAccounts(venueId);
});

async function deactivate(email: string) {
  await admin().from("app_users").update({ deactivated_at: new Date().toISOString() }).eq("email", email).throwOnError();
}

test("a deactivated staff member is out on the next request", async ({ browser, baseURL }) => {
  const email = await makeDemoAccount(venueId, "staff", await demoRoleId(venueId, "Floor Staff"));
  const context = await signedInContext(browser, email, baseURL!);
  const page = await context.newPage();

  await page.goto(`/${SLUG}/home`);
  await expect(page.locator("h1").filter({ hasText: /^(Morning|Afternoon|Evening), / })).toBeVisible({ timeout: 60_000 });

  await deactivate(email);

  // Same browser, same (still unexpired) session cookie.
  await page.goto(`/${SLUG}/home`);
  await page.waitForURL(new RegExp(`/${SLUG}/login$`), { timeout: 60_000 });
  const ask = await context.request.post("/api/staff/ask-larder", { data: { question: "What time does the kitchen open?" } });
  expect(ask.status()).toBe(401);
  await context.close();
});

test("a deactivated manager is out of the owner dashboard on the next request", async ({ browser, baseURL }) => {
  const email = await makeDemoAccount(venueId, "manager", null);
  const context = await signedInContext(browser, email, baseURL!);
  const page = await context.newPage();

  await page.goto(`/${SLUG}/owner/dashboard`);
  await expect(page.locator("h1").filter({ hasText: /^Dashboard$/ })).toBeVisible({ timeout: 60_000 });

  await deactivate(email);

  await page.goto(`/${SLUG}/owner/dashboard`);
  await page.waitForURL(new RegExp(`/${SLUG}/owner/login$`), { timeout: 60_000 });
  await context.close();
});
