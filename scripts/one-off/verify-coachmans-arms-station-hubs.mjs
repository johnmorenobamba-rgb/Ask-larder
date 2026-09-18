// Live verification (item 7 of the 19 Sep real-content-intake task): views
// the actual staff-facing station QR hub for all 4 Coachman's Arms
// stations, as a real staff session, not just a DB query. Since the owner
// account has no staff_role_id (redirects to role selection, a side effect
// worth avoiding on the real owner account) and no other Coachman's Arms
// staff member's PIN is known to this session, this creates one disposable
// test staff member via the real "Invite staff" flow, has them set their
// own PIN through the real first-login UI (never a credential written by
// this script -- typed into the real form, submitted through the real
// set-own-pin route, same as any real new hire), views every station hub,
// then deactivates the test account through the real owner UI afterward.
//
// Run with: npx tsx scripts/one-off/verify-coachmans-arms-station-hubs.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OWNER_EMAIL = "john.moreno.bamba+coachmans-arms-wizard@gmail.com";
const OWNER_PASSWORD = "RealOwnerAudit2026!";
const TEST_STAFF_NAME = "QR Hub Verification Test 3";
// Phone, not email -- the invite route only sends a real notification
// email (via Resend) when an email is provided; phone-only skips that
// send entirely, right for a disposable verification account.
const TEST_STAFF_PHONE = "0400000002";
const TEST_PIN = "8417";
const STATIONS = ["bistro", "cellar", "kitchen", "public-bar"];

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

console.log("=== Inviting disposable test staff member ===");
await ownerLogin();
await page.goto(`${BASE}/coachmans-arms-wizard/owner/staff`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Invite staff" }).click();
await page.locator('input[placeholder="Name"]').fill(TEST_STAFF_NAME);
await page.locator('input[placeholder="Phone"]').fill(TEST_STAFF_PHONE);
await page.getByRole("button", { name: "Add staff member" }).click({ force: true });
await page.waitForTimeout(1500);
console.log("Invited. Signing out of owner session.");
await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));

console.log("\n=== Setting PIN and logging in as the test staff member ===");
await page.goto(`${BASE}/coachmans-arms-wizard/login`);
await page.waitForLoadState("networkidle");
await page.getByText(TEST_STAFF_NAME, { exact: true }).click();
await page.locator('input[type="password"][inputmode="numeric"]').first().fill(TEST_PIN);
await page.getByRole("button", { name: "Log in" }).click({ force: true });
await page.waitForTimeout(800);
// Expect the "Set your PIN" screen (428 -> needsPinSetup) since this is a brand new account.
const setPinHeading = page.getByText("Set your PIN");
if (await setPinHeading.count()) {
  const pinInputs = page.locator('input[type="password"][inputmode="numeric"]');
  await pinInputs.nth(0).fill(TEST_PIN);
  await pinInputs.nth(1).fill(TEST_PIN);
  await page.getByRole("button", { name: "Set PIN and log in" }).click({ force: true });
}
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1000);
console.log("Current URL after PIN setup:", page.url());

// A brand new staff member has no role yet -- go straight to the role
// picker (works by direct navigation, doesn't require going through
// /welcome first) and select one so requireStationContext's own
// "no role -> /roles" redirect doesn't intercept every station visit below.
console.log("Selecting a role (Floor Staff) for the test account...");
await page.goto(`${BASE}/coachmans-arms-wizard/roles`);
await page.waitForLoadState("networkidle");
const floorStaff = page.getByText("Floor Staff", { exact: true }).first();
await floorStaff.click({ force: true });
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1000);
console.log("URL after role select:", page.url());

console.log("\n=== Viewing each station QR hub as this real staff session ===");
for (const slug of STATIONS) {
  console.log(`\n--- /${slug} ---`);
  await page.goto(`${BASE}/coachmans-arms-wizard/station/${slug}`);
  await page.waitForLoadState("networkidle");
  console.log("hub:", (await page.locator("body").innerText()).slice(0, 300).replace(/\n+/g, " | "));

  await page.goto(`${BASE}/coachmans-arms-wizard/station/${slug}/faqs`);
  await page.waitForLoadState("networkidle");
  console.log("faqs:", (await page.locator("main").innerText()).slice(0, 500).replace(/\n+/g, " | "));

  await page.goto(`${BASE}/coachmans-arms-wizard/station/${slug}/troubleshooting`);
  await page.waitForLoadState("networkidle");
  console.log("troubleshooting:", (await page.locator("main").innerText()).slice(0, 500).replace(/\n+/g, " | "));
}

console.log("\n=== Cleaning up: signing out and deactivating the test staff member ===");
await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));
await ownerLogin();
await page.goto(`${BASE}/coachmans-arms-wizard/owner/staff`);
await page.waitForLoadState("networkidle");
const row = page.locator('[data-testid="staff-row"]', { has: page.getByText(TEST_STAFF_NAME, { exact: true }) });
await row.getByRole("button", { name: "Deactivate" }).click({ force: true });
await page.waitForTimeout(1000);
console.log("Deactivated test staff member.");

await browser.close();
console.log("\nDone.");
