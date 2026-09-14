// Live verification for item 11 (14 Sep build session): the HeroBentoPreview
// next/image migration renders correctly, and compressImageFile() actually
// shrinks a large image before it reaches Supabase Storage.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
function check(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}${detail ? " :: " + detail : ""}`);
}

const browser = await chromium.launch();

// --- Part 1: marketing page renders the migrated next/image station photos ---
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const imgs = await page.locator("img").evaluateAll((els) =>
    els.map((el) => ({ src: el.getAttribute("src") ?? "", currentSrc: el.currentSrc })),
  );
  const stationImg = imgs.find((i) => i.src.includes("/_next/image") && i.src.includes("stations"));
  check("HeroBentoPreview station photo now served via /_next/image", !!stationImg, JSON.stringify(imgs.slice(0, 5)));
  await page.screenshot({ path: "scratch/verify-hero-bento-nextimage.png" });
  await page.close();
}

// --- Part 2: compressImageFile() actually shrinks a large real upload ---
{
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });

  // Generate a genuinely large (~4000x3000, several MB) JPEG entirely in
  // the browser -- a stand-in for a real, unprocessed phone-camera photo,
  // save it to disk so Playwright's setInputFiles can use it as a real
  // file input (not just an in-memory Blob).
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4000;
    canvas.height = 3000;
    const ctx = canvas.getContext("2d");
    // Noisy gradient -- compresses poorly if left uncompressed, so the
    // resulting file is genuinely large (a flat color would trivially
    // JPEG-compress small even at full resolution, which wouldn't prove
    // anything about the resize step actually running).
    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        ctx.fillStyle = `rgb(${(x * 7) % 255},${(y * 13) % 255},${(x + y) % 255})`;
        ctx.fillRect(x, y, 4, 4);
      }
    }
    return canvas.toDataURL("image/jpeg", 0.95);
  });
  const base64 = dataUrl.split(",")[1];
  const testImagePath = "scratch/large-test-photo.jpg";
  await import("node:fs").then((fs) => fs.writeFileSync(testImagePath, Buffer.from(base64, "base64")));
  const originalSize = (await import("node:fs")).statSync(testImagePath).size;
  console.log(`Generated test photo: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

  // Log in as Two Fires owner and upload it via the real UploadPhotoForm.
  await page.goto(`${BASE}/two-fires/owner/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').pressSequentially("two-fires-owner@example.com", { delay: 10 });
  await page.locator('input[type="password"]').pressSequentially("TwoFiresVerify2026!", { delay: 10 });
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Log in" }).evaluate((el) => el.click());
  await page.waitForFunction(() => !window.location.pathname.endsWith("/login"), null, { timeout: 15000 }).catch(() => null);
  await page.waitForLoadState("networkidle");

  await page.goto(`${BASE}/two-fires/owner/photo-library`, { waitUntil: "networkidle" });
  await page.setInputFiles('input[type="file"]', testImagePath);
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Upload" }).evaluate((el) => el.click());
  await page.waitForTimeout(3000);
  await page.waitForLoadState("networkidle");

  const bodyText = await page.locator("body").innerText();
  check("upload completed without error", !bodyText.toLowerCase().includes("couldn't save"), bodyText.slice(0, 200));

  await page.close();
  console.log(`\nOriginal test photo was ${(originalSize / 1024 / 1024).toFixed(2)}MB -- check Supabase Storage for the actual stored size (next step, via SQL/API, not in this script).`);
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("FAILURES:", failed.map((f) => f.label).join(", "));
}
