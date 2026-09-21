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
await page.getByText("Rob Doyle", { exact: true }).click();
await page.locator('input[type="password"][inputmode="numeric"]').first().fill("5940");
await page.getByRole("button", { name: "Log in" }).click({ force: true });
await page.waitForTimeout(1000);
const setPinHeading = page.getByText("Set your PIN");
if (await setPinHeading.count()) {
  console.log("Needs PIN setup");
  const pinInputs = page.locator('input[type="password"][inputmode="numeric"]');
  await pinInputs.nth(0).fill("5940");
  await pinInputs.nth(1).fill("5940");
  await page.getByRole("button", { name: "Set PIN and log in" }).click({ force: true });
}
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
console.log("URL after login:", page.url());
console.log("Body text:", (await page.locator("body").innerText()).slice(0, 800));
await page.screenshot({ path: "scratch/diag-rob-doyle.png", fullPage: true });

await browser.close();
