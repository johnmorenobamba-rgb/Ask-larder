// Live verification of the new elastic/accordion StationsGallery: screenshots
// both real consumers (owner dashboard, staff home dashboard) at mobile,
// tablet, and desktop widths, with real tap interaction (inactive card ->
// expand, active card -> open action), not just a static render.
//
// Staff home dashboard needs a real staff session; the owner account has no
// staff_role_id (visiting a staff page would redirect it to role
// selection). Reuses the invite-a-disposable-test-account-and-have-it-
// self-serve-its-own-PIN pattern from verify-coachmans-arms-station-hubs.mjs
// rather than resetting any real staff member's PIN.
//
// Run with: npx tsx scripts/one-off/verify-stations-accordion.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OWNER_EMAIL = "john.moreno.bamba+coachmans-arms-wizard@gmail.com";
const OWNER_PASSWORD = "RealOwnerAudit2026!";
const TEST_STAFF_NAME = "Accordion Verification Test";
const TEST_STAFF_PHONE = "0400000003";
const TEST_PIN = "6203";
const OUT_DIR = "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\edf5d661-5616-41dc-a854-00bad3fc38f5\\scratchpad\\accordion-screenshots";
mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => {
  window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
});

async function ownerLogin() {
  await page.goto(`${BASE}/coachmans-arms-wizard/owner/login`);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill(OWNER_EMAIL);
  await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click({ force: true });
  await page.waitForURL(/\/owner\/dashboard/, { timeout: 15000 });
}

async function scrollToStations() {
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((p) => p.textContent?.trim() === "Stations");
    el?.scrollIntoView({ block: "start" });
    window.scrollBy(0, -16);
  });
  await page.waitForTimeout(300);
}

async function verifyGallery(label) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await scrollToStations();
    await page.screenshot({ path: `${OUT_DIR}\\${label}-${vp.name}-1-initial.png` });

    // Tap the LAST card (inactive by default, since the first station is
    // active initially) -- should expand it, nothing else.
    const cards = page.locator('[data-testid="station-card"]');
    const count = await cards.count();
    if (count > 1) {
      await cards.nth(count - 1).click();
      await page.waitForTimeout(900); // let the 700ms expand transition finish
      await scrollToStations();
      await page.screenshot({ path: `${OUT_DIR}\\${label}-${vp.name}-2-expanded.png` });

      // Tap the SAME card again (now active) -- should perform the open action.
      await cards.nth(count - 1).click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT_DIR}\\${label}-${vp.name}-3-open-action.png` });

      // Dismiss whatever opened (overlay backdrop click) before the next viewport.
      await page.mouse.click(10, 10).catch(() => {});
    }
    console.log(`${label} @ ${vp.name}: captured.`);
  }
}

console.log("=== Owner dashboard ===");
await ownerLogin();
await page.goto(`${BASE}/coachmans-arms-wizard/owner/dashboard`);
await page.waitForLoadState("networkidle");
await verifyGallery("owner-dashboard");

console.log("\n=== Inviting disposable test staff member for the staff home dashboard ===");
await page.goto(`${BASE}/coachmans-arms-wizard/owner/staff`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Invite staff" }).click();
await page.locator('input[placeholder="Name"]').fill(TEST_STAFF_NAME);
await page.locator('input[placeholder="Phone"]').fill(TEST_STAFF_PHONE);
await page.getByRole("button", { name: "Add staff member" }).click({ force: true });
await page.waitForTimeout(1200);
await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));

console.log("Setting PIN and logging in as the test staff member...");
await page.goto(`${BASE}/coachmans-arms-wizard/login`);
await page.waitForLoadState("networkidle");
await page.getByText(TEST_STAFF_NAME, { exact: true }).click();
await page.locator('input[type="password"][inputmode="numeric"]').first().fill(TEST_PIN);
await page.getByRole("button", { name: "Log in" }).click({ force: true });
await page.waitForTimeout(800);
if (await page.getByText("Set your PIN").count()) {
  const pinInputs = page.locator('input[type="password"][inputmode="numeric"]');
  await pinInputs.nth(0).fill(TEST_PIN);
  await pinInputs.nth(1).fill(TEST_PIN);
  await page.getByRole("button", { name: "Set PIN and log in" }).click({ force: true });
}
await page.waitForLoadState("networkidle");
await page.waitForTimeout(800);

console.log("Selecting a role...");
await page.goto(`${BASE}/coachmans-arms-wizard/roles`);
await page.waitForLoadState("networkidle");
await page.getByText("Floor Staff", { exact: true }).first().click({ force: true });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(800);

console.log("\n=== Staff home dashboard ===");
await page.goto(`${BASE}/coachmans-arms-wizard/home`);
await page.waitForLoadState("networkidle");
await verifyGallery("staff-home");

console.log("\n=== Cleaning up: deactivating the test staff member ===");
await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));
await ownerLogin();
await page.goto(`${BASE}/coachmans-arms-wizard/owner/staff`);
await page.waitForLoadState("networkidle");
const row = page.locator('[data-testid="staff-row"]', { has: page.getByText(TEST_STAFF_NAME, { exact: true }) });
await row.getByRole("button", { name: "Deactivate", exact: true }).click({ force: true });
await page.waitForTimeout(400);
await row.getByRole("button", { name: /^Confirm: remove/ }).click({ force: true });
await page.waitForTimeout(1000);
console.log("Deactivated.");

await browser.close();
console.log(`\nDone. Screenshots in ${OUT_DIR}`);
