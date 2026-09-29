import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const SLUG = "coachmans-arms-wizard";
const OUT = "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
});

await page.goto(`${BASE}/${SLUG}/login`);
await page.waitForLoadState("networkidle");
await page.getByText("Josh Whelan", { exact: true }).click({ force: true });
await page.locator('input[type="password"]').fill("1234");
await page.getByRole("button", { name: "Log in" }).click({ force: true });
await page.waitForTimeout(1200);

await page.goto(`${BASE}/${SLUG}/station/cellar`);
await page.waitForLoadState("networkidle");
await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
await page.waitForTimeout(500);
await page.locator("main").screenshot({ path: `${OUT}\\station-hub.png` });
console.log("station hub captured");

await browser.close();
