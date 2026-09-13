import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const VENUE_SLUG = "internal-qa-test";
const OWNER_EMAIL = "qa-test-internal@example.com";
const OWNER_PASSWORD = "QaTestInternal2026!";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => {
  window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
});

await page.goto(`${BASE}/${VENUE_SLUG}/owner/login`);
await page.locator('input[type="email"], input[placeholder="Email"]').first().fill(OWNER_EMAIL);
await page.locator('input[type="password"], input[placeholder="Password"]').first().fill(OWNER_PASSWORD);
await page.getByRole("button", { name: "Log in" }).click({ force: true });
await page.waitForURL(/\/owner\/dashboard/, { timeout: 15000 });

await page.goto(`${BASE}/${VENUE_SLUG}/owner/onboarding/content-intake`, { timeout: 60000 });
await page.waitForTimeout(1500);

const text = await page.locator("main").innerText();
console.log("PAGE TEXT:\n", text.slice(0, 1500));

const textareaValue = await page.locator("textarea").first().inputValue().catch(() => "(no textarea)");
console.log("\nTEXTAREA VALUE:\n", textareaValue);

await browser.close();
