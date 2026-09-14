// Live verification for item 5 (14 Sep build session): a follow-up
// question in the Ask Larder overlay should no longer require closing
// and reopening the whole sheet.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
function check(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}${detail ? " :: " + detail : ""}`);
}
async function nativeClick(locator) {
  await locator.waitFor({ state: "visible", timeout: 15000 });
  await locator.evaluate((el) => el.click());
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });

// Staff login (Tomas Reyes, Two Fires, PIN 4242 -- set earlier this session).
await page.goto(`${BASE}/two-fires/login`, { waitUntil: "networkidle" });
await nativeClick(page.getByText("Tomas Reyes", { exact: false }).first());
await page.waitForTimeout(400);
await page.locator('input[type="password"]').first().pressSequentially("4242", { delay: 30 });
await page.waitForTimeout(200);
await nativeClick(page.getByRole("button", { name: "Log in" }));
await page.waitForTimeout(1500);
await page.waitForLoadState("networkidle");

await page.goto(`${BASE}/two-fires/home`, { waitUntil: "networkidle" });

// Open Ask Larder (the fixed bottom-left trigger button) -- it's driven by
// onPointerDown/onPointerUp, not onClick, and sits under a magnetic-pull
// hook that makes locator.click()'s stability check flaky. Dispatch the
// real pointer events directly instead.
const trigger = page.getByRole("button", { name: "Ask Larder" });
await trigger.dispatchEvent("pointerdown");
await page.waitForTimeout(60);
await trigger.dispatchEvent("pointerup");
await page.waitForTimeout(400);
await page.screenshot({ path: "scratch/verify-ask-larder-step1-open.png" });

await page.locator('input[placeholder="Type your question"]').pressSequentially("What time do we close on Fridays?", { delay: 10 });
await nativeClick(page.getByRole("button", { name: "Ask", exact: true }));
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/verify-ask-larder-step2-thinking.png" });
await page.waitForTimeout(4000);
await page.screenshot({ path: "scratch/verify-ask-larder-step3-answered.png" });

const afterFirstAnswer = await page.locator("body").innerText();
console.log("AFTER FIRST SUBMIT:\n" + afterFirstAnswer.slice(0, 500));
check("first answer rendered", afterFirstAnswer.includes("Thinking") === false, null);
const askAnotherVisible = await page.getByRole("button", { name: "Ask another question" }).isVisible().catch(() => false);
check("'Ask another question' control present", askAnotherVisible, null);

await nativeClick(page.getByRole("button", { name: "Ask another question" }));
await page.waitForTimeout(300);

await page.screenshot({ path: "scratch/verify-ask-larder-step4-reset.png" });
const inputBackVisible = await page.locator('input[placeholder="Type your question"]').isVisible().catch(() => false);
check("input is back without closing the sheet", inputBackVisible, null);

await page.locator('input[placeholder="Type your question"]').pressSequentially("What's the safe combination?", { delay: 10 });
await nativeClick(page.getByRole("button", { name: "Ask", exact: true }));
await page.waitForTimeout(4500);
await page.screenshot({ path: "scratch/verify-ask-larder-step5-second-answer.png" });
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("FAILURES:", failed.map((f) => f.label).join(", "));
  process.exit(1);
}
