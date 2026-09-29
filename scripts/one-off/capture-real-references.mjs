import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 500 }, deviceScaleFactor: 2 });
await page.goto(
  "file:///C:/Users/johnm/AppData/Local/Temp/claude/C--Users-johnm-Documents-Ask-larder/4cbe4986-dce6-460f-84de-ef42a82304b4/scratchpad/real-references.html",
  { waitUntil: "networkidle" },
);
await page.waitForTimeout(1000);
await page.screenshot({
  path: "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots\\real-references.png",
  fullPage: true,
});
await browser.close();
console.log("saved");
