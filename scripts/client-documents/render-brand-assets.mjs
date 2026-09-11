// Renders the header/footer banner art used by every client document --
// PNGs embedded via ImageRun, not native docx shapes, since docx-js has no
// diagonal-clip banner primitive. The header's chit mark reproduces the
// real app's idle ChitMark state (src/components/shared/ChitMark.tsx): a
// faint full-shape fill under a stroked outline where a ~22%-of-path
// glowing segment sits, drop-shadow blurred -- frozen at one position
// instead of animated, which is the literal "looks like it's moving, but
// it isn't" ask. Same LARDER_MARK_PATH constant, not redrawn by hand.
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "assets");
mkdirSync(assetsDir, { recursive: true });

const LARDER_MARK_PATH =
  "M12 14a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H30l-12 12V48h-6a6 6 0 0 1-6-6z";

const COLORS = {
  ink: "#1F1B16",
  parchment: "#F2E9D8",
  preserveRed: "#B23A2C",
  saffron: "#E8A93B",
  clayBrown: "#7A5C43",
};

// 2x render scale for print crispness -- embedded at half these pixel
// dimensions in the actual documents.
const HEADER_W = 1286;
const HEADER_H = 260;
const FOOTER_W = 1286;
const FOOTER_H = 46;

function headerHtml() {
  return `<!doctype html><html><head>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Inter:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:${HEADER_W}px; height:${HEADER_H}px; overflow:hidden; font-family: Inter, sans-serif; }
    .band {
      position:absolute; inset:0;
      background:${COLORS.ink};
      clip-path: polygon(0 0, 100% 0, 100% 68%, 0 100%);
    }
    .stripe {
      position:absolute; left:0; right:0;
      top:0; bottom:0;
      clip-path: polygon(0 96%, 100% 64%, 100% 70%, 0 100%);
      background:${COLORS.saffron};
    }
    .content { position:absolute; inset:0; display:flex; align-items:center; padding: 0 46px; }
    .wordblock { margin-left: 26px; }
    .word { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:56px; color:${COLORS.parchment}; letter-spacing:1px; line-height:1; }
    .tag { font-family:'IBM Plex Mono',monospace; font-size:19px; color:${COLORS.parchment}; opacity:0.55; letter-spacing:2px; margin-top:8px; }
    .site { position:absolute; top:34px; right:48px; font-family:'IBM Plex Mono',monospace; font-size:17px; color:${COLORS.parchment}; opacity:0.45; letter-spacing:1px; }
  </style></head>
  <body>
    <div class="band"></div>
    <div class="stripe"></div>
    <div class="content">
      <svg id="mark" width="150" height="150" viewBox="0 0 72 72">
        <path d="${LARDER_MARK_PATH}" fill="${COLORS.parchment}" opacity="0.16"></path>
        <path id="trace" d="${LARDER_MARK_PATH}" fill="none" stroke="${COLORS.saffron}" stroke-width="3.4" stroke-linecap="round"
          style="filter: drop-shadow(0 0 9px ${COLORS.saffron}) drop-shadow(0 0 3px ${COLORS.saffron});"></path>
      </svg>
      <div class="wordblock">
        <div class="word">LARDER</div>
        <div class="tag">YOUR SOPS, ALWAYS ON SHIFT</div>
      </div>
    </div>
    <div class="site">asklarder.com.au</div>
    <script>
      // Reproduces ChitMark.tsx's idle-state math exactly: a ~22%-length
      // glowing segment placed partway around the path, not the whole
      // outline lit -- the "traveling glow, caught mid-travel" look.
      const p = document.getElementById('trace');
      const len = p.getTotalLength();
      const TRACE_FRACTION = 0.22;
      const segment = len * TRACE_FRACTION;
      p.style.strokeDasharray = segment + ' ' + (len - segment);
      p.style.strokeDashoffset = String(-len * 0.62);
    </script>
  </body></html>`;
}

function footerHtml() {
  return `<!doctype html><html><head><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:${FOOTER_W}px; height:${FOOTER_H}px; overflow:hidden; }
    .band {
      position:absolute; inset:0;
      background:${COLORS.ink};
      clip-path: polygon(0 30%, 100% 0, 100% 100%, 0 100%);
    }
    .stripe {
      position:absolute; inset:0;
      clip-path: polygon(0 30%, 100% 0, 100% 8%, 0 38%);
      background:${COLORS.saffron};
    }
  </style></head>
  <body>
    <div class="band"></div>
    <div class="stripe"></div>
  </body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: HEADER_W, height: HEADER_H }, deviceScaleFactor: 1 });

await page.setContent(headerHtml());
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(assetsDir, "header-band.png"), omitBackground: true });

await page.setViewportSize({ width: FOOTER_W, height: FOOTER_H });
await page.setContent(footerHtml());
await page.waitForTimeout(100);
await page.screenshot({ path: path.join(assetsDir, "footer-band.png"), omitBackground: true });

await browser.close();
console.log("Wrote scripts/client-documents/assets/header-band.png and footer-band.png");
