// Crops the feature page step screenshots out of the fictional demo venue capture library
// (Saltbush Corner Kitchen, invented staff, captured with Playwright by scratch/marketing/capture.spec.ts).
// The library lives outside the repo; this script records which crop each feature page uses and writes
// src/data/feature-shots.json (src, size and a tiny blur placeholder for each image).
// Run: node scripts/crop-feature-shots.mjs [libraryDir]
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const LIB = process.argv[2] ?? "C:/Users/johnm/larder-private/marketing-assets/launch/screenshots";
const OUT = "public/features";
const CROPS = JSON.parse(fs.readFileSync(new URL("./feature-crops.json", import.meta.url), "utf8"));
// Earlier launch captures that the feature pages reuse as they are (already in public/).
const EXISTING = {
  "launch/ask-answer": "/images/marketing/launch/ask-answer.webp",
  "launch/stations-gallery": "/images/marketing/launch/stations-gallery.webp",
  "launch/suggestion-feed": "/images/marketing/suggestion-assistant-feed-v2.png",
};

async function blurOf(input) {
  const buf = await sharp(input).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${buf.toString("base64")}`;
}

const manifest = {};
for (const c of CROPS) {
  const src = path.join(LIB, c.source);
  const m = await sharp(src).metadata();
  const [x0, y0, x1, y1] = c.rect;
  const left = Math.round(x0 * m.width), top = Math.round(y0 * m.height);
  const width = Math.round((x1 - x0) * m.width), height = Math.round((y1 - y0) * m.height);
  const dir = path.join(OUT, c.slug);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${c.name}.webp`);
  const info = await sharp(src).extract({ left, top, width, height }).resize({ width: Math.min(width, c.maxWidth ?? 1200) }).webp({ quality: 80 }).toFile(file);
  manifest[`${c.slug}/${c.name}`] = { src: `/features/${c.slug}/${c.name}.webp`, width: info.width, height: info.height, blur: await blurOf(file) };
}
for (const [key, url] of Object.entries(EXISTING)) {
  const file = path.join("public", url);
  const m = await sharp(file).metadata();
  manifest[key] = { src: url, width: m.width, height: m.height, blur: await blurOf(file) };
}
fs.writeFileSync("src/data/feature-shots.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(Object.keys(manifest).length, "images in the manifest");
