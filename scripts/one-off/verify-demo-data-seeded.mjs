// Live verification for item 7 (14 Sep build session): coachmans-arms-
// wizard's compliance-tracking screens should no longer look sparse after
// seeding sample certificates and completion records.
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

await page.goto(`${BASE}/coachmans-arms-wizard/owner/dashboard`, { waitUntil: "networkidle" });
await page.screenshot({ path: "scratch/verify-demo-dashboard.png", fullPage: true });

await page.goto(`${BASE}/coachmans-arms-wizard/owner/certs`, { waitUntil: "networkidle" });
await page.screenshot({ path: "scratch/verify-demo-certs.png", fullPage: true });

await page.goto(`${BASE}/coachmans-arms-wizard/owner/completions`, { waitUntil: "networkidle" });
await page.screenshot({ path: "scratch/verify-demo-completions.png", fullPage: true });

await browser.close();
console.log("Screenshots saved: verify-demo-dashboard.png, verify-demo-certs.png, verify-demo-completions.png");
