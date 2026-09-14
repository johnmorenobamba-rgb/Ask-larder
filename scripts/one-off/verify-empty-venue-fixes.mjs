// Live verification for item 9 (14 Sep build session): the empty-venue
// first-run experience fixes, against the genuinely empty test venue
// created earlier this session (the-public-bar-audit).
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
function check(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}${detail ? " :: " + detail : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });

await page.goto(`${BASE}/the-public-bar-audit/owner/login`, { waitUntil: "networkidle" });
await page.locator('input[type="email"]').pressSequentially("public-bar-audit-owner@example.com", { delay: 15 });
await page.locator('input[type="password"]').pressSequentially("FreshOwnerAudit2026!", { delay: 15 });
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Log in" }).evaluate((el) => el.click());
await page.waitForFunction(() => !window.location.pathname.endsWith("/login"), null, { timeout: 15000 }).catch(() => null);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(500);

await page.goto(`${BASE}/the-public-bar-audit/owner/dashboard`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const dashText = await page.locator("body").innerText();
console.log("DASHBOARD:\n" + dashText.slice(0, 400));
check("dashboard no longer says 'Nothing needs attention'", !dashText.includes("Nothing needs attention"), null);
check("dashboard shows honest 'Nothing set up yet'", dashText.includes("Nothing set up yet"), null);
await page.screenshot({ path: "scratch/verify-empty-dashboard-fixed.png", fullPage: true });

await page.goto(`${BASE}/the-public-bar-audit/owner/staff`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
const staffText = await page.locator("body").innerText();
check("staff page nudges toward building a module first", staffText.includes("nothing for them to complete yet"), null);
await page.screenshot({ path: "scratch/verify-empty-staff-fixed.png", fullPage: true });

await page.goto(`${BASE}/the-public-bar-audit/owner/dashboard`, { waitUntil: "networkidle" });
const bodyForStations = await page.locator("body").innerText();
check("no 'Your owner can add them' text visible to the owner", !bodyForStations.includes("Your owner can add"), null);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("FAILURES:", failed.map((f) => f.label).join(", "));
  process.exit(1);
}
