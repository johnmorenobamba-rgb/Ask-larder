import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 900 }, deviceScaleFactor: 1.5 });
await page.goto(
  "file:///C:/Users/johnm/AppData/Local/Temp/claude/C--Users-johnm-Documents-Ask-larder/4cbe4986-dce6-460f-84de-ef42a82304b4/scratchpad/typo-refs.html",
  { waitUntil: "networkidle" },
);
await page.waitForTimeout(1000);
await page.screenshot({
  path: "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots\\typo-refs.png",
  fullPage: true,
});
await browser.close();
console.log("saved");
