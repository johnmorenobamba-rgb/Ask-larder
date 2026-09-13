// One-off: rasterize Larder's chit mark (LARDER_MARK_PATH, 72x72 viewBox)
// onto a solid Parchment square at the exact sizes Next.js's file-based icon
// convention needs, using Playwright (already a project devDependency) as a
// headless-Chromium SVG renderer -- no new image-processing lib required.
// Parchment background + Ink mark matches the existing in-app icon-tile
// treatment (AskLarderTriggerIcon's idle state: bg-parchment circle, Ink
// ChitMark) rather than inventing a new color pairing for this asset.
//
// Fixes: no apple-touch-icon existed at all, so iOS "Add to Home Screen"
// fell back to a plain letter tile ("A", from the page title "Ask Larder").
// Also replaces the default create-next-app favicon.ico under src/app/.

import { chromium } from "playwright";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";

const MARK_PATH =
  "M12 14a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H30l-12 12V48h-6a6 6 0 0 1-6-6z";

const INK = "#1F1B16";
const PARCHMENT = "#F2E9D8";

function pageHtml(size, { squareCorners = false } = {}) {
  const pad = size * 0.2;
  const inner = size - pad * 2;
  return `<!DOCTYPE html><html><head><style>
    html,body{margin:0;padding:0;}
    svg{display:block;}
  </style></head><body>
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" ${squareCorners ? "" : `rx="${size * 0.22}" ry="${size * 0.22}"`} fill="${PARCHMENT}"/>
      <g transform="translate(${pad}, ${pad}) scale(${inner / 72})">
        <path d="${MARK_PATH}" fill="${INK}"/>
      </g>
    </svg>
  </body></html>`;
}

const targets = [
  // app/icon.png -- browser favicon / tab icon.
  { file: "icon.png", size: 256, squareCorners: false },
  // app/apple-icon.png -- iOS "Add to Home Screen" icon. Apple's spec:
  // exactly 180x180, fully opaque/square -- iOS applies its own
  // rounded-corner + shadow mask, so a pre-rounded or transparent source
  // renders wrong (dark corners) on the home screen.
  { file: "apple-icon.png", size: 180, squareCorners: true },
];

const appDir = "C:\\Users\\johnm\\Documents\\Ask-larder\\src\\app";

const browser = await chromium.launch();
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
  await page.setContent(pageHtml(t.size, { squareCorners: t.squareCorners }));
  const buf = await page.screenshot({ omitBackground: !t.squareCorners });
  writeFileSync(`${appDir}\\${t.file}`, buf);
  console.log(`wrote ${t.file} (${t.size}x${t.size})`);
  await page.close();
}
await browser.close();

// The default create-next-app favicon.ico is superseded by icon.png above --
// Next.js's file-based metadata only picks one active source per slot, and
// leaving both in place is a stale duplicate, not a fallback.
const staleFavicon = `${appDir}\\favicon.ico`;
if (existsSync(staleFavicon)) {
  unlinkSync(staleFavicon);
  console.log("removed stale default favicon.ico");
}
