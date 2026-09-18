// Approves the 20 FAQs + 20 troubleshooting entries the real
// equipment-content pipeline generated for Coachman's Arms (18 Sep 2026),
// via a real Playwright session logged in as the actual owner clicking the
// real "Approve" button on each station's content page -- the same
// provenance-aware approval UI a real owner would use, not a direct status
// flip in the database.
//
// Run with: npx tsx scripts/one-off/approve-coachmans-arms-equipment-content.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const STATION_IDS = [
  "85fcf61e-40d2-4cbd-95b3-b14714298f97", // Bistro
  "a741ea34-6726-4c9e-b3db-1994ef3cb6e2", // Cellar
  "17e7b2d7-b2fe-4105-a9e6-d760dad03b52", // Kitchen
  "6f953d0f-7ae5-48c8-93c4-b1157ffeeae8", // Public Bar
];

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

let totalApproved = 0;
for (const stationId of STATION_IDS) {
  await page.goto(`${BASE}/coachmans-arms-wizard/owner/stations/${stationId}/content`);
  await page.waitForLoadState("networkidle");
  const title = await page.locator("h1").innerText();
  console.log(`\n--- ${title} ---`);

  let approvedHere = 0;
  // Click the first "Approve" button repeatedly (each click flips that
  // row to "Approved" and removes the button), until none remain.
  while (true) {
    const approveButton = page.getByRole("button", { name: "Approve", exact: true }).first();
    const count = await approveButton.count();
    if (count === 0) break;
    await approveButton.click();
    await page.waitForTimeout(600);
    approvedHere++;
    totalApproved++;
  }
  console.log(`  Approved ${approvedHere} items.`);
}

console.log(`\nTotal approved: ${totalApproved}.`);
await browser.close();
