// Cleans up the 3 disposable "QR Hub Verification Test*" staff accounts
// left over from verify-coachmans-arms-station-hubs.mjs (its own
// deactivate step only clicked "Deactivate" once, which just reveals a
// second "Confirm: remove <name>?" button -- StaffLifecycleActions.tsx's
// real two-step confirm -- so nothing was actually deactivated).
//
// Run with: npx tsx scripts/one-off/cleanup-qr-hub-verification-test-staff.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const NAMES = ["QR Hub Verification Test", "QR Hub Verification Test 2", "QR Hub Verification Test 3"];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => {
  window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
});

await page.goto(`${BASE}/coachmans-arms-wizard/owner/login`);
await page.waitForLoadState("networkidle");
await page.locator('input[type="email"]').fill("john.moreno.bamba+coachmans-arms-wizard@gmail.com");
await page.locator('input[type="password"]').fill("RealOwnerAudit2026!");
await page.getByRole("button", { name: "Log in" }).click({ force: true });
await page.waitForURL(/\/owner\/dashboard/, { timeout: 15000 });

for (const name of NAMES) {
  await page.goto(`${BASE}/coachmans-arms-wizard/owner/staff`);
  await page.waitForLoadState("networkidle");
  const row = page.locator('[data-testid="staff-row"]', { has: page.getByText(name, { exact: true }) });
  if ((await row.count()) === 0) {
    console.log(`${name}: not found (already deactivated?), skipping.`);
    continue;
  }
  await row.getByRole("button", { name: "Deactivate", exact: true }).click({ force: true });
  await page.waitForTimeout(400);
  await row.getByRole("button", { name: /^Confirm: remove/ }).click({ force: true });
  await page.waitForTimeout(1000);
  console.log(`${name}: deactivated.`);
}

await browser.close();
console.log("Done.");
