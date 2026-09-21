// Part 4 multi-viewport visual verification (CLAUDE.md's standing rule for
// any visual/design decision) of the new SuggestionAssistantSection on the
// public landing page.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  // SplashScreen's once-per-day cold-load overlay covers everything on a
  // fresh context otherwise (reference_dev_environment_quirks memory).
  await page.addInitScript(() => {
    window.localStorage.setItem("larder-splash-shown-date", new Date().toISOString().slice(0, 10));
  });
  await page.goto(BASE + "/");
  await page.waitForLoadState("networkidle");
  const heading = page.getByRole("heading", { name: "Larder notices what your SOPs missed." });
  await heading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600); // let the scroll-reveal fade-up finish
  await expectVisible(heading);
  await page.screenshot({ path: `scratch/suggestion-assistant-section-${vp.name}.png`, fullPage: false });
  console.log(`${vp.name}: captured`);
  await page.close();
}

async function expectVisible(locator) {
  const count = await locator.count();
  if (count === 0) throw new Error("Heading not found");
}

await browser.close();
console.log("Done.");
