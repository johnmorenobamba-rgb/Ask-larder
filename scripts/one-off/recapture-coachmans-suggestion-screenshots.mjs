// Re-captures the Part 2 evidence screenshots now that all 6 suggestions
// have finished generating (the first capture ran too soon after clicking
// "Check for new suggestions" -- the real Claude-backed pass took longer
// than the script's wait, so it only caught 2 of 6).
import { chromium } from "playwright";

const BASE = "https://asklarder.com.au";
const VENUE_SLUG = "coachmans-arms-wizard";
const OWNER_EMAIL = "john.moreno.bamba+coachmans-arms-wizard@gmail.com";
const OWNER_PASSWORD = "RealOwnerAudit2026!";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => {
  window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
});
await page.setViewportSize({ width: 1024, height: 1366 });

await page.goto(`${BASE}/${VENUE_SLUG}/owner/login`);
await page.waitForLoadState("networkidle");
await page.locator('input[type="email"]').fill(OWNER_EMAIL);
await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
await page.getByRole("button", { name: "Log in" }).click({ force: true });
await page.waitForURL(/\/owner\/dashboard/, { timeout: 15000 });

await page.goto(`${BASE}/${VENUE_SLUG}/owner/suggestions`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/suggestion-feed-coachmans.png", fullPage: true });
console.log("Suggestion feed screenshot saved.");

await page.goto(`${BASE}/${VENUE_SLUG}/owner/dashboard`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/owner-dashboard-tile-coachmans.png", fullPage: true });
console.log("Dashboard screenshot saved.");

await browser.close();
