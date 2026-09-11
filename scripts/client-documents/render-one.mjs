import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = process.argv[2];
const outName = process.argv[3];
const outDir = path.join(__dirname, "../../scratch/client-doc-review");
mkdirSync(outDir, { recursive: true });

const jszipSrc = path.join(__dirname, "node_modules/jszip/dist/jszip.js");
const docxPreviewSrc = path.join(__dirname, "node_modules/docx-preview/dist/docx-preview.js");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
await page.setContent("<!doctype html><html><body><div id='container'></div></body></html>");
await page.addScriptTag({ path: jszipSrc });
await page.addScriptTag({ path: docxPreviewSrc });

const bytes = readFileSync(target);
const base64 = bytes.toString("base64");

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
    breakPages: true,
    renderHeaders: true,
    renderFooters: true,
  });
}, base64);

await page.waitForTimeout(400);
await page.waitForSelector(".docx-wrapper .docx", { timeout: 10000 });
const outPath = path.join(outDir, outName);
await page.locator(".docx-wrapper .docx").first().screenshot({ path: outPath });
await browser.close();
console.log("Rendered:", outPath);
