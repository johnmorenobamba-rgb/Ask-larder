// Drives the REAL NameplateCapture flow (upload -> vision OCR -> owner
// confirms/edits -> PATCH save) for all 5 Two Fires stations, via a real
// Playwright browser session logged in as the actual owner -- not a script
// writing rows directly to the DB. Two Fires is fictional with no physical
// equipment, so a synthetic-but-plausible nameplate photo (rendered by
// render-two-fires-nameplates.mjs) exercises the exact same real code path
// a genuine photo would.
//
// The Browser pane tool (used elsewhere in this session) can't drive file
// inputs -- browsers block programmatic .value assignment on
// input[type=file] for security, and a synthetic DataTransfer + dispatched
// 'change' event doesn't reliably reach React's handler without genuine
// OS-level file-selection emulation. Playwright's setInputFiles() does this
// correctly via CDP, which is why this needs a real Playwright script
// rather than the Browser pane's javascript_tool.
//
// Run with: npx tsx scripts/one-off/capture-two-fires-nameplates.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const STATIONS = [
  { name: "Bar", file: "nameplate-bar.png" },
  { name: "Cellar", file: "nameplate-cellar.png" },
  { name: "Fryer Station", file: "nameplate-fryer.png" },
  { name: "Pizza Station", file: "nameplate-pizza.png" },
  { name: "Wash-up", file: "nameplate-washup.png" },
];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("response", async (res) => {
  if (res.url().includes("/api/owner/") || res.url().includes("supabase.co/storage")) {
    const status = res.status();
    if (status >= 400) {
      console.log(`  [${status}] ${res.url()}`);
      try {
        console.log("    body:", (await res.text()).slice(0, 500));
      } catch {}
    }
  }
});
// SplashScreen.tsx's once-per-day cold-load splash covers everything on a
// fresh context (no localStorage) -- pre-seed it so it doesn't sit on top
// of the login form intercepting clicks.
await page.addInitScript(() => {
  window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
});

await page.goto(`${BASE}/two-fires/owner/login`);
await page.waitForLoadState("networkidle");
const emailInput = page.locator('input[type="email"], input[placeholder="Email"]').first();
const passwordInput = page.locator('input[type="password"], input[placeholder="Password"]').first();
await emailInput.fill("two-fires-owner@example.com");
await passwordInput.fill("TwoFiresOwner2026!");
console.log("email value:", await emailInput.inputValue());
console.log("password filled length:", (await passwordInput.inputValue()).length);
await page.getByRole("button", { name: "Log in" }).click({ force: true });
try {
  await page.waitForURL(/\/owner\/dashboard/, { timeout: 15000 });
} catch {
  console.log("Login didn't redirect. Current URL:", page.url());
  console.log("Page text:", (await page.locator("body").innerText()).slice(0, 500));
  await browser.close();
  process.exit(1);
}

await page.goto(`${BASE}/two-fires/owner/stations`);

for (const station of STATIONS) {
  console.log(`\n--- ${station.name} ---`);
  const card = page.locator("div", { has: page.getByText(station.name, { exact: true }) }).first();
  // Scope to this station's card by finding the "Photograph nameplate"
  // button nearest this station's name in DOM order -- the page has no
  // per-station container id, so this mirrors how a real user reads it
  // (find the name, act on the controls right below it).
  const heading = page.getByText(station.name, { exact: true });
  const container = heading.locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
  const fileInput = container.locator('input[type="file"]').nth(1); // 0 = station photo, 1 = nameplate
  await fileInput.setInputFiles(`C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\${station.file}`);

  // Wait for OCR to resolve and the confirm inputs to appear.
  try {
    await container.locator('input[placeholder="Manufacturer"]').waitFor({ timeout: 30000 });
  } catch (err) {
    console.log("  Timed out waiting for confirm fields. Container text:", await container.innerText());
    throw err;
  }
  const manufacturer = await container.locator('input[placeholder="Manufacturer"]').inputValue();
  const model = await container.locator('input[placeholder="Model"]').inputValue();
  const serial = await container.locator('input[placeholder="Serial number"]').inputValue();
  console.log(`  OCR suggested: ${manufacturer} / ${model} / ${serial}`);

  await container.getByRole("button", { name: "Confirm and save" }).click();
  await page.waitForTimeout(1500);
  console.log(`  Saved.`);
}

await browser.close();
console.log("\nAll 5 stations captured.");
