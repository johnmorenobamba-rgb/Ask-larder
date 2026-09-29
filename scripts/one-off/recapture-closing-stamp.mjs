import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const SLUG = "coachmans-arms-wizard";
const OUT = "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots";
const MODULE_ID = "5e5e6a77-e579-4424-bb7a-19302c7ded3d"; // Closing procedures and premises security

function hideDevIndicator(page) {
  return page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
}

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

await page.goto(`${BASE}/${SLUG}/modules/${MODULE_ID}`);
await page.waitForLoadState("networkidle");
await hideDevIndicator(page);

const ANSWER_MAP = [
  { match: "Who's responsible for till reconciliation", answer: "The closing duty manager, usually Dave or sometimes Steph" },
  { match: "Roughly when are last drinks called", answer: "About 12:30" },
  { match: "When is CCTV footage reviewed", answer: "Reactively, if something has happened" },
  { match: "Who has access to the safe code and alarm code", answer: "Gary, Dave, and Steph" },
];

for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(350);
  const bodyText = await page.locator("main").innerText().catch(() => "");
  console.log(`--- step ${i} ---`, bodyText.slice(0, 80).replace(/\n/g, " | "));
  if (/completed$/im.test(bodyText) || /APPROVED/.test(bodyText)) {
    console.log("Module completion screen reached.");
    break;
  }
  const question = ANSWER_MAP.find((q) => bodyText.includes(q.match));
  if (question) {
    console.log("  answering:", question.answer);
    await page.locator("button", { hasText: question.answer }).first().click({ force: true });
    await page.waitForTimeout(250);
  }
  const continueBtn = page.getByRole("button", { name: "Continue", exact: true });
  if (await continueBtn.count()) {
    await continueBtn.click({ force: true });
  } else {
    console.log("  no continue button found this step");
  }
}
await page.waitForTimeout(600);
const stampCard = page.locator("div.text-center.space-y-6");
await stampCard.screenshot({ path: `${OUT}\\module-completion-stamp.png` });
console.log("stamp card captured");

await browser.close();
