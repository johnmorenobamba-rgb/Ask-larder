// Drives the REAL NameplateCapture flow (upload -> vision OCR -> owner
// confirms/edits -> PATCH save) for all 4 Coachman's Arms stations, via a
// real Playwright browser session logged in as the actual owner. Mirrors
// capture-two-fires-nameplates.mjs exactly -- see that file's comment for
// why this needs real Playwright (setInputFiles via CDP) rather than the
// Browser pane tool, which can't drive file inputs.
//
// Run with: npx tsx scripts/one-off/capture-coachmans-arms-nameplates.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const SCRATCH = "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\edf5d661-5616-41dc-a854-00bad3fc38f5\\scratchpad";
const STATIONS = [
  { name: "Bistro", file: "bistro.png" },
  { name: "Cellar", file: "cellar.png" },
  { name: "Kitchen", file: "kitchen.png" },
  { name: "Public Bar", file: "public-bar.png" },
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
await page.addInitScript(() => {
  window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
});

await page.goto(`${BASE}/coachmans-arms-wizard/owner/login`);
await page.waitForLoadState("networkidle");
const emailInput = page.locator('input[type="email"], input[placeholder="Email"]').first();
const passwordInput = page.locator('input[type="password"], input[placeholder="Password"]').first();
await emailInput.fill("john.moreno.bamba+coachmans-arms-wizard@gmail.com");
await passwordInput.fill("RealOwnerAudit2026!");
await page.getByRole("button", { name: "Log in" }).click({ force: true });
try {
  await page.waitForURL(/\/owner\/dashboard/, { timeout: 15000 });
} catch {
  console.log("Login didn't redirect. Current URL:", page.url());
  console.log("Page text:", (await page.locator("body").innerText()).slice(0, 500));
  await browser.close();
  process.exit(1);
}

await page.goto(`${BASE}/coachmans-arms-wizard/owner/stations`);

for (const station of STATIONS) {
  console.log(`\n--- ${station.name} ---`);
  const heading = page.getByText(station.name, { exact: true });
  const container = heading.locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");
  const fileInput = container.locator('input[type="file"]').nth(1); // 0 = station photo, 1 = nameplate
  await fileInput.setInputFiles(`${SCRATCH}\\nameplate-${station.file}`);

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
console.log("\nAll 4 stations captured.");
