import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1920, height: 2600 } });
await page.goto(
  "file:///C:/Users/johnm/AppData/Local/Temp/claude/C--Users-johnm-Documents-Ask-larder/4cbe4986-dce6-460f-84de-ef42a82304b4/scratchpad/trifold-full.html",
);
await page.waitForTimeout(500);
const OUT = "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots";
// close-up of cover chalk underline
await page.screenshot({ path: `${OUT}\\closeup-shift.png`, clip: { x: 1090, y: 130, width: 420, height: 320 } });
// close-up of inside sheet, panel 3 area, to check watermark reach
await page.screenshot({ path: `${OUT}\\closeup-panel3.png`, clip: { x: 1140, y: 1090, width: 680, height: 500 } });
await browser.close();
console.log("saved");
