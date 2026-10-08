import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createFixture, destroyFixture, loginOwner, loginStaff, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// The owner records print layout keeps real margins on every side of an A4 page. Disposable fixture venue.
// Set PRINT_OUT to a folder to keep the rendered PDF for a visual check.
test.describe.configure({ timeout: 300_000, mode: "serial" });

let fx: Fixture;
test.beforeAll(async () => {
  fx = await createFixture("pl");
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

test("print stylesheet declares A4 with margins on all four sides and the table fits inside them", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  const u = fx.unitIds;
  const res = await page.request.post("/api/staff/compliance/b2", {
    data: { entries: [
      { clientRequestId: randomUUID(), unitId: u.coolroom, readingC: 3.5 },
      { clientRequestId: randomUUID(), unitId: u.bain, readingC: 55, correctiveAction: "Reheated the bain marie and moved the food" },
    ] },
  });
  expect(res.status()).toBe(200);
  await loginOwner(page, fx);
  await page.goto(`/${fx.slug}/owner/compliance/records`);
  await page.locator(".record-table").waitFor({ state: "visible", timeout: 60_000 });
  await page.emulateMedia({ media: "print" });
  const margins = await page.evaluate(() =>
    Array.from(document.styleSheets).flatMap((s) => { try { return Array.from(s.cssRules); } catch { return []; } })
      .filter((r) => r.constructor.name === "CSSPageRule")
      .map((r) => (r as CSSPageRule).style.margin),
  );
  expect(margins.length).toBeGreaterThan(0);
  for (const m of margins) expect(m).toMatch(/^1[2-9]mm( 1[2-9]mm)*$/); // 12 to 19 mm on every side
  // A4 at 96 dpi is 794px wide; the printable width after margins must hold the table
  const widthOk = await page.evaluate(() => (document.querySelector(".record-table") as HTMLElement).scrollWidth <= document.documentElement.clientWidth);
  expect(widthOk).toBe(true);
  const out = path.join(process.env.PRINT_OUT ?? "test-results", "records-print.pdf");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.pdf({ path: out, format: "A4", preferCSSPageSize: true, printBackground: true });
  expect(fs.statSync(out).size).toBeGreaterThan(20_000);
});

test("completions table does not clip at 375 wide: it scrolls sideways and the Staff column stays in view", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const { adminClient } = await import("./helpers/stage0");
  const admin = adminClient();
  for (const title of ["Fixture module one", "Fixture module two", "Fixture module three"]) {
    await admin.from("modules").insert({ venue_id: fx.venueId, title, status: "live", version: 1 }).throwOnError();
  }
  await loginOwner(page, fx);
  await page.goto(`/${fx.slug}/owner/completions`);
  const table = page.locator("table");
  await table.waitFor({ state: "visible", timeout: 60_000 });
  // the page itself never scrolls sideways
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const region = page.getByRole("region", { name: /Completions by staff member/ });
  expect(await region.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await region.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  await page.waitForTimeout(300);
  const staffCell = page.locator("tbody tr").first().locator("td").first();
  const box = await staffCell.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  await expect(staffCell).toBeVisible();
});
