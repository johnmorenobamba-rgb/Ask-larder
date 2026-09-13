// Consolidated, single-session run: log in, drive the interview through to
// Workplace health & safety, upload the REAL external Safe Work Australia
// document, then continue through the topic's remaining questions in the
// SAME browser session (the document-covered state lives in client memory
// only -- a page reload loses it, confirmed empirically), inspecting each
// question to see whether the real document's content already answered it,
// and finally generate the module.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const VENUE_SLUG = "internal-qa-test";
const OWNER_EMAIL = "qa-test-internal@example.com";
const OWNER_PASSWORD = "QaTestInternal2026!";
const DOC_PATH = "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\safework-accommodation-risks.txt";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => {
  window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
});
page.on("response", async (res) => {
  if (res.url().includes("/api/") && res.status() >= 400) {
    console.log(`  [${res.status()}] ${res.url()}`);
    try { console.log("    body:", (await res.text()).slice(0, 400)); } catch {}
  }
});

await page.goto(`${BASE}/${VENUE_SLUG}/owner/login`);
await page.locator('input[type="email"], input[placeholder="Email"]').first().fill(OWNER_EMAIL);
await page.locator('input[type="password"], input[placeholder="Password"]').first().fill(OWNER_PASSWORD);
await page.getByRole("button", { name: "Log in" }).click({ force: true });
await page.waitForURL(/\/owner\/dashboard/, { timeout: 15000 });

await page.goto(`${BASE}/${VENUE_SLUG}/owner/onboarding/content-intake`, { timeout: 60000 });
await page.waitForTimeout(1500);

// Already-answered topics (from the earlier run) are skipped automatically
// by SopInterview's own resume logic -- confirm we land straight on
// Workplace health & safety's upload-choice screen.
let bodyText = await page.locator("main").innerText();
console.log("Landed on:", bodyText.match(/([A-Z][A-Z &]+)\s*\n?\s*·? ?STEP \d+ OF \d+/)?.[0] ?? bodyText.slice(0, 200));

await page.getByRole("button", { name: "Yes, I have something", exact: true }).click({ force: true });
await page.waitForTimeout(500);
await page.locator('input[type="file"]').first().setInputFiles(DOC_PATH);
console.log("Uploaded document, waiting for analysis...");
await page.waitForTimeout(18000);

bodyText = await page.locator("main").innerText();
console.log("\n--- After upload ---\n", bodyText.slice(0, 800));

// Now step through this topic's questions, logging whether each arrives
// pre-filled from the document (real signal of what analyze-document
// actually extracted) vs blank (genuinely not covered by the source text).
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(500);
  bodyText = await page.locator("main").innerText();

  if (bodyText.includes("Ready to generate")) {
    console.log("\nAll questions for this topic done. Generating module...");
    await page.getByRole("button", { name: "Generate this module", exact: true }).click({ force: true });
    await page.waitForTimeout(8000);
    const notNow = page.getByRole("button", { name: "Not now", exact: true });
    if (await notNow.isVisible().catch(() => false)) await notNow.click({ force: true });
    break;
  }

  const textarea = page.locator("textarea").first();
  if (!(await textarea.isVisible().catch(() => false))) {
    console.log("No textarea and not at generate step. Snippet:", bodyText.slice(0, 400));
    break;
  }
  const existingValue = await textarea.inputValue();
  const questionLine = bodyText.split("\n").find((l) => l.length > 15 && l.includes("?")) ?? "(question not found)";
  console.log(`\nQ: ${questionLine}`);
  console.log(`   Pre-filled from document: ${existingValue ? `YES -> "${existingValue.slice(0, 150)}"` : "NO (blank)"}`);

  if (!existingValue) {
    await textarea.fill("Staff should follow the guidance already on file for this and escalate anything unclear to the shift supervisor.");
  }
  await page.getByRole("button", { name: "Next", exact: true }).click({ force: true });
}

await browser.close();
console.log("\nDone.");
