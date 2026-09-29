// One-off capture script for the print leave-behind brochure. Drives the
// real coachmans-arms-wizard demo venue via a real Playwright session (not
// mockups) to grab high-DPI screenshots: owner dashboard, owner certs
// (WWCC hard-expiry vs refresher-recommended), Ask Larder in-scope answer,
// Ask Larder fallback-rule answer, and a live module completion + Stamp.
//
// Run with: npx tsx capture-brochure-screenshots.mjs   (from this dir, with
// Node 24 on PATH -- see project memory re: nvm4w PATH workaround)
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const SLUG = "coachmans-arms-wizard";
const OUT = "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots";
fs.mkdirSync(OUT, { recursive: true });

function seedSplash(page) {
  return page.addInitScript(() => {
    window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
  });
}

// Hides Next.js's dev-mode floating indicator badge (bottom-left "N")
// so it never bleeds into a print screenshot.
function hideDevIndicator(page) {
  return page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
}

async function main() {
  const browser = await chromium.launch();

  // ---------- Owner screens (desktop viewport) ----------
  const ownerCtx = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
  const owner = await ownerCtx.newPage();
  await seedSplash(owner);

  await owner.goto(`${BASE}/${SLUG}/owner/login`);
  await owner.waitForLoadState("networkidle");
  await owner.locator('input[type="email"]').fill("john.moreno.bamba+coachmans-arms-wizard@gmail.com");
  await owner.locator('input[type="password"]').fill("RealOwnerAudit2026!");
  await owner.getByRole("button", { name: "Log in" }).click({ force: true });
  await owner.waitForURL(/\/owner\/dashboard/, { timeout: 15000 });
  await owner.waitForTimeout(800);
  await hideDevIndicator(owner);
  console.log("Owner dashboard loaded.");
  await owner.screenshot({ path: path.join(OUT, "owner-dashboard-full.png"), fullPage: true });
  // Tight crop of just the dashboard cards (the main content wrapper).
  const dashMain = owner.locator("main");
  await dashMain.screenshot({ path: path.join(OUT, "owner-dashboard.png") });

  await owner.goto(`${BASE}/${SLUG}/owner/certs`);
  await owner.waitForLoadState("networkidle");
  await owner.waitForTimeout(500);
  await hideDevIndicator(owner);
  console.log("Owner certs loaded.");
  await owner.screenshot({ path: path.join(OUT, "owner-certs-full.png"), fullPage: true });
  await owner.locator("main").screenshot({ path: path.join(OUT, "owner-certs.png") });

  await ownerCtx.close();

  // ---------- Staff screens (tablet viewport -- this is the iPad product) ----------
  const staffCtx = await browser.newContext({ viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2 });
  const staff = await staffCtx.newPage();
  await seedSplash(staff);

  await staff.goto(`${BASE}/${SLUG}/login`);
  await staff.waitForLoadState("networkidle");
  await staff.getByText("Josh Whelan", { exact: true }).click({ force: true });
  await staff.locator('input[type="password"]').fill("1234");
  await staff.getByRole("button", { name: "Log in" }).click({ force: true });
  await staff.waitForTimeout(1200);

  // Might land on welcome/roles if intro flags reset; otherwise goes straight
  // to home. Force straight to /home either way -- Josh already has a role
  // and has completed onboarding in every respect except the one module
  // we deliberately reset below.
  await staff.goto(`${BASE}/${SLUG}/home`);
  await staff.waitForLoadState("networkidle");
  await staff.waitForTimeout(500);
  await hideDevIndicator(staff);
  console.log("Staff home loaded.");

  // Open Ask Larder.
  await staff.getByText("Ask something.", { exact: true }).click({ force: true });
  await staff.waitForTimeout(400);
  let qBox = staff.locator('input[placeholder="Type your question"]');
  await qBox.fill("What do I do if a customer seems intoxicated?");
  await staff.getByRole("button", { name: "Ask", exact: true }).click({ force: true });
  await staff.waitForSelector("text=Ask another question", { timeout: 20000 });
  await staff.waitForTimeout(400);
  console.log("Ask Larder in-scope answer received.");
  const chatPanel = staff.getByRole("heading", { name: "Ask Larder" }).locator("xpath=ancestor::div[contains(@class,'fixed')][1]");
  await chatPanel.screenshot({ path: path.join(OUT, "ask-larder-in-scope.png") }).catch(async () => {
    console.log("  fallback: full page screenshot for in-scope");
    await staff.screenshot({ path: path.join(OUT, "ask-larder-in-scope.png") });
  });

  await staff.getByRole("button", { name: "Ask another question" }).click({ force: true });
  await staff.waitForTimeout(300);
  qBox = staff.locator('input[placeholder="Type your question"]');
  await qBox.fill("What's the code for the alarm?");
  await staff.getByRole("button", { name: "Ask", exact: true }).click({ force: true });
  await staff.waitForSelector("text=Ask another question", { timeout: 20000 });
  await staff.waitForTimeout(400);
  console.log("Ask Larder fallback answer received.");
  await chatPanel.screenshot({ path: path.join(OUT, "ask-larder-fallback.png") }).catch(async () => {
    console.log("  fallback: full page screenshot for fallback");
    await staff.screenshot({ path: path.join(OUT, "ask-larder-fallback.png") });
  });

  // ---------- Live module walkthrough: RSA and responsible service ----------
  // Deliberately reset for Josh Whelan before this script runs (see session
  // notes) so this is a genuine first-time completion, not a replay.
  const RSA_MODULE_ID = "53644b3f-4ed2-4dc3-a585-4ce968a3c03e";
  await staff.goto(`${BASE}/${SLUG}/modules/${RSA_MODULE_ID}`);
  await staff.waitForLoadState("networkidle");
  await hideDevIndicator(staff);

  const ANSWER_MAP = [
    { match: "Who checks your RSA certificate", answer: "Steph" },
    { match: "Which of these is a sign of intoxication", answer: "Slurred or rambling speech" },
    { match: "If you're unsure how to handle a difficult refusal", answer: "Ask whoever is most senior on the floor" },
    { match: "Where is the duress alarm", answer: "Under the main till" },
    { match: "If a situation on the floor becomes physical", answer: "Call 000 straight away" },
  ];

  for (let i = 0; i < 40; i++) {
    await staff.waitForTimeout(350);
    const bodyText = await staff.locator("main").innerText().catch(() => "");
    if (/completed$/im.test(bodyText) || /APPROVED/.test(bodyText)) {
      console.log("Module completion screen reached.");
      break;
    }
    const question = ANSWER_MAP.find((q) => bodyText.includes(q.match));
    if (question) {
      const optBtn = staff.locator("button", { hasText: question.answer }).first();
      await optBtn.click({ force: true });
      await staff.waitForTimeout(250);
    }
    const continueBtn = staff.getByRole("button", { name: "Continue", exact: true });
    if (await continueBtn.count()) {
      await continueBtn.click({ force: true });
    }
  }
  await staff.waitForTimeout(600);
  console.log("Capturing completion + Stamp screen.");
  await staff.screenshot({ path: path.join(OUT, "module-completion-stamp-full.png") });
  await staff.locator("main").screenshot({ path: path.join(OUT, "module-completion-stamp.png") });

  await staffCtx.close();
  await browser.close();
  console.log("\nAll screenshots saved to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
