// Live regression check for item 10 (14 Sep build session): after adding
// error logging/handling to 52 files, confirm the normal (happy-path)
// behavior of a representative sample still works correctly.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
function check(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}${detail ? " :: " + detail : ""}`);
}
async function nativeClick(locator) {
  await locator.waitFor({ state: "visible", timeout: 15000 });
  await locator.evaluate((el) => el.click());
}

const browser = await chromium.launch();

// --- Owner side: dashboard, modules, completions, certs, sops still render ---
{
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await page.goto(`${BASE}/coachmans-arms-wizard/owner/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').pressSequentially("john.moreno.bamba+coachmans-arms-wizard@gmail.com", { delay: 10 });
  await page.locator('input[type="password"]').pressSequentially("RealOwnerAudit2026!", { delay: 10 });
  await page.waitForTimeout(200);
  await nativeClick(page.getByRole("button", { name: "Log in" }));
  await page.waitForFunction(() => !window.location.pathname.endsWith("/login"), null, { timeout: 15000 }).catch(() => null);
  await page.waitForLoadState("networkidle");

  for (const path of ["dashboard", "modules", "completions", "certs", "sops", "staff", "stations"]) {
    await page.goto(`${BASE}/coachmans-arms-wizard/owner/${path}`, { waitUntil: "networkidle" });
    const text = await page.locator("body").innerText();
    check(`owner /${path} renders real content`, text.length > 200 && !text.includes("Application error"), text.slice(0, 80));
  }
  await page.close();
}

// --- Staff side: home, modules, certs still render ---
{
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await page.goto(`${BASE}/coachmans-arms-wizard/login`, { waitUntil: "networkidle" });
  await nativeClick(page.getByText("Ash Thompson", { exact: false }).first());
  await page.waitForTimeout(400);
  await page.locator('input[type="password"]').first().pressSequentially("4242", { delay: 20 }).catch(() => null);
  await nativeClick(page.getByRole("button", { name: "Log in" }));
  await page.waitForTimeout(1500);
  await page.waitForLoadState("networkidle");

  for (const path of ["home", "modules", "certs"]) {
    await page.goto(`${BASE}/coachmans-arms-wizard/${path}`, { waitUntil: "networkidle" });
    const text = await page.locator("body").innerText();
    check(`staff /${path} renders real content`, text.length > 100 && !text.includes("Application error"), text.slice(0, 80));
  }

  // The high-stakes fix: Ash has completed all 19 modules + uploaded certs
  // earlier this session -- the signature page's fail-closed rewrite must
  // not have broken the legitimate "everything really is done" path.
  await page.goto(`${BASE}/coachmans-arms-wizard/signature`, { waitUntil: "networkidle" });
  const sigText = await page.locator("body").innerText();
  check(
    "signature page reachable for a genuinely fully-completed staff member",
    !page.url().endsWith("/modules") && (sigText.includes("Sign") || sigText.includes("sign")),
    `url=${page.url()} body=${sigText.slice(0, 150)}`,
  );
  await page.screenshot({ path: "scratch/verify-signature-regression.png" });
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length > 0) {
  console.log("FAILURES:", failed.map((f) => f.label).join(", "));
  process.exit(1);
}
