import { test, expect, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import { adminClient, createFixture, destroyFixture, loginStaff, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// Phase 3 (launch-1): measure what a person really does to complete a compliance record, starting at the forms hub.
// A tap is one click. A keystroke is one typed character. Scrolls are counted separately and are not taps.
// The measured numbers are written to TAP_OUT (default scratch/launch-1-report/tap-counts.json) and quoted in the claims ledger.
test.describe.configure({ timeout: 600_000, mode: "serial" });
test.use({ viewport: { width: 820, height: 1180 } });

let fx: Fixture;
const results: Record<string, unknown> = {};

type Meter = { taps: number; keys: number; scrolls: number; steps: string[] };
const meter = (): Meter => ({ taps: 0, keys: 0, scrolls: 0, steps: [] });

async function tap(m: Meter, loc: Locator, what: string) {
  const target = loc.first();
  await target.waitFor({ state: "visible", timeout: 60_000 });
  const visible = await target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight;
  });
  if (!visible) { m.scrolls++; await target.evaluate((el) => el.scrollIntoView({ block: "center" })); }
  await target.click();
  m.taps++;
  m.steps.push(`tap: ${what}`);
}
async function typeInto(m: Meter, loc: Locator, text: string, what: string) {
  await tap(m, loc, `${what} (focus)`);
  await loc.first().pressSequentially(text);
  m.keys += text.length;
  m.steps.push(`type ${text.length} keys: ${what}`);
}
const hub = async (page: Page) => {
  await page.goto(`/${fx.slug}/forms`);
  await expect(page.getByRole("heading", { name: "Compliance forms" })).toBeVisible({ timeout: 60_000 });
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
};
const card = (page: Page, title: string) => page.locator("li", { hasText: title }).first().locator("a").first();
const finish = (name: string, m: Meter) => { results[name] = { taps: m.taps, keystrokes: m.keys, scrolls: m.scrolls, steps: m.steps }; };

test.beforeAll(async () => {
  fx = await createFixture("tp");
  await adminClient().from("venue_compliance_forms").insert({ venue_id: fx.venueId, form_id: "CAFE3", enabled: true });
});
test.afterAll(async () => {
  fs.writeFileSync(process.env.TAP_OUT ?? "scratch/launch-1-report/tap-counts.json", JSON.stringify(results, null, 2));
  await destroyFixture(fx);
});

test("(a) checklist form from the hub: Kitchen opening checklist, everything passes", async ({ page }) => {
  const m = meter();
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  await hub(page);
  await tap(m, card(page, "Kitchen opening checklist"), "hub card Kitchen opening checklist");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
  await tap(m, page.getByRole("button", { name: "Mark the rest as pass" }), "Mark the rest as pass");
  await tap(m, page.getByRole("button", { name: /^Save/ }), "Save");
  await expect(page.getByRole("status")).toContainText("saved", { timeout: 30_000 });
  finish("a_checklist_all_pass", m);
});

test("(b) pass or fail form from the hub: Coffee machine descale, required fields only and with the optional product typed", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  for (const variant of ["required_only", "with_product_typed"] as const) {
    const m = meter();
    await hub(page);
    await tap(m, card(page, "Coffee machine descale"), "hub card Coffee machine descale");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
    const group = page.locator("fieldset", { has: page.locator("legend", { hasText: "Machine descaled and rinsed" }) }).first();
    await tap(m, group.getByRole("button", { name: "Done", exact: true }), "Machine descaled and rinsed: Done");
    if (variant === "with_product_typed") await typeInto(m, page.locator("#f-product"), "Descaler", "Descaler used (optional text)");
    await tap(m, page.getByRole("button", { name: /^Save/ }), "Save");
    await expect(page.getByRole("status")).toContainText("saved", { timeout: 30_000 });
    finish("b_passfail_form_" + variant, m);
  }
});

test("(c) temperature reading with a typed value: one unit, then three more units in one save", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  const u = fx.unitIds;
  const field = (id: string) => page.locator("#reading-" + id);
  let m = meter();
  await hub(page);
  await tap(m, card(page, "Temperature log"), "hub card Temperature log");
  await field(u.coolroom).waitFor({ state: "visible", timeout: 60_000 });
  await typeInto(m, field(u.coolroom), "3.5", "Walk in cool room reading 3.5");
  await tap(m, page.getByRole("button", { name: /^Save/ }), "Save reading");
  await expect(page.getByRole("status")).toContainText("1 reading saved.", { timeout: 30_000 });
  finish("c_temperature_one_unit", m);

  m = meter();
  await hub(page);
  await tap(m, card(page, "Temperature log"), "hub card Temperature log");
  await field(u.freezer).waitFor({ state: "visible", timeout: 60_000 });
  await tap(m, page.getByRole("button", { name: "Make Chest freezer reading negative or positive" }), "minus sign for the freezer reading");
  await typeInto(m, field(u.freezer), "18", "Chest freezer reading minus 18");
  await typeInto(m, field(u.bain), "65", "Bain marie reading 65");
  await typeInto(m, field(u.barfridge), "4", "Bar fridge reading 4");
  await tap(m, page.getByRole("button", { name: /^Save/ }), "Save 3 readings");
  await expect(page.getByRole("status")).toContainText("3 readings saved", { timeout: 30_000 });
  finish("c_temperature_three_units_one_save", m);
});

test("(d) failed reading with the forced corrective note: one quick note tap, and a typed note", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  const admin = adminClient();
  const ids: string[] = [];
  for (const name of ["Fixture drinks fridge one", "Fixture drinks fridge two"]) {
    const { data } = await admin.from("venue_refrigeration_units").insert({ venue_id: fx.venueId, name, unit_type: "cold", min_temp_c: null, max_temp_c: 5 }).select("id").single();
    ids.push(data!.id);
  }
  for (const [i, variant] of (["quick", "typed"] as const).entries()) {
    const m = meter();
    await hub(page);
    await tap(m, card(page, "Temperature log"), "hub card Temperature log");
    const input = page.locator("#reading-" + ids[i]);
    await input.waitFor({ state: "visible", timeout: 60_000 });
    await typeInto(m, input, "9", "out of range reading 9");
    await expect(page.getByRole("button", { name: /^Save/ })).toBeDisabled();
    if (variant === "quick") {
      await tap(m, page.locator("#note-" + ids[i]).locator("xpath=..").getByRole("button", { name: "Moved food to another unit" }), "quick note: Moved food to another unit");
    } else {
      await typeInto(m, page.locator("#note-" + ids[i]), "Moved the food to the walk in", "corrective note typed (29 characters)");
    }
    await tap(m, page.getByRole("button", { name: /^Save/ }), "Save reading");
    await expect(page.getByRole("status")).toContainText("flagged for the owner", { timeout: 30_000 });
    finish("d_failed_reading_" + variant + "_note", m);
  }
});
