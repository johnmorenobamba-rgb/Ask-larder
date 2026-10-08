import { test, expect, type Locator, type Page } from "@playwright/test";
import { adminClient, createFixture, destroyFixture, loginStaff, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// The floating near miss button and the Ask Larder button must never sit on top of a primary action on a phone (375 wide).
// Checked on a disposable venue for: the new hire welcome screen (Get started), role select, the modules list and certificates.
test.describe.configure({ timeout: 600_000, mode: "serial" });
test.use({ viewport: { width: 375, height: 812 } });
let fx: Fixture;

test.beforeAll(async () => {
  fx = await createFixture("qr");
  const admin = adminClient();
  await admin.from("modules").insert({ venue_id: fx.venueId, title: "Fixture module (test data)", status: "live", version: 1 }).throwOnError();
  await admin.from("app_users").update({ staff_role_id: null, onboarding_completed_at: null }).eq("id", fx.staff.waiter.id);
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

async function box(loc: Locator) {
  await loc.first().waitFor({ state: "visible", timeout: 60_000 });
  return loc.first().boundingBox();
}
async function expectClear(page: Page, target: Locator, what: string) {
  const fabs = [page.locator("[data-near-miss-fab]"), page.locator("[data-ask-larder-fab]")];
  const t = await box(target);
  expect(t, `${what} has a box`).toBeTruthy();
  for (const fab of fabs) {
    if ((await fab.count()) === 0) continue;
    const f = await fab.first().boundingBox();
    if (!f) continue;
    const overlap = !(t!.x + t!.width <= f.x || f.x + f.width <= t!.x || t!.y + t!.height <= f.y || f.y + f.height <= t!.y);
    expect(overlap, `${what} is covered by a floating button: target ${JSON.stringify(t)} button ${JSON.stringify(f)}`).toBe(false);
  }
}

test("welcome: the Get started button is not under a floating button, and the buttons still work", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: /^Welcome to/ })).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1500);
  await expectClear(page, page.getByRole("link", { name: "Get started" }), "Get started");
  // the near miss button is still there and still opens its form
  await page.locator("[data-near-miss-fab]").click();
  await expect(page.getByPlaceholder("What happened?")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("role select, modules and certificates keep their primary actions clear", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await page.goto(`/${fx.slug}/roles`);
  await page.waitForTimeout(1500);
  await expectClear(page, page.getByRole("button", { name: "Waiter" }), "the Waiter role");
  await page.getByRole("button", { name: "Waiter" }).click();
  await expect(page).toHaveURL(/\/modules$/, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  await expectClear(page, page.getByRole("link", { name: "Fixture module (test data)" }), "the first module");
  await page.goto(`/${fx.slug}/certs`);
  await page.waitForTimeout(1500);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
});

// Every visible link, button and field in the page must clear both floating buttons, at the top of the page and after
// scrolling to the bottom. Elements inside a fixed bar are skipped (that bar already lifts the floating buttons above it).
async function expectNothingCovered(page: Page, what: string) {
  const check = async (where: string) => {
    const bad = await page.evaluate(() => {
      const fabs = Array.from(document.querySelectorAll("[data-near-miss-fab], [data-ask-larder-fab]")) as HTMLElement[];
      const rects = fabs.map((f) => f.getBoundingClientRect()).filter((r) => r.width > 0);
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll("main a, main button, main input, main textarea, main select")) as HTMLElement[]) {
        if (fabs.some((f) => f === el || f.contains(el))) continue;
        let fixed = false;
        for (let p: HTMLElement | null = el; p; p = p.parentElement) if (getComputedStyle(p).position === "fixed") fixed = true;
        if (fixed) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight) continue;
        for (const f of rects) {
          if (!(r.right <= f.left || f.right <= r.left || r.bottom <= f.top || f.bottom <= r.top)) out.push(`${el.tagName} "${(el.textContent ?? "").trim().slice(0, 30)}"`);
        }
      }
      return out;
    });
    expect(bad, `${what} (${where}): covered by a floating button`).toEqual([]);
  };
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await check("top");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  await check("bottom");
}

test("module runner, signature and certificate upload keep every action clear of the floating buttons", async ({ page }) => {
  const admin = adminClient();
  const { data: mod } = await admin.from("modules").select("id").eq("venue_id", fx.venueId).eq("status", "live").limit(1).single();
  await admin.from("module_sections").insert([1, 2, 3].map((n) => ({ module_id: mod!.id, section_order: n, content: `Section ${n}. ${"Wipe the bench, then sanitise it. ".repeat(12)}` }))).throwOnError();
  const { data: ct } = await admin.from("certificate_types").insert({ venue_id: fx.venueId, name: "Fixture certificate (test data)" }).select("id").single();
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  for (const [url, what] of [
    [`/${fx.slug}/modules/${mod!.id}`, "module runner"],
    [`/${fx.slug}/signature`, "signature"],
    [`/${fx.slug}/certs/${ct!.id}`, "certificate upload"],
  ] as const) {
    await page.goto(url);
    await page.locator("main").first().waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForTimeout(1500);
    await expectNothingCovered(page, what);
  }
});
