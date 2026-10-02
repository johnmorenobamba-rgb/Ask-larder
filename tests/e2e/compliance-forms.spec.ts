import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { FORMS, FORM_BY_ID } from "../../src/lib/compliance/engine/forms";
import type { FieldDef, FormDef, StageDef } from "../../src/lib/compliance/engine/types";
import { adminClient, createFixture, destroyFixture, loginStaff, PIN, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// Stage 0 compliance forms, end to end, on a DISPOSABLE fixture venue modelled on the demo pub (see
// helpers/stage0.ts). For every generic form: the allowed role fills it, a pass saves and the hub shows
// it Done, a fail forces a note (Save is disabled until it is written) and flags the record. Email is
// never turned on. The demo venue and every real venue are never touched.
test.describe.configure({ timeout: 300_000 });
test.describe.configure({ mode: "serial" });

let fx: Fixture;

test.beforeAll(async () => {
  fx = await createFixture("s0");
  // cafe pack forms are off by default: the owner would switch them on, here the service role does
  const admin = adminClient();
  for (const id of ["CAFE1", "CAFE2", "CAFE3"]) await admin.from("venue_compliance_forms").insert({ venue_id: fx.venueId, form_id: id, enabled: true });
});

test.afterAll(async () => {
  await destroyFixture(fx);
});

type Sample = Record<string, string | number | "ALL" | { failItem: number }>;
type Plan = { who: keyof typeof FIXTURE_NAMES; stage?: string; pass: Sample; fail?: Sample };

const PLANS: Record<string, Plan[]> = {
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

function fieldsOf(def: FormDef, stage?: StageDef | null): FieldDef[] {
  return stage ? stage.fields : def.fields;
}

async function fillField(page: Page, f: FieldDef, v: string | number | "ALL" | { failItem: number }) {
  if (f.type === "checklist") {
    await page.getByRole("button", { name: "Mark the rest as pass" }).click();
    if (typeof v === "object") {
      const label = f.items[v.failItem]?.label;
      const row = page.locator("li", { hasText: label }).first();
      await row.getByRole("button", { name: "Fail", exact: true }).click();
    }
    return;
  }
  if (f.type === "passfail" || f.type === "choice") {
    const group = page.locator("fieldset", { has: page.locator("legend", { hasText: f.label }) }).first();
    await group.getByRole("button", { name: String(v), exact: true }).click();
    return;
  }
  if (f.type === "time") {
    await page.getByRole("button", { name: "Now" }).click();
    return;
  }
  await page.locator(`#f-${f.key}`).fill(String(v));
}

async function openForm(page: Page, id: string, stage?: string, chain?: string) {
  const q = stage ? `?stage=${stage}${chain ? `&chain=${chain}` : ""}` : "";
  await page.goto(`/${fx.slug}/forms/${id}${q}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
}

async function fillAll(page: Page, def: FormDef, stage: StageDef | null, sample: Sample) {
  for (const f of fieldsOf(def, stage)) {
    if (sample[f.key] === undefined) continue;
    await fillField(page, f, sample[f.key]);
  }
}

async function saveRecord(page: Page) {
  const btn = page.getByRole("button", { name: /^Save/ });
  await expect(btn).toBeEnabled({ timeout: 15_000 });
  await btn.click();
  await expect(page.getByRole("status")).toContainText("saved", { timeout: 30_000 });
}

async function failPath(page: Page, def: FormDef, stage: StageDef | null, sample: Sample) {
  await fillAll(page, def, stage, sample);
  await expect(page.locator('p[aria-live="polite"]').filter({ hasText: /^Fail\./ })).toBeVisible();
  // Save is disabled until the note is written, and the bar says why
  await expect(page.getByRole("button", { name: /^Save/ })).toBeDisabled();
  await expect(page.getByText("Write what you did about it before you save.")).toBeVisible();
  await page.locator("#fail-note").fill("Fixture note: dealt with it and told the manager");
}

async function hubCard(page: Page, title: string) {
  await page.goto(`/${fx.slug}/forms`);
  await expect(page.getByRole("heading", { name: "Compliance forms" })).toBeVisible({ timeout: 60_000 });
  return page.locator("li", { hasText: title }).first();
}

for (const def of FORMS) {
  const plans = PLANS[def.id];
  if (!plans) continue;
  test(`${def.id} ${def.title}: pass saves and the hub shows it; a fail forces a note`, async ({ page }) => {
    for (const plan of plans) {
      await loginStaff(page, fx, FIXTURE_NAMES[plan.who]);
      await openForm(page, def.id);
      await fillAll(page, def, null, plan.pass);
      if (def.fail.length > 0) await expect(page.locator('p[aria-live="polite"]').filter({ hasText: /^Pass\./ })).toBeVisible();
      await saveRecord(page);
      if (def.kind !== "register" && def.cadence !== "event") {
        const card = await hubCard(page, def.title);
        await expect(card).toContainText("Done");
      }
      if (plan.fail) {
        await openForm(page, def.id);
        await failPath(page, def, null, plan.fail);
        await saveRecord(page);
        await expect(page.getByRole("status")).toContainText("flagged for the owner");
      }
    }
  });
}

test("B6 two stage cooling: start, 2 hour check, 6 hour check, and a failing check needs a note", async ({ page }) => {
  const def = FORM_BY_ID.B6;
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  await openForm(page, "B6", "start");
  await fillAll(page, def, def.stages![0], { item: "Fixture stock", start_temp_c: 85 });
  await saveRecord(page);
  await page.goto(`/${fx.slug}/forms/B6`);
  await expect(page.getByText("Fixture stock")).toBeVisible();
  await page.getByRole("link", { name: "2 hour check" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("2 hour check");
  await fillAll(page, def, def.stages![1], { temp_c: 18 });
  await saveRecord(page);
  await page.goto(`/${fx.slug}/forms/B6`);
  await page.getByRole("link", { name: "6 hour check" }).click();
  await failPath(page, def, def.stages![2], { temp_c: 9 });
  await saveRecord(page);
  await expect(page.getByRole("status")).toContainText("flagged for the owner");
  await page.goto(`/${fx.slug}/forms/B6`);
  await expect(page.getByText("Nothing is waiting.")).toBeVisible();
});

test("F7 allergen ticket: front of house logs it, only the kitchen can confirm it", async ({ page }) => {
  const def = FORM_BY_ID.F7;
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await openForm(page, "F7", "ticket");
  await fillAll(page, def, def.stages![0], { reference: "Table 4", dish: "Fixture burger", allergens: "Sesame", severity: "Allergy" });
  await saveRecord(page);
  await page.goto(`/${fx.slug}/forms/F7`);
  await expect(page.getByText("Table 4: Fixture burger")).toBeVisible();
  await expect(page.getByText("Waiting for the kitchen.")).toBeVisible();
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  await page.goto(`/${fx.slug}/forms/F7`);
  await page.getByRole("link", { name: "Kitchen confirms" }).click();
  await failPath(page, def, def.stages![1], { can_make: "Cannot make it safely" });
  await saveRecord(page);
  await expect(page.getByRole("status")).toContainText("flagged for the owner");
});

test("F3 till reconciliation needs a second person with a correct PIN", async ({ page }) => {
  const def = FORM_BY_ID.F3;
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await openForm(page, "F3");
  await fillAll(page, def, null, { expected_cash: 500, counted_cash: 500 });
  await expect(page.getByRole("button", { name: /^Save/ })).toBeDisabled();
  await expect(page.getByText("A second person must choose their name and enter their PIN.")).toBeVisible();
  await page.locator("#cosign-who").selectOption({ label: FIXTURE_NAMES.bartender });
  await page.locator("#cosign-pin").fill("0000");
  await page.getByRole("button", { name: /^Save/ }).click();
  await expect(page.getByRole("alert")).toContainText("That PIN didn't match.");
  await page.locator("#cosign-pin").fill(PIN);
  await saveRecord(page);
  const { data } = await adminClient().from("compliance_form_submissions").select("payload").eq("venue_id", fx.venueId).eq("form_id", "F3").order("submitted_at", { ascending: false }).limit(1);
  expect((data?.[0]?.payload as { cosigned_by_name?: string }).cosigned_by_name).toBe(FIXTURE_NAMES.bartender);
  // out by more than the tolerance fails and needs a note
  await openForm(page, "F3");
  await fillAll(page, def, null, { expected_cash: 500, counted_cash: 470 });
  await page.locator("#cosign-who").selectOption({ label: FIXTURE_NAMES.bartender });
  await page.locator("#cosign-pin").fill(PIN);
  await expect(page.getByRole("button", { name: /^Save/ })).toBeDisabled();
  await page.locator("#fail-note").fill("Fixture: recounted twice, till is short");
  await saveRecord(page);
  await expect(page.getByRole("status")).toContainText("flagged for the owner");
});

test("a correction links to the latest record only", async ({ page }) => {
  const def = FORM_BY_ID.B10;
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  await openForm(page, "B10");
  await expect(page.getByRole("button", { name: "Correct this record" })).toHaveCount(1);
  await page.getByRole("button", { name: "Correct this record" }).click();
  await expect(page.getByText("You are correcting the latest record.")).toBeVisible();
  await fillAll(page, def, null, { items: "ALL" });
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(page.getByRole("status")).toContainText("saved", { timeout: 30_000 });
  await openForm(page, "B10");
  await expect(page.getByRole("button", { name: "Correct this record" })).toHaveCount(1);
});

test("registers keep the latest row per name and updating retires a supplier", async ({ page }) => {
  const def = FORM_BY_ID.B1;
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  await openForm(page, "B1");
  await expect(page.getByText("Fixture Fresh Fish Co")).toBeVisible();
  await page.getByRole("button", { name: "Update" }).first().click();
  await fillAll(page, def, null, { status: "No longer used" });
  await saveRecord(page);
  await openForm(page, "B1");
  await expect(page.getByText("(no longer used)")).toBeVisible();
});

test("access: FOH staff cannot open or post a BOH form; a forged body is ignored; a switched off form is refused", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await page.goto(`/${fx.slug}/forms/B5`);
  await expect(page).toHaveURL(new RegExp(`/${fx.slug}/forms$`));
  const post = (formId: string, data: unknown) => page.request.post(`/api/staff/compliance/forms/${formId}`, { data });
  const denied = await post("B5", { clientRequestId: randomUUID(), values: { item: "x", core_temp_c: 80 } });
  expect(denied.status()).toBe(403);
  // a body with a forged staff id, venue id, flag, audience and time is ignored: the record is stamped by the session
  const sub = await post("F13", {
    clientRequestId: randomUUID(),
    staffId: fx.staff.kitchenHand.id,
    venueId: randomUUID(),
    submittedBy: fx.staff.kitchenHand.id,
    outOfRange: true,
    visibleToRoles: ["BOH"],
    submittedAt: "2020-01-01T00:00:00Z",
    rules: { version: 1, fields: [], fail: [] },
    values: { item: "Forged umbrella", found_where: "Table 1", status: "Held at the venue" },
  });
  expect(sub.status()).toBe(200);
  const { data: row } = await adminClient()
    .from("compliance_form_submissions")
    .select("submitted_by, venue_id, out_of_range, visible_to_roles, submitted_at")
    .eq("venue_id", fx.venueId)
    .eq("form_id", "F13")
    .contains("payload", { values: { item: "Forged umbrella" } })
    .single();
  expect(row?.submitted_by).toBe(fx.staff.waiter.id);
  expect(row?.venue_id).toBe(fx.venueId);
  expect(row?.out_of_range).toBe(false);
  expect(row?.visible_to_roles).toEqual(["FOH"]);
  expect(new Date(row!.submitted_at).getFullYear()).toBeGreaterThanOrEqual(2026);
  // unknown field and bad values are refused
  expect((await post("F13", { clientRequestId: randomUUID(), values: { item: "x", found_where: "y", status: "Held at the venue", sneaky: 1 } })).status()).toBe(400);
  expect((await post("F13", { clientRequestId: randomUUID(), values: { item: "x", found_where: "y", status: "bogus" } })).status()).toBe(400);
  expect((await post("NOPE", { clientRequestId: randomUUID(), values: {} })).status()).toBe(404);
  expect((await post("B2", { clientRequestId: randomUUID(), values: {} })).status()).toBe(404);
  // idempotent replay: the same request id saves once
  const id = randomUUID();
  const vals = { item: "Replay umbrella", found_where: "Bar", status: "Held at the venue" };
  expect((await post("F13", { clientRequestId: id, values: vals })).status()).toBe(200);
  const again = await post("F13", { clientRequestId: id, values: vals });
  expect(again.status()).toBe(200);
  expect((await again.json()).inserted).toBe(false);
  expect((await post("F13", { clientRequestId: id, values: { ...vals, item: "Different" } })).status()).toBe(409);
  // switched off by the owner: refused
  await adminClient().from("venue_compliance_forms").insert({ venue_id: fx.venueId, form_id: "F13", enabled: false });
  expect((await post("F13", { clientRequestId: randomUUID(), values: vals })).status()).toBe(403);
  await adminClient().from("venue_compliance_forms").update({ enabled: true }).eq("venue_id", fx.venueId).eq("form_id", "F13");
});
