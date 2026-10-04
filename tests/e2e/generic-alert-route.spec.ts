import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { adminClient, createFixture, destroyFixture, loginStaff, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// Owner alerts for B3, B6 and B12 failures (20261005080000), through the real staff route on a disposable venue. The email flag
// is UNSET on the dev server, so this proves the data path only: one alert row per item per episode, other forms none, and
// NO email attempt (attempts stay 0). The deliberate send is tests/generic-alert-send.test.ts (to delivered@resend.dev only).
test.describe.configure({ timeout: 600_000, mode: "serial" });
let fx: Fixture;
test.beforeAll(async () => {
  fx = await createFixture("ge");
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

const alerts = async () =>
  (
    await adminClient()
      .from("compliance_alert_log")
      .select("submission_id, kind, email_sent_at, email_attempts, compliance_form_submissions(form_id)")
      .eq("venue_id", fx.venueId)
  ).data ?? [];
const byForm = (rows: Awaited<ReturnType<typeof alerts>>, id: string) => rows.filter((r) => (r.compliance_form_submissions as unknown as { form_id: string } | null)?.form_id === id);

test("failing B12, B3 and B6 records create one alert row per item per episode, with no email while the flag is unset", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  const save = (formId: string, data: Record<string, unknown>) =>
    page.request.post(`/api/staff/compliance/forms/${formId}`, { data: { clientRequestId: randomUUID(), ...data } });

  // B12 pest log: item = location
  const s1 = await save("B12", { values: { kind: "sighting", location: "Dry store" }, correctiveAction: "Called the contractor" });
  expect(s1.status()).toBe(200);
  expect((await s1.json()).failed).toBe(true);
  const s2 = await save("B12", { values: { kind: "sighting", location: "dry store" }, correctiveAction: "Set a trap" });
  expect(s2.status()).toBe(200);
  const s3 = await save("B12", { values: { kind: "sighting", location: "Cool room" }, correctiveAction: "Called the contractor" });
  expect(s3.status()).toBe(200);
  let rows = await alerts();
  expect(byForm(rows, "B12")).toHaveLength(2); // Dry store (once) and Cool room

  // B3 goods receiving: item = supplier and product
  const delivery = (product: string, temp: number) => ({
    values: { supplier: "Acme Meats", product, temp_type: "chilled", temp_c: temp, packaging: "pass", dates: "pass", decision: "rejected" },
    correctiveAction: "Rejected the delivery",
  });
  expect((await save("B3", delivery("Chicken", 9))).status()).toBe(200);
  expect((await save("B3", delivery("Chicken", 10))).status()).toBe(200); // same item, still failing: same episode
  expect((await save("B3", delivery("Fish", 12))).status()).toBe(200);
  rows = await alerts();
  expect(byForm(rows, "B3")).toHaveLength(2);

  // B6 two stage cooling: item = the batch
  const start = await save("B6", { stage: "start", values: { item: "Beef stew", start_temp_c: 85 } });
  expect(start.status()).toBe(200);
  const chainId = (await start.json()).chainId as string;
  expect(byForm(await alerts(), "B6")).toHaveLength(0);
  const two = await save("B6", { stage: "two_hour", chainId, values: { temp_c: 30 }, correctiveAction: "Moved to the blast chiller" });
  expect(two.status()).toBe(200);
  expect(byForm(await alerts(), "B6")).toHaveLength(1);
  const six = await save("B6", { stage: "six_hour", chainId, values: { temp_c: 12 }, correctiveAction: "Discarded the batch" });
  expect(six.status()).toBe(200);
  rows = await alerts();
  expect(byForm(rows, "B6")).toHaveLength(1); // the same batch: no second alert

  // every alert row is the generic kind, unsent, and no email was attempted (the flag is unset)
  expect(rows).toHaveLength(5);
  for (const r of rows) expect(r).toMatchObject({ kind: "generic_fail_episode", email_sent_at: null, email_attempts: 0 });
});
