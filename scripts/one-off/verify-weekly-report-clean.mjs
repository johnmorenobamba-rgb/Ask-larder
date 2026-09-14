// Live verification for item 4 (14 Sep build session): coachmans-arms-
// wizard's Weekly Report should no longer show the leftover fixture rows
// ("test question", "test after deactivation", "completely different
// unique question ..."), while genuine content (float, safe/alarm
// refusals, safety escalations) stays.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });

await page.goto(`${BASE}/coachmans-arms-wizard/owner/login`, { waitUntil: "networkidle" });
await page.locator('input[type="email"]').pressSequentially("john.moreno.bamba+coachmans-arms-wizard@gmail.com", { delay: 15 });
await page.locator('input[type="password"]').pressSequentially("RealOwnerAudit2026!", { delay: 15 });
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Log in" }).evaluate((el) => el.click());
await page.waitForTimeout(2000);

await page.goto(`${BASE}/coachmans-arms-wizard/owner/weekly-report`, { waitUntil: "networkidle" });
const bodyText = await page.locator("body").innerText();
await page.screenshot({ path: "scratch/verify-weekly-report-clean.png", fullPage: true });

const stillHasFixtures = /test question|test after deactivation|completely different unique/i.test(bodyText);
console.log(stillHasFixtures ? "FAIL - fixture text still present" : "PASS - fixture text gone");
console.log("body contains 'float':", bodyText.toLowerCase().includes("float"));
console.log("body contains 'alarm':", bodyText.toLowerCase().includes("alarm"));

await browser.close();
process.exit(stillHasFixtures ? 1 : 0);
