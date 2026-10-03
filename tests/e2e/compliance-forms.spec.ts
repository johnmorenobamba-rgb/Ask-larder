import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { FORMS, FORM_BY_ID } from "../../src/lib/compliance/engine/forms";
import type { FormDef, StageDef } from "../../src/lib/compliance/engine/types";
import { adminClient, createFixture, destroyFixture, loginStaff, PIN, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";
import { PLANS, fillAll as fillAllShared, openForm as openFormShared, saveRecord, type Sample } from "./helpers/formDriver";

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

const openForm = (page: Page, id: string, stage?: string, chain?: string) => openFormShared(page, fx, id, stage, chain);

async function failPath(page: Page, def: FormDef, stage: StageDef | null, sample: Sample) {
  await fillAllShared(page, def, stage, sample);
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
      await fillAllShared(page, def, null, plan.pass);
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
  await fillAllShared(page, def, def.stages![0], { item: "Fixture stock", start_temp_c: 85 });
  await saveRecord(page);
  await page.goto(`/${fx.slug}/forms/B6`);
  await expect(page.getByText("Fixture stock")).toBeVisible();
  await page.getByRole("link", { name: "2 hour check" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("2 hour check");
  await fillAllShared(page, def, def.stages![1], { temp_c: 18 });
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
  await fillAllShared(page, def, def.stages![0], { reference: "Table 4", dish: "Fixture burger", allergens: "Sesame", severity: "Allergy" });
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
  await fillAllShared(page, def, null, { expected_cash: 500, counted_cash: 500 });
  await expect(page.getByRole("button", { name: /^Save/ })).toBeDisabled();
  await expect(page.getByText("A second person must choose their name and enter their PIN.")).toBeVisible();
  // P28: only manager tier people can countersign, so a frontline bartender is not offered at all
  const offered = (await page.locator("#cosign-who option").allInnerTexts()).join("|");
  expect(offered).toContain(FIXTURE_NAMES.dutyManager);
  expect(offered).not.toContain(FIXTURE_NAMES.bartender);
  expect(offered).not.toContain(FIXTURE_NAMES.kitchenHand);
  await page.locator("#cosign-who").selectOption({ label: FIXTURE_NAMES.dutyManager });
  await page.locator("#cosign-pin").fill("0000");
  await page.getByRole("button", { name: /^Save/ }).click();
  await expect(page.getByText("That PIN didn't match.")).toBeVisible();
  await page.locator("#cosign-pin").fill(PIN);
  await saveRecord(page);
  const { data } = await adminClient().from("compliance_form_submissions").select("payload").eq("venue_id", fx.venueId).eq("form_id", "F3").order("submitted_at", { ascending: false }).limit(1);
  expect((data?.[0]?.payload as { cosigned_by_name?: string }).cosigned_by_name).toBe(FIXTURE_NAMES.dutyManager);
  // out by more than the tolerance fails and needs a note
  await openForm(page, "F3");
  await fillAllShared(page, def, null, { expected_cash: 500, counted_cash: 470 });
  await page.locator("#cosign-who").selectOption({ label: FIXTURE_NAMES.dutyManager });
  await page.locator("#cosign-pin").fill(PIN);
  await expect(page.getByRole("button", { name: /^Save/ })).toBeDisabled();
  await page.locator("#fail-note").fill("Fixture: recounted twice, till is short");
  await saveRecord(page);
  await expect(page.getByRole("status")).toContainText("flagged for the owner");
});

test("P28: the till countersigner must be an active manager tier person of this venue (direct API calls)", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  const post = (cosign: { staffId: string; pin: string }) =>
    page.request.post("/api/staff/compliance/forms/F3", { data: { clientRequestId: randomUUID(), values: { expected_cash: 500, counted_cash: 500 }, cosign } });
  const count = async () => (await adminClient().from("compliance_form_submissions").select("id", { count: "exact", head: true }).eq("venue_id", fx.venueId).eq("form_id", "F3")).count ?? 0;
  const before = await count();
  // a frontline colleague with the right PIN is refused, and so is the person signing for themselves
  expect((await post({ staffId: fx.staff.bartender.id, pin: PIN })).status()).toBe(403);
  expect((await post({ staffId: fx.staff.kitchenHand.id, pin: PIN })).status()).toBe(403);
  expect((await post({ staffId: fx.staff.waiter.id, pin: PIN })).status()).toBe(400);
  expect(await count()).toBe(before);
  // a deactivated manager is refused too
  await adminClient().from("app_users").update({ deactivated_at: new Date().toISOString() }).eq("id", fx.staff.dutyManager.id);
  expect((await post({ staffId: fx.staff.dutyManager.id, pin: PIN })).status()).toBe(403);
  await adminClient().from("app_users").update({ deactivated_at: null }).eq("id", fx.staff.dutyManager.id);
  // an active manager tier person with the right PIN is accepted
  expect((await post({ staffId: fx.staff.headChef.id, pin: PIN })).status()).toBe(200);
  expect(await count()).toBe(before + 1);
});

test("a correction links to the latest record only", async ({ page }) => {
  const def = FORM_BY_ID.B10;
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  await openForm(page, "B10");
  await expect(page.getByRole("button", { name: "Correct this record" })).toHaveCount(1);
  await page.getByRole("button", { name: "Correct this record" }).click();
  await expect(page.getByText("You are correcting the latest record.")).toBeVisible();
  await fillAllShared(page, def, null, { items: "ALL" });
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
  await fillAllShared(page, def, null, { status: "No longer used" });
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
    values: { item: "Forged umbrella", found_where: "Table 1", status: "held" },
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
  expect((await post("F13", { clientRequestId: randomUUID(), values: { item: "x", found_where: "y", status: "held", sneaky: 1 } })).status()).toBe(400);
  expect((await post("F13", { clientRequestId: randomUUID(), values: { item: "x", found_where: "y", status: "bogus" } })).status()).toBe(400);
  expect((await post("NOPE", { clientRequestId: randomUUID(), values: {} })).status()).toBe(404);
  expect((await post("B2", { clientRequestId: randomUUID(), values: {} })).status()).toBe(404);
  // idempotent replay: the same request id saves once
  const id = randomUUID();
  const vals = { item: "Replay umbrella", found_where: "Bar", status: "held" };
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
