import { chromium } from "playwright";

const SRC = "file:///C:/Users/johnm/AppData/Local/Temp/claude/C--Users-johnm-Documents-Ask-larder/4cbe4986-dce6-460f-84de-ef42a82304b4/scratchpad/print-trifold.html";
const OUT_DIR = "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\4cbe4986-dce6-460f-84de-ef42a82304b4\\scratchpad\\shots";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(SRC, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const pdfPath = `${OUT_DIR}\\Larder-trifold-press-ready.pdf`;
await page.pdf({
  path: pdfPath,
  width: "297mm",
  height: "210mm",
  printBackground: true,
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
  preferCSSPageSize: true,
});
console.log("PDF saved.");

// Verify by actually rendering the exported PDF itself (not the pre-PDF
// HTML -- that looked fine last time while the real PDF output was
// broken), using Chromium's built-in PDF viewer.
const pdfPage = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await pdfPage.goto(`file:///${pdfPath.replace(/\\/g, "/")}`);
await pdfPage.waitForTimeout(1500);
await pdfPage.screenshot({ path: `${OUT_DIR}\\pdf-render-check.png` });
console.log("PDF render check captured.");

await browser.close();
