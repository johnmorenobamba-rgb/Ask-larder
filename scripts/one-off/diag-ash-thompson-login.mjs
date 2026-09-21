import { chromium } from "playwright";
const BASE = "https://asklarder.com.au";
const VENUE_SLUG = "coachmans-arms-wizard";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => {
  window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
});

await page.goto(`${BASE}/${VENUE_SLUG}/login`);
await page.waitForLoadState("networkidle");
await page.getByText("Ash Thompson", { exact: true }).click();
await page.locator('input[type="password"][inputmode="numeric"]').first().fill("5940");
await page.getByRole("button", { name: "Log in" }).click({ force: true });
await Promise.race([
  page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15000 }).catch(() => {}),
  page.getByText("Set your PIN").waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
]);
if (await page.getByText("Set your PIN").count()) {
  console.log("needs pin setup");
  const pinInputs = page.locator('input[type="password"][inputmode="numeric"]');
  await pinInputs.nth(0).fill("5940");
  await pinInputs.nth(1).fill("5940");
  await page.getByRole("button", { name: "Set PIN and log in" }).click({ force: true });
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15000 });
}
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
console.log("URL after login:", page.url());

const askBtn = page.getByRole("button", { name: "Ask Larder" });
console.log("Ask Larder button count:", await askBtn.count());
await askBtn.click({ force: true });
await page.waitForTimeout(1000);
console.log("URL after click:", page.url());
console.log("Body text after click:", (await page.locator("body").innerText()).slice(0, 600));
await page.screenshot({ path: "scratch/diag-ash-thompson.png", fullPage: true });

await browser.close();
