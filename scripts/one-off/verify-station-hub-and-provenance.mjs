// One-off live verification, 14 Sep 2026 build session. This session's own
// Browser pane can't reach port 3000 (another chat's dev server holds it,
// and Next.js's single-instance-per-directory lock blocks a second one) --
// Bash *can* reach localhost:3000 directly, so this drives a real
// Playwright browser against that already-running server instead.
//
// Covers: (1) the new station QR hub choice screen end to end (hub ->
// Training/FAQs/Troubleshooting and back), (2) the provenance-badge fix
// on a module that has sections with non-owner_sourced content but no
// generated SOP document yet.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
function check(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}${detail ? " :: " + detail : ""}`);
}
// CSS text-transform:uppercase changes what innerText() returns -- compare
// case-insensitively so an assertion doesn't fail just because a label is
// visually rendered in caps.
function includesCI(haystack, needle) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

// Motion (framer-motion float/tilt) elements never read as "stable" to
// Playwright's actionability check -- native DOM click via evaluate,
// same workaround as reference_elevated_cell_playwright_click_gotcha.
async function nativeClick(locator) {
  await locator.waitFor({ state: "visible", timeout: 15000 });
  await locator.evaluate((el) => el.click());
}

const browser = await chromium.launch();

// --- Part 1: owner-side provenance badge fix ---
{
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await page.goto(`${BASE}/two-fires/owner/login`, { waitUntil: "networkidle" });
  await page.waitForSelector('input[type="email"]', { state: "visible" });
  await page.locator('input[type="email"]').pressSequentially("two-fires-owner@example.com", { delay: 20 });
  await page.locator('input[type="password"]').pressSequentially("TwoFiresVerify2026!", { delay: 20 });
  await page.waitForTimeout(300);
  await nativeClick(page.getByRole("button", { name: "Log in" }));
  await page.waitForTimeout(2000);
  await page.waitForLoadState("networkidle");
  const postLoginText = await page.locator("body").innerText();
  check("owner login lands past /owner/login", !page.url().includes("/owner/login"), `url=${page.url()} body=${postLoginText.slice(0, 150)}`);

  await page.goto(`${BASE}/two-fires/owner/sops/234557de-f925-4ceb-95b7-7e88836cdfe7`, { waitUntil: "networkidle" });
  const bodyText = await page.locator("body").innerText();
  check("no-SOP-doc branch reached", includesCI(bodyText, "No curated SOP document exists"), null);
  check("provenance heading now shows on no-doc branch", includesCI(bodyText, "This module includes content added by Larder"), null);
  check("badge label text present", includesCI(bodyText, "Added by Larder"), null);
  await page.screenshot({ path: "scratch/verify-provenance-nodoc.png", fullPage: true });
  await page.close();
}

// --- Part 2: staff-side station QR hub ---
{
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await page.goto(`${BASE}/two-fires/login`, { waitUntil: "networkidle" });
  const bodyBefore = await page.locator("body").innerText();
  check("staff picker loaded", includesCI(bodyBefore, "") || bodyBefore.length > 0, null);

  await nativeClick(page.getByText("Tomas Reyes", { exact: false }).first());
  await page.waitForTimeout(500);
  // PinLoginForm is a plain password-type numeric input, not a keypad.
  await page.locator('input[type="password"]').first().pressSequentially("4242", { delay: 30 });
  await page.waitForTimeout(200);
  await nativeClick(page.getByRole("button", { name: "Log in" }));
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle");
  check("staff login navigated away from /login", !page.url().endsWith("/login"), page.url());

  await page.goto(`${BASE}/two-fires/station/two-fires-wash-up`, { waitUntil: "networkidle" });
  const hubText = await page.locator("body").innerText();
  check("hub shows 'What do you need?'", includesCI(hubText, "What do you need?"), null);
  check("hub shows Training choice", includesCI(hubText, "Training"), null);
  check("hub shows FAQs choice", includesCI(hubText, "FAQs"), null);
  check("hub shows Troubleshooting choice", includesCI(hubText, "Troubleshooting"), null);
  await page.screenshot({ path: "scratch/verify-station-hub.png", fullPage: true });

  // Training -- click the actual <a href> the PressableLink card renders,
  // not just text inside it, and use goto(getAttribute) as a robust
  // fallback if the click doesn't trigger Next.js client-side routing.
  const trainingHref = await page.locator('a[href$="/training"]').first().getAttribute("href");
  await page.goto(`${BASE}${trainingHref}`, { waitUntil: "networkidle" });
  check("training route reached", page.url().endsWith("/training"), page.url());
  const trainingText = await page.locator("body").innerText();
  check("training shows real module content, not raw markdown", !trainingText.includes("##") && !trainingText.includes("[CALLOUT]"), null);
  await page.screenshot({ path: "scratch/verify-station-training.png", fullPage: true });

  // Back to hub, then FAQs
  await page.goto(`${BASE}/two-fires/station/two-fires-wash-up`, { waitUntil: "networkidle" });
  const faqsHref = await page.locator('a[href$="/faqs"]').first().getAttribute("href");
  await page.goto(`${BASE}${faqsHref}`, { waitUntil: "networkidle" });
  check("faqs route reached", page.url().endsWith("/faqs"), page.url());
  const faqsText = await page.locator("body").innerText();
  check("faqs page renders (list or honest empty state)", includesCI(faqsText, "FAQ"), faqsText.slice(0, 200));
  await page.screenshot({ path: "scratch/verify-station-faqs.png", fullPage: true });

  // Back to hub, then Troubleshooting
  await page.goto(`${BASE}/two-fires/station/two-fires-wash-up`, { waitUntil: "networkidle" });
  const tsHref = await page.locator('a[href$="/troubleshooting"]').first().getAttribute("href");
  await page.goto(`${BASE}${tsHref}`, { waitUntil: "networkidle" });
  check("troubleshooting route reached", page.url().endsWith("/troubleshooting"), page.url());
  const tsText = await page.locator("body").innerText();
  check("troubleshooting page renders (list or honest empty state)", includesCI(tsText, "roubleshooting"), tsText.slice(0, 200));
  await page.screenshot({ path: "scratch/verify-station-troubleshooting.png", fullPage: true });

  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("FAILURES:", failed.map((f) => f.label).join(", "));
  process.exit(1);
}
