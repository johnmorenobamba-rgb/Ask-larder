// Sales deck (20 Sep 2026) -- assembles the single, fully offline HTML file
// from build/template.html: bundles GSAP core + ScrollTrigger + DrawSVG +
// MorphSVG + SplitText inline from node_modules/gsap (no CDN reference
// anywhere), and inlines the three brand typefaces as base64 data URIs so
// the deck never makes a network call once opened. Fonts were fetched once
// from Google Fonts during this build (not at presentation time) and
// committed under build/fonts so this script is reproducible without
// depending on any session's local temp files.
//
// Run with: node scripts/one-off/build-sales-deck.mjs
import { readFileSync, writeFileSync } from "fs";

const GSAP_DIR = "node_modules/gsap/dist";
const FONT_DIR = "public/sales-deck/build/fonts";

function readJs(name) {
  return readFileSync(`${GSAP_DIR}/${name}`, "utf8");
}

function fontDataUri(filename) {
  const buf = readFileSync(`${FONT_DIR}/${filename}`);
  return `data:font/woff2;base64,${buf.toString("base64")}`;
}

let html = readFileSync("public/sales-deck/build/template.html", "utf8");

const replacements = {
  "{{GSAP_CORE}}": readJs("gsap.min.js"),
  "{{GSAP_SCROLLTRIGGER}}": readJs("ScrollTrigger.min.js"),
  "{{GSAP_DRAWSVG}}": readJs("DrawSVGPlugin.min.js"),
  "{{GSAP_MORPHSVG}}": readJs("MorphSVGPlugin.min.js"),
  "{{GSAP_SPLITTEXT}}": readJs("SplitText.min.js"),
  "{{FONT_SPACEGROTESK}}": fontDataUri("spacegrotesk-variable.woff2"),
  "{{FONT_INTER}}": fontDataUri("inter-variable.woff2"),
  "{{FONT_IBM_400}}": fontDataUri("ibmplexmono-400.woff2"),
  "{{FONT_IBM_500}}": fontDataUri("ibmplexmono-500.woff2"),
};

for (const [token, value] of Object.entries(replacements)) {
  if (!html.includes(token)) throw new Error(`Template is missing expected token: ${token}`);
  html = html.split(token).join(value);
}

writeFileSync("public/sales-deck/index.html", html);
console.log(`Built public/sales-deck/index.html (${(html.length / 1024).toFixed(0)} KB)`);
