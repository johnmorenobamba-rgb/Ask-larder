import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { FORMS, FORM_BY_ID } from "../../src/lib/compliance/engine/forms";
import { adminClient, createFixture, destroyFixture, loginOwner, loginStaff, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";
import { PLANS, fieldsOf, fillAll, openForm, saveRecord } from "./helpers/formDriver";

// Screenshots for the staff UI guide. They come ONLY from a disposable fixture venue modelled on the
// demo pub (helpers/stage0.ts, names disclosed as "Fixture ..."), removed afterwards with the service
// role. Never the demo venue or any real venue. Named form-state-viewport. No cookie, token, key or
// password is ever on screen: only post login pages are captured, and the Next dev indicator is hidden.
// Set GUIDE_ONLY=B10,B5 to capture only some forms while developing.
test.describe.configure({ timeout: 1_800_000, mode: "serial" });

const OUT = path.resolve(__dirname, "../../scratch/compliance-stage0-report/guide/shots");
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "landscape", width: 1024, height: 768 },
] as const;

let fx: Fixture;
const only = process.env.GUIDE_ONLY ? new Set(process.env.GUIDE_ONLY.split(",")) : null;
const want = (id: string) => !only || only.has(id);
const manifest: { name: string; form: string; state: string; viewport: string; role: string }[] = [];

async function hideDevUi(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }" });
}

async function shotAll(page: Page, form: string, state: string, role: string) {
  await hideDevUi(page);
  for (const v of VIEWPORTS) {
    await page.setViewportSize({ width: v.width, height: v.height });
    await page.waitForTimeout(350);
    const name = `${form}-${state}-${v.name}`;
    await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 70, fullPage: true });
    manifest.push({ name, form, state, viewport: v.name, role });
  }
  await page.setViewportSize({ width: 820, height: 1180 });
}

test.beforeAll(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fx = await createFixture("gd");
  const admin = adminClient();
  for (const id of ["CAFE1", "CAFE2", "CAFE3"]) await admin.from("venue_compliance_forms").insert({ venue_id: fx.venueId, form_id: id, enabled: true });
});

test.afterAll(async () => {
  fs.writeFileSync(path.join(OUT, "..", "manifest.json"), JSON.stringify(manifest, null, 1));
  // the catalog as plain data, for the guide builder (functions such as defaultOn are dropped)
  fs.writeFileSync(path.join(OUT, "..", "forms.json"), JSON.stringify(FORMS, (_k, v) => (typeof v === "function" ? undefined : v), 1));
  await destroyFixture(fx);
});

async function startOfChecklistProgress(page: Page, label: string) {
  const row = page.locator("li", { hasText: label }).first();
  await row.getByRole("button", { name: "Pass", exact: true }).click();
}

for (const def of FORMS) {
  if (def.stages) continue; // staged forms have their own tests below
  const plan = PLANS[def.id]?.[0];
  if (!plan) continue;
  test(`guide shots ${def.id} ${def.title}`, async ({ page }) => {
    test.skip(!want(def.id), "GUIDE_ONLY");
    const role = FIXTURE_NAMES[plan.who];
    await loginStaff(page, fx, role);
    await openForm(page, fx, def.id);
    await shotAll(page, def.id, "empty", role);

    // in progress: the first answer only (a checklist: the first two items)
    const first = fieldsOf(def)[0];
    if (first.type === "checklist") {
      await startOfChecklistProgress(page, first.items[0].label);
      await startOfChecklistProgress(page, first.items[1].label);
    } else {
      await fillAll(page, def, null, plan.pass, 1);
    }
    await shotAll(page, def.id, "progress", role);

    // complete: everything answered, passing
    await openForm(page, fx, def.id);
    await fillAll(page, def, null, plan.pass);
    await shotAll(page, def.id, "complete", role);
    await saveRecord(page);
    await shotAll(page, def.id, "saved", role);

    if (plan.fail) {
      await openForm(page, fx, def.id);
      await fillAll(page, def, null, plan.fail);
      await expect(page.getByText("Write what you did about it before you save.")).toBeVisible();
      await shotAll(page, def.id, "fail", role);
      await page.locator("#fail-note").fill("Fixture note: dealt with it and told the manager");
      await shotAll(page, def.id, "failnote", role);
      await saveRecord(page);
      await shotAll(page, def.id, "failsaved", role);
    }
  });
}

