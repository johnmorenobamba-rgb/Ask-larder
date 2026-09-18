// Renders 4 synthetic equipment nameplate photos, one per Coachman's Arms
// station, for driving the real NameplateCapture upload -> OCR -> confirm
// flow end-to-end. Mirrors render-two-fires-nameplates.mjs's pattern
// exactly. Brands/models chosen to be plausible for each station's real
// role at this venue (already on file): Cellar runs CO2/nitrogen dispense
// (Micro Matic is real, common draft equipment); Kitchen is a full
// commercial kitchen (Blue Seal is a real, common Australian commercial
// kitchen brand); Bistro is the dining/service point (an espresso machine,
// Rancilio is real and common); Public Bar runs glassware turnover
// (a glasswasher, Hobart is real and common in Australian venues).
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const OUT_DIR = "C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\C--Users-johnm-Documents-Ask-larder\\edf5d661-5616-41dc-a854-00bad3fc38f5\\scratchpad";
mkdirSync(OUT_DIR, { recursive: true });

function plateHtml(rows, brand) {
  const rowsHtml = rows.map(([k, v]) => `<div class="row"><span class="label">${k}:</span><span>${v}</span></div>`).join("");
  return `<!DOCTYPE html><html><head><style>
    body{margin:0;background:#888;display:flex;align-items:center;justify-content:center;height:400px;}
    .plate{background:#d8d8d0;border:4px solid #555;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;color:#111;width:380px;}
    .row{display:flex;justify-content:space-between;margin:4px 0;font-size:15px;}
    .label{font-weight:bold;}
  </style></head><body>
    <div class="plate">
      <div style="font-weight:bold;font-size:20px;margin-bottom:10px;">${brand}</div>
      ${rowsHtml}
    </div>
  </body></html>`;
}

const PLATES = [
  { file: "bistro.png", brand: "RANCILIO", rows: [["MODEL", "CLASSE 5 USB"], ["SERIAL", "RC24118-B"], ["VOLTAGE", "240V"]] },
  { file: "cellar.png", brand: "MICRO MATIC", rows: [["MODEL", "MM-CO2-REG3"], ["SERIAL", "MMR-90842"], ["MAX PSI", "800"]] },
  { file: "kitchen.png", brand: "BLUE SEAL", rows: [["MODEL", "E56D"], ["SERIAL", "BS55671-K"], ["VOLTAGE", "240V"]] },
  { file: "public-bar.png", brand: "HOBART", rows: [["MODEL", "GXWS-10A"], ["SERIAL", "HB31029-P"], ["VOLTAGE", "240V"]] },
];

const browser = await chromium.launch();
for (const p of PLATES) {
  const page = await browser.newPage({ viewport: { width: 480, height: 400 } });
  await page.setContent(plateHtml(p.rows, p.brand));
  const buf = await page.screenshot();
  writeFileSync(`${OUT_DIR}\\nameplate-${p.file}`, buf);
  console.log(`wrote nameplate-${p.file}`);
  await page.close();
}
await browser.close();
