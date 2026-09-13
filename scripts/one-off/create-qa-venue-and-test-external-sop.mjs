// Task 2 of the follow-up: create a new, clearly-labeled INTERNAL QA test
// venue (not a fourth demo venue) via the real /onboarding/start flow, then
// run a genuinely external, real, publicly-available document (Safe Work
// Australia's "Accommodation services - Managing risks" guidance page,
// fetched live, not fabricated) through the actual content-intake flow, to
// see how the pipeline performs against real unseen input rather than
// seeded content.
//
// Run with: npx tsx scripts/one-off/create-qa-venue-and-test-external-sop.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const VENUE_NAME = "INTERNAL QA TEST — do not use for real clients";
const VENUE_SLUG = "internal-qa-test";
const OWNER_EMAIL = "qa-test-internal@example.com";
const OWNER_PASSWORD = "QaTestInternal2026!";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => {
  window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
});
page.on("response", async (res) => {
  if (res.url().includes("/api/") && res.status() >= 400) {
    console.log(`  [${res.status()}] ${res.url()}`);
    try {
      console.log("    body:", (await res.text()).slice(0, 300));
    } catch {}
  }
});

const SKIP_CREATE = process.argv.includes("--skip-create");

if (!SKIP_CREATE) {
  console.log("Creating QA venue...");
  await page.goto(`${BASE}/onboarding/start`);
  await page.locator('input[placeholder="Trading name"]').fill(VENUE_NAME);
  await page.locator('input[placeholder="venue-slug"]').fill(VENUE_SLUG);
  await page.locator('input[placeholder="Your name"]').fill("QA Test Runner");
  await page.locator('input[placeholder="you@venue.com.au"]').fill(OWNER_EMAIL);
  await page.locator('input[placeholder="At least 8 characters"]').fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Create venue and start onboarding" }).click({ force: true });
  await page.waitForURL(/\/owner\/onboarding\/venue-basics/, { timeout: 15000 });
  console.log("Venue created:", page.url());
} else {
  console.log("Logging in as existing QA venue owner...");
  await page.goto(`${BASE}/${VENUE_SLUG}/owner/login`);
  await page.locator('input[type="email"], input[placeholder="Email"]').first().fill(OWNER_EMAIL);
  await page.locator('input[type="password"], input[placeholder="Password"]').first().fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click({ force: true });
  await page.waitForURL(/\/owner\/dashboard/, { timeout: 15000 });
  console.log("Logged in:", page.url());
}

console.log("\nNavigating directly to content-intake (first visit runs topic determination synchronously, can be slow)...");
await page.goto(`${BASE}/${VENUE_SLUG}/owner/onboarding/content-intake`, { timeout: 120000 });
await page.waitForTimeout(3000);
console.log("Content-intake URL:", page.url());
console.log((await page.locator("main, body").first().innerText()).slice(0, 600));

await browser.close();
