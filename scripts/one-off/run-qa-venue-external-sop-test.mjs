// Continuation of create-qa-venue-and-test-external-sop.mjs: drives the
// interview generically through whatever topics come before "Workplace
// health & safety" (minimal-but-real answers), then for that topic
// specifically, chooses "Yes, I have something" and uploads the REAL
// external document fetched live from Safe Work Australia
// (safework-accommodation-risks.txt) -- genuinely unseen, real-world input,
// not seeded/fabricated content -- to see how the document-analysis step
// (parse-sop + sop-intake/analyze-document) performs against it.
//
// Run with: npx tsx scripts/one-off/run-qa-venue-external-sop-test.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const VENUE_SLUG = "internal-qa-test";
const OWNER_EMAIL = "qa-test-internal@example.com";
const OWNER_PASSWORD = "QaTestInternal2026!";
const TARGET_TOPIC_HEADING = "WORKPLACE HEALTH & SAFETY";
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

await page.goto(`${BASE}/${VENUE_SLUG}/owner/onboarding/content-intake`, { timeout: 120000 });
await page.waitForTimeout(1000);

const GENERIC_ANSWERS = {
  trigger_and_scope: "This applies during normal operating hours whenever this task comes up. It doesn't cover unrelated back-office admin.",
  who_performs_it: "Any rostered staff member trained for this task.",
  materials: "Nothing beyond standard kit already on site.",
  procedure: "Follow the standard steps for this task in order, checking as you go.",
  safety_critical: "Yes, getting this wrong could cause a real injury or incident, so it's treated seriously.",
  definition_of_done: "The task is visibly complete and nothing is left in an unsafe state.",
  escalation_contact: "The shift supervisor on duty.",
  behavioral_read: "Staff noticed something was off compared to the normal routine and flagged it before it became a problem.",
  safety_honesty_check: "There is a real, honest risk here that staff are trained to disclose plainly rather than downplay.",
  troubleshoot_then_escalate: "Check the obvious first cause. If that doesn't resolve it, call the venue's maintenance contact.",
  access_control: "Only the duty manager is authorised, and staff call the duty manager if access is needed outside that.",
};

let guard = 0;
while (guard++ < 200) {
  await page.waitForTimeout(600);
  const bodyText = await page.locator("main, body").first().innerText();

  if (bodyText.includes(TARGET_TOPIC_HEADING) && bodyText.includes("Do you already have something written")) {
    console.log("\nReached target topic:", TARGET_TOPIC_HEADING);
    break;
  }

  const yesBtn = page.getByRole("button", { name: "Yes, I have something", exact: true });
  const noBtn = page.getByRole("button", { name: "No, start from scratch", exact: true });
  if (await noBtn.isVisible().catch(() => false)) {
    await noBtn.click({ force: true });
    continue;
  }

  const genBtn = page.getByRole("button", { name: "Generate this module", exact: true });
  if (await genBtn.isVisible().catch(() => false)) {
    await genBtn.click({ force: true });
    await page.waitForTimeout(4000);
    const notNowBtn = page.getByRole("button", { name: "Not now", exact: true });
    if (await notNowBtn.isVisible().catch(() => false)) await notNowBtn.click({ force: true });
    continue;
  }

  const textarea = page.locator("textarea").first();
  if (await textarea.isVisible().catch(() => false)) {
    const heading = await page.locator("h1,h2,p.font-mono, p").allInnerTexts();
    const promptText = (await page.locator("h2, .font-display, p").allInnerTexts()).join(" | ");
    let answer = "Standard practice applies here, nothing unusual for this venue.";
    for (const [key, val] of Object.entries(GENERIC_ANSWERS)) {
      // crude heuristic match isn't reliable across question wording, so just
      // rotate through generic-but-real answers keyed by common phrases
    }
    if (promptText.includes("does this actually come up")) answer = GENERIC_ANSWERS.trigger_and_scope;
    else if (promptText.includes("actually allowed to do this")) answer = GENERIC_ANSWERS.who_performs_it;
    else if (promptText.includes("physically need on hand")) answer = GENERIC_ANSWERS.materials;
    else if (promptText.includes("Walk me through it")) answer = GENERIC_ANSWERS.procedure;
    else if (promptText.includes("actually hurt")) answer = GENERIC_ANSWERS.safety_critical;
    else if (promptText.includes("actually finished")) answer = GENERIC_ANSWERS.definition_of_done;
    else if (promptText.includes("actually go to")) answer = GENERIC_ANSWERS.escalation_contact;
    else if (promptText.includes("last time this actually happened")) answer = GENERIC_ANSWERS.behavioral_read;
    else if (promptText.includes("discloses a real health")) answer = GENERIC_ANSWERS.safety_honesty_check;
    else if (promptText.includes("first thing to actually try")) answer = GENERIC_ANSWERS.troubleshoot_then_escalate;
    else if (promptText.includes("actually authorized to access")) answer = GENERIC_ANSWERS.access_control;

    await textarea.fill(answer);
    const nextBtn = page.getByRole("button", { name: "Next", exact: true });
    await nextBtn.click({ force: true });
    continue;
  }

  console.log("No recognized step state. Current text snippet:", bodyText.slice(0, 300));
  break;
}

console.log("\n=== Uploading real external document for Workplace health & safety ===");
await page.getByRole("button", { name: "Yes, I have something", exact: true }).click({ force: true });
await page.waitForTimeout(500);
await page.locator('input[type="file"]').first().setInputFiles(DOC_PATH);

// The analyze-document call can take a while (real Claude call reading the
// whole document against 7-8 questions).
await page.waitForTimeout(15000);
const afterUploadText = await page.locator("main, body").first().innerText();
console.log(afterUploadText.slice(0, 3000));

await browser.close();
