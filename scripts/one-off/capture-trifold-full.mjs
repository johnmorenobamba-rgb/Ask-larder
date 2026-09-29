import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1.5, viewport: { width: 2250, height: 1600 } });
await page.goto(
  "file:///C:/Users/johnm/AppData/Local/Temp/claude/C--Users-johnm-Documents-Ask-larder/4cbe4986-dce6-460f-84de-ef42a82304b4/scratchpad/trifold-full.html",
);
await page.waitForTimeout(500);
await page.screenshot({
  path: "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots\\trifold-full.png",
  fullPage: true,
});
await browser.close();
console.log("saved");
