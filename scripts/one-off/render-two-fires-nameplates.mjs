// Renders 5 synthetic equipment nameplate photos, one per Two Fires station,
// for driving the real NameplateCapture upload -> OCR -> confirm flow
// end-to-end. Two Fires is a fictional demo venue with no physical
// equipment to photograph, so a plausible synthetic nameplate exercises the
// exact same real code path a genuine photo would.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

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
  { file: "bar.png", brand: "LANCER", rows: [["MODEL", "LT-8000 Tower"], ["SERIAL", "LN22093-B"], ["VOLTAGE", "240V"]] },
  { file: "cellar.png", brand: "MICRO MATIC", rows: [["MODEL", "MM-CO2-REG2"], ["SERIAL", "MMR-77213"], ["MAX PSI", "800"]] },
  { file: "fryer.png", brand: "FRYMASTER", rows: [["MODEL", "FPRE317SC"], ["SERIAL", "FM88421-A"], ["VOLTAGE", "240V"]] },
  { file: "pizza.png", brand: "MORETTI FORNI", rows: [["MODEL", "P110E"], ["SERIAL", "MF-56920"], ["POWER", "18kW"]] },
  { file: "washup.png", brand: "WINTERHALTER", rows: [["MODEL", "UC-M"], ["SERIAL", "WH-330187"], ["VOLTAGE", "240V"]] },
];

const browser = await chromium.launch();
for (const p of PLATES) {
  const page = await browser.newPage({ viewport: { width: 480, height: 400 } });
  await page.setContent(plateHtml(p.rows, p.brand));
  const buf = await page.screenshot();
  writeFileSync(`C:\\Users\\johnm\\AppData\\Local\\Temp\\claude\\nameplate-${p.file}`, buf);
  console.log(`wrote nameplate-${p.file}`);
  await page.close();
}
await browser.close();