test("guide shots B6 two stage cooling", async ({ page }) => {
  test.skip(!want("B6"), "GUIDE_ONLY");
  const def = FORM_BY_ID.B6;
  const role = FIXTURE_NAMES.kitchenHand;
  await loginStaff(page, fx, role);
  await openForm(page, fx, "B6");
  await shotAll(page, "B6", "empty", role);
  await openForm(page, fx, "B6", "start");
  await shotAll(page, "B6", "start-empty", role);
  await fillAll(page, def, def.stages![0], { item: "Fixture stock", start_temp_c: 85 });
  await shotAll(page, "B6", "start-complete", role);
  await saveRecord(page);
  await shotAll(page, "B6", "start-saved", role);
  await page.goto(`/${fx.slug}/forms/B6`);
  await shotAll(page, "B6", "waiting", role);
  await page.getByRole("link", { name: "2 hour check" }).click();
  await fillAll(page, def, def.stages![1], { temp_c: 18 });
  await shotAll(page, "B6", "twohour-complete", role);
  await saveRecord(page);
  await page.goto(`/${fx.slug}/forms/B6`);
  await page.getByRole("link", { name: "6 hour check" }).click();
  await fillAll(page, def, def.stages![2], { temp_c: 9 });
  await shotAll(page, "B6", "sixhour-fail", role);
  await page.locator("#fail-note").fill("Fixture note: threw the batch out and started again");
  await shotAll(page, "B6", "sixhour-failnote", role);
  await saveRecord(page);
  await shotAll(page, "B6", "sixhour-saved", role);
});

test("guide shots F7 allergen ticket", async ({ page }) => {
  test.skip(!want("F7"), "GUIDE_ONLY");
  const def = FORM_BY_ID.F7;
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await openForm(page, fx, "F7");
  await shotAll(page, "F7", "empty", FIXTURE_NAMES.waiter);
  await openForm(page, fx, "F7", "ticket");
  await shotAll(page, "F7", "ticket-empty", FIXTURE_NAMES.waiter);
  await fillAll(page, def, def.stages![0], { reference: "Table 4", dish: "Fixture burger", allergens: "Sesame", severity: "Allergy" });
  await shotAll(page, "F7", "ticket-complete", FIXTURE_NAMES.waiter);
  await saveRecord(page);
  await shotAll(page, "F7", "ticket-saved", FIXTURE_NAMES.waiter);
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  await page.goto(`/${fx.slug}/forms/F7`);
  await shotAll(page, "F7", "waiting", FIXTURE_NAMES.kitchenHand);
  await page.getByRole("link", { name: "Kitchen confirms" }).click();
  await fillAll(page, def, def.stages![1], { can_make: "Cannot make it safely" });
  await shotAll(page, "F7", "confirm-fail", FIXTURE_NAMES.kitchenHand);
  await page.locator("#fail-note").fill("Fixture note: told the table the sauce contains sesame");
  await shotAll(page, "F7", "confirm-failnote", FIXTURE_NAMES.kitchenHand);
  await saveRecord(page);
  await shotAll(page, "F7", "confirm-saved", FIXTURE_NAMES.kitchenHand);
});

test("guide shots F3 till reconciliation with the second signature", async ({ page }) => {
  test.skip(!want("F3"), "GUIDE_ONLY");
  const def = FORM_BY_ID.F3;
  const role = FIXTURE_NAMES.waiter;
  await loginStaff(page, fx, role);
  await openForm(page, fx, "F3");
  await shotAll(page, "F3", "empty", role);
  await fillAll(page, def, null, { expected_cash: 500, counted_cash: 500 });
  await shotAll(page, "F3", "progress", role);
  await page.locator("#cosign-who").selectOption({ label: FIXTURE_NAMES.bartender });
  await page.locator("#cosign-pin").fill("4821");
  await shotAll(page, "F3", "complete", role);
  await saveRecord(page);
  await shotAll(page, "F3", "saved", role);
  await openForm(page, fx, "F3");
  await fillAll(page, def, null, { expected_cash: 500, counted_cash: 470 });
  await shotAll(page, "F3", "fail", role);
  await page.locator("#fail-note").fill("Fixture note: recounted twice, till is short");
  await page.locator("#cosign-who").selectOption({ label: FIXTURE_NAMES.bartender });
  await page.locator("#cosign-pin").fill("4821");
  await shotAll(page, "F3", "failnote", role);
});

test("guide shots registers", async ({ page }) => {
  test.skip(!want("B1"), "GUIDE_ONLY");
  const role = FIXTURE_NAMES.kitchenHand;
  await loginStaff(page, fx, role);
  for (const id of ["B1", "B20"] as const) {
    const def = FORM_BY_ID[id];
    await openForm(page, fx, id);
    await shotAll(page, id, "empty", role);
    await fillAll(page, def, null, PLANS[id][0].pass);
    await shotAll(page, id, "complete", role);
    await saveRecord(page);
    await openForm(page, fx, id);
    await shotAll(page, id, "saved", role);
  }
});

