import { expect, type Locator, type Page } from "@playwright/test";
import type { FieldDef, FormDef, StageDef } from "../../../src/lib/compliance/engine/types";
import type { FIXTURE_NAMES, Fixture } from "./stage0";

// Drives the generic staff form UI from the catalog. Shared by the forms spec and the guide screenshots.

export type SampleValue = string | number | "ALL" | { failItem: number };
export type Sample = Record<string, SampleValue>;
export type Plan = { who: keyof typeof FIXTURE_NAMES; pass: Sample; fail?: Sample };

export const PLANS: Record<string, Plan[]> = {
  B10: [{ who: "kitchenHand", pass: { items: "ALL" }, fail: { items: { failItem: 0 } } }],
  B11: [{ who: "kitchenHand", pass: { items: "ALL" }, fail: { items: { failItem: 1 } } }],
  F1: [{ who: "waiter", pass: { items: "ALL" }, fail: { items: { failItem: 0 } } }],
  F2: [{ who: "bartender", pass: { items: "ALL" }, fail: { items: { failItem: 2 } } }],
  B9: [{ who: "kitchenHand", pass: { items: "ALL" }, fail: { items: { failItem: 0 } } }],
  F8: [{ who: "waiter", pass: { items: "ALL" }, fail: { items: { failItem: 1 } } }],
  F6: [{ who: "waiter", pass: { items: "ALL" }, fail: { items: { failItem: 0 } } }],
  BAR3: [{ who: "bartender", pass: { items: "ALL", cool_room_temp_c: 8 }, fail: { items: { failItem: 0 } } }],
  BAR2: [
    {
      who: "bartender",
      pass: { wash_temp_c: 60, rinse_temp_c: 85, temps_ok: "Matches", chemicals_ok: "Topped up", filter_ok: "Clean" },
      fail: { wash_temp_c: 60, rinse_temp_c: 85, temps_ok: "Matches", chemicals_ok: "Topped up", filter_ok: "Needs cleaning" },
    },
  ],
  BAR1: [
    {
      who: "bartender",
      pass: { lines: "Lines 1 to 4", chemical: "Line cleaner", contact_minutes: 20, rinse_ok: "Rinsed clear" },
      fail: { lines: "Lines 1 to 4", chemical: "Line cleaner", contact_minutes: 20, rinse_ok: "Not clear" },
    },
  ],
  CAFE1: [{ who: "waiter", pass: { cabinet: "Cabinet 1", mode: "Cold food", temp_c: 4 }, fail: { cabinet: "Cabinet 2", mode: "Cold food", temp_c: 8 } }],
  CAFE2: [{ who: "waiter", pass: { items: "ALL" }, fail: { items: { failItem: 0 } } }],
  CAFE3: [{ who: "waiter", pass: { descaled: "Done", product: "Descaler" }, fail: { descaled: "Not done" } }],
  B4: [{ who: "kitchenHand", pass: { thermometer: "Probe 1", ice_c: 0, boil_c: 100 }, fail: { thermometer: "Probe 2", ice_c: 3, boil_c: 100 } }],
  B3: [
    {
      who: "kitchenHand",
      pass: { supplier: "Fixture Fresh Foods", product: "Chicken thighs", temp_type: "Chilled", temp_c: 3, packaging: "Good", dates: "In date", decision: "Accepted" },
      fail: { supplier: "Fixture Fresh Foods", product: "Chicken thighs", temp_type: "Chilled", temp_c: 8, packaging: "Good", dates: "In date", decision: "Rejected" },
    },
  ],
  B5: [{ who: "kitchenHand", pass: { item: "Chicken burger", core_temp_c: 80 }, fail: { item: "Chicken burger", core_temp_c: 70 } }],
  B7: [{ who: "kitchenHand", pass: { item: "Beef ragu", core_temp_c: 80 }, fail: { item: "Beef ragu", core_temp_c: 65 } }],
  B8: [
    {
      who: "kitchenHand",
      pass: { item: "Sauces", time_out: "now", outcome: "Used or sold within 2 hours" },
      fail: { item: "Sauces", time_out: "now", outcome: "Thrown out" },
    },
  ],
  B12: [{ who: "kitchenHand", pass: { kind: "Trap check, nothing found", location: "Dry store" }, fail: { kind: "Pest sighting", location: "Dry store", detail: "One cockroach" } }],
  B13: [{ who: "kitchenHand", pass: { contractor: "Fixture Waste Co", volume_litres: 500, docket: "D1001" } }],
  B17: [{ who: "kitchenHand", pass: { issue: "Fridge door left open overnight", action_taken: "Checked temperatures and threw out one tray" } }],
  B18: [{ who: "kitchenHand", pass: { equipment: "Walk in cool room", fault: "Door seal torn", status: "Reported" } }],
  F10: [{ who: "bartender", pass: { outcome: "Service refused", signs: "Slurred speech and unsteady", action: "Offered water, explained politely" } }],
  F13: [{ who: "waiter", pass: { item: "Black umbrella", found_where: "Table 6", status: "Held at the venue" } }],
  B1: [{ who: "kitchenHand", pass: { name: "Fixture Fresh Fish Co", address: "1 Test Street", phone: "0300 000 000", status: "Active" } }],
  B20: [{ who: "kitchenHand", pass: { product: "Fixture Sanitiser", use: "Benches", dilution: "1 to 100", sds: "Yes", status: "Active" } }],
};

export function fieldsOf(def: FormDef, stage?: StageDef | null): FieldDef[] {
  return stage ? stage.fields : def.fields;
}

/** Scrolls an element to the middle of the screen, then clicks it: the sticky Save bar can cover the bottom edge. */
async function centreClick(loc: Locator) {
  await loc.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await loc.click();
}

export async function fillField(page: Page, f: FieldDef, v: SampleValue) {
  if (f.type === "checklist") {
    await centreClick(page.getByRole("button", { name: "Mark the rest as pass" }));
    if (typeof v === "object") {
      const label = f.items[v.failItem]?.label;
      const row = page.locator("li", { hasText: label }).first();
      await centreClick(row.getByRole("button", { name: "Fail", exact: true }));
    }
    return;
  }
  if (f.type === "passfail" || f.type === "choice") {
    const group = page.locator("fieldset", { has: page.locator("legend", { hasText: f.label }) }).first();
    await centreClick(group.getByRole("button", { name: String(v), exact: true }));
    return;
  }
  if (f.type === "time") {
    await centreClick(page.getByRole("button", { name: "Now" }));
    return;
  }
  const input = page.locator(`#f-${f.key}`);
  await input.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await input.fill(String(v));
}

export async function fillAll(page: Page, def: FormDef, stage: StageDef | null, sample: Sample, only?: number) {
  const fields = fieldsOf(def, stage).filter((f) => sample[f.key] !== undefined);
  for (const f of only === undefined ? fields : fields.slice(0, only)) await fillField(page, f, sample[f.key]);
}

export async function openForm(page: Page, fx: Fixture, id: string, stage?: string, chain?: string, extra = "") {
  const q = stage ? `?stage=${stage}${chain ? `&chain=${chain}` : ""}${extra}` : extra ? `?${extra.replace(/^&/, "")}` : "";
  await page.goto(`/${fx.slug}/forms/${id}${q}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
  // the app uses smooth scrolling, which races scripted clicks: switch it off for the test
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
}

export async function saveRecord(page: Page) {
  const btn = page.getByRole("button", { name: /^Save/ });
  await expect(btn).toBeEnabled({ timeout: 15_000 });
  await btn.click();
  await expect(page.getByRole("status")).toContainText("saved", { timeout: 30_000 });
}
