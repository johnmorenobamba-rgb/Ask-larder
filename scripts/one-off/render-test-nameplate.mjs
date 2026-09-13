// One-off: render a synthetic equipment nameplate photo for testing the
// NameplateCapture OCR flow end-to-end (no real venue equipment photo on
// hand). Playwright renders simple HTML to a PNG, same technique as
// render-app-icons.mjs.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const html = `<!DOCTYPE html><html><head><style>
  body{margin:0;background:#888;display:flex;align-items:center;justify-content:center;height:400px;}
  .plate{background:#d8d8d0;border:4px solid #555;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;color:#111;width:360px;}
  .row{display:flex;justify-content:space-between;margin:4px 0;font-size:15px;}
  .label{font-weight:bold;}
</style></head><body>
  <div class="plate">
    <div style="font-weight:bold;font-size:20px;margin-bottom:10px;">FRYMASTER</div>
    <div class="row"><span class="label">MODEL:</span><span>FPRE317SC</span></div>
    <div class="row"><span class="label">SERIAL:</span><span>FM88421-A</span></div>
    <div class="row"><span class="label">VOLTAGE:</span><span>240V</span></div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 400 } });
await page.setContent(html);
const buf = await page.screenshot();
writeFileSync("C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\test-nameplate.png", buf);
console.log("wrote test-nameplate.png");
await browser.close();
