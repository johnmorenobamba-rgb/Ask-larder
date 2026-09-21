// A purpose-built marketing screenshot (viewport-only, not full-page) of
// the real suggestion feed for Part 4's new landing page section -- the
// same real coachmans-arms-wizard data from the Part 2 seeding run.
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
await page.setViewportSize({ width: 1000, height: 900 });

await page.goto(`${BASE}/${VENUE_SLUG}/owner/login`);
await page.waitForLoadState("networkidle");
await page.locator('input[type="email"]').fill(OWNER_EMAIL);
await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
await page.getByRole("button", { name: "Log in" }).click({ force: true });
await page.waitForURL(/\/owner\/dashboard/, { timeout: 15000 });

await page.goto(`${BASE}/${VENUE_SLUG}/owner/suggestions`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
// Viewport-only (not fullPage) -- shows the header + first two cards, a
// legible marketing crop rather than the entire long scroll.
await page.screenshot({ path: "public/images/marketing/suggestion-assistant-feed.png" });
console.log("Marketing screenshot saved.");

await browser.close();
