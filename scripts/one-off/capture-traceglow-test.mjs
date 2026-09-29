import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 420 }, deviceScaleFactor: 2 });
await page.goto("file:///C:/Users/johnm/AppData/Local/Temp/claude/C--Users-johnm-Documents-Ask-larder/4cbe4986-dce6-460f-84de-ef42a82304b4/scratchpad/test-traceglow.html");
await page.waitForTimeout(300);
await page.screenshot({ path: "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots\\traceglow-test.png" });
await browser.close();
console.log("saved");
