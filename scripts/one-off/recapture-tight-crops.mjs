// Re-captures just the two Ask Larder chat cards and the module-completion
// Stamp, tightly cropped to their actual card elements (not the fixed-
// position full-screen overlay ancestor, which was pulling in acres of dead
// parchment space when used in the brochure layout).
import { chromium } from "playwright";
import path from "node:path";

const BASE = "http://localhost:3000";
const SLUG = "coachmans-arms-wizard";
const OUT = "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots";

function seedSplash(page) {
  return page.addInitScript(() => {
    window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
  });
}
function hideDevIndicator(page) {
  return page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
}

const browser = await chromium.launch();
const staffCtx = await browser.newContext({ viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2 });
const staff = await staffCtx.newPage();
await seedSplash(staff);

await staff.goto(`${BASE}/${SLUG}/login`);
await staff.waitForLoadState("networkidle");
await staff.getByText("Josh Whelan", { exact: true }).click({ force: true });
await staff.locator('input[type="password"]').fill("1234");
await staff.getByRole("button", { name: "Log in" }).click({ force: true });
await staff.waitForTimeout(1200);

await staff.goto(`${BASE}/${SLUG}/home`);
await staff.waitForLoadState("networkidle");
await hideDevIndicator(staff);
await staff.waitForTimeout(500);

await staff.getByText("Ask something.", { exact: true }).click({ force: true });
await staff.waitForTimeout(400);
await staff.locator('input[placeholder="Type your question"]').fill("What do I do if a customer seems intoxicated?");
await staff.getByRole("button", { name: "Ask", exact: true }).click({ force: true });
await staff.waitForSelector("text=Ask another question", { timeout: 20000 });
await staff.waitForTimeout(400);
const card = staff.locator(".rounded-t-3xl.bg-parchment");
await card.screenshot({ path: path.join(OUT, "ask-larder-in-scope.png") });
console.log("in-scope card captured");

await staff.getByRole("button", { name: "Ask another question" }).click({ force: true });
await staff.waitForTimeout(300);
await staff.locator('input[placeholder="Type your question"]').fill("What's the code for the alarm?");
await staff.getByRole("button", { name: "Ask", exact: true }).click({ force: true });
await staff.waitForSelector("text=Ask another question", { timeout: 20000 });
await staff.waitForTimeout(400);
await card.screenshot({ path: path.join(OUT, "ask-larder-fallback.png") });
console.log("fallback card captured");

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
    await staff.locator("button", { hasText: question.answer }).first().click({ force: true });
    await staff.waitForTimeout(250);
  }
  const continueBtn = staff.getByRole("button", { name: "Continue", exact: true });
  if (await continueBtn.count()) await continueBtn.click({ force: true });
}
await staff.waitForTimeout(600);
const stampCard = staff.locator("div.text-center.space-y-6");
await stampCard.screenshot({ path: path.join(OUT, "module-completion-stamp.png") });
console.log("stamp card captured");

await browser.close();
console.log("done");