test("guide shots hub by role, overdue and the owner screens", async ({ page }) => {
  test.skip(!!only && !only.has("HUB"), "GUIDE_ONLY");
  // 1. hub with nothing done yet, per role
  const roles: [string, string][] = [
    ["boh", FIXTURE_NAMES.kitchenHand],
    ["boh-manager", FIXTURE_NAMES.headChef],
    ["foh", FIXTURE_NAMES.waiter],
    ["bar", FIXTURE_NAMES.bartender],
    ["manager", FIXTURE_NAMES.dutyManager],
  ];
  for (const [key, name] of roles) {
    await loginStaff(page, fx, name);
    await page.goto(`/${fx.slug}/forms`);
    await expect(page.getByRole("heading", { name: "Compliance forms" })).toBeVisible({ timeout: 60_000 });
    await shotAll(page, "HUB", `${key}-notstarted`, name);
  }
  // 2. overdue: the same hub as if it were two days later (the clock seam; records are never backdated)
  const later = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  await page.goto(`/${fx.slug}/forms?asof=${encodeURIComponent(later)}`);
  await expect(page.getByRole("heading", { name: "Compliance forms" })).toBeVisible({ timeout: 60_000 });
  await shotAll(page, "HUB", "boh-overdue", FIXTURE_NAMES.kitchenHand);
  // 3. home tile
  await page.goto(`/${fx.slug}/home`);
  await page.waitForTimeout(2500);
  await shotAll(page, "HOME", "boh-tile", FIXTURE_NAMES.kitchenHand);
  // 4. the owner screens
  await loginOwner(page, fx);
  await page.goto(`/${fx.slug}/owner/forms`);
  await expect(page.getByRole("heading", { name: "Compliance forms" })).toBeVisible({ timeout: 60_000 });
  await shotAll(page, "OWNER", "forms-switches", FIXTURE_NAMES.owner);
  await page.goto(`/${fx.slug}/owner/compliance?asof=${encodeURIComponent(later)}`);
  await expect(page.getByRole("heading", { name: "Compliance overview" })).toBeVisible({ timeout: 60_000 });
  await shotAll(page, "OWNER", "overview-overdue", FIXTURE_NAMES.owner);
  await page.goto(`/${fx.slug}/owner/compliance/records`);
  await expect(page.getByRole("heading", { name: "Compliance records" })).toBeVisible({ timeout: 60_000 });
  await shotAll(page, "OWNER", "records", FIXTURE_NAMES.owner);
  await page.goto(`/${fx.slug}/owner/compliance/records?result=fail`);
  await shotAll(page, "OWNER", "records-fails", FIXTURE_NAMES.owner);
  // print layout (A4)
  await page.emulateMedia({ media: "print" });
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "OWNER-print-a4.jpg"), type: "jpeg", quality: 75, fullPage: true });
  manifest.push({ name: "OWNER-print-a4", form: "OWNER", state: "print", viewport: "a4", role: FIXTURE_NAMES.owner });
  await page.emulateMedia({ media: "screen" });
  await page.goto(`/${fx.slug}/owner/dashboard`);
  await page.waitForTimeout(3500);
  await shotAll(page, "OWNER", "dashboard", FIXTURE_NAMES.owner);
});

test("guide shots B2 temperature log", async ({ page }) => {
  test.skip(!want("B2"), "GUIDE_ONLY");
  const role = FIXTURE_NAMES.kitchenHand;
  await loginStaff(page, fx, role);
  await page.goto(`/${fx.slug}/temperature`);
  await expect(page.getByRole("heading", { name: "Temperature log" })).toBeVisible({ timeout: 60_000 });
  await shotAll(page, "B2", "empty", role);
  await page.locator(`#reading-${fx.unitIds.coolroom}`).fill("3.5");
  await shotAll(page, "B2", "progress", role);
  await page.locator(`#reading-${fx.unitIds.barfridge}`).fill("8");
  await shotAll(page, "B2", "fail", role);
  await page.locator(`#note-${fx.unitIds.barfridge}`).fill("Fixture note: moved the stock to the cool room");
  await page.locator(`#reading-${fx.unitIds.freezer}`).fill("-18");
  await page.locator(`#reading-${fx.unitIds.bain}`).fill("65");
  await shotAll(page, "B2", "failnote", role);
  await page.getByRole("button", { name: /^Save/ }).click();
  await expect(page.getByRole("status")).toContainText("saved", { timeout: 30_000 });
  await shotAll(page, "B2", "failsaved", role);
});
