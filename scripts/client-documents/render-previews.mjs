// Renders page 1 of each generated .docx into a PNG for review, using
// docx-preview (parses the real document.xml/styles, not a re-derived
// approximation) inside a Playwright/Chromium page, then screenshots just
// the first rendered page element.
//
// Environment note: neither LibreOffice nor the docx skill's own soffice.py
// helper is actually reachable in this environment (soffice.py itself
// isn't installed; the skill's usual conversion path assumes it is), and
// Word COM automation access was denied when requested. This is the
// working substitute -- it renders the real .docx bytes, not a hand-copied
// HTML approximation of the content.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, "../../client-documents/templates");
const outDir = path.join(__dirname, "../../scratch/client-doc-review");
mkdirSync(outDir, { recursive: true });

const jszipSrc = path.join(__dirname, "node_modules/jszip/dist/jszip.js");
const docxPreviewSrc = path.join(__dirname, "node_modules/docx-preview/dist/docx-preview.js");

const files = [
  "Client Services Agreement.docx",
  "Order Form (Schedule A).docx",
  "Pricing Schedule.docx",
  "Invoice Template.docx",
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
await page.setContent("<!doctype html><html><body><div id='container'></div></body></html>");
await page.addScriptTag({ path: jszipSrc });
await page.addScriptTag({ path: docxPreviewSrc });

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const bytes = readFileSync(filePath);
  const base64 = bytes.toString("base64");

  await page.evaluate(() => {
    document.getElementById("container").innerHTML = "";
  });

  await page.evaluate(async (b64) => {
    function base64ToUint8Array(base64Str) {
      const binary = atob(base64Str);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      return arr;
    }
    const bytes = base64ToUint8Array(b64);
    const container = document.getElementById("container");
    await window.docx.renderAsync(bytes, container, container, {
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
    });
  }, base64);

  await page.waitForTimeout(400);
  await page.waitForSelector(".docx-wrapper .docx", { timeout: 10000 });

  const firstPage = page.locator(".docx-wrapper .docx").first();
  const outName = file.replace(/\.docx$/, "").replace(/[^\w\- ()]/g, "") + " — page 1.png";
  const outPath = path.join(outDir, outName);
  await firstPage.screenshot({ path: outPath });
  console.log(`Rendered: ${outName}`);
}

await browser.close();
console.log("Done.");
