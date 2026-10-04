import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { adminClient, createFixture, destroyFixture, loginOwner, loginStaff, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";
import { localMidnightInstant } from "../../src/lib/compliance/engine/due";

// P23: closing forms use the venue trading day (cutoff default 5am). A closing form saved now is shown as Done
// at 2am the next morning (still the same trading day) and as Not started at 10am (a new day). Uses the dev only
// ?asof= clock so no record is ever backdated. Disposable fixture venue; Melbourne time zone.
test.describe.configure({ timeout: 600_000, mode: "serial" });

let fx: Fixture;
const TZ = "Australia/Melbourne";
test.beforeAll(async () => {
  fx = await createFixture("td");
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

function localDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
const asofAt = (hoursAfterNextMidnight: number) => new Date(new Date(localMidnightInstant(localDate(new Date()), TZ, 1)).getTime() + hoursAfterNextMidnight * 3600_000).toISOString();

async function b11Status(page: import("@playwright/test").Page, asof: string) {
  await page.goto(`/${fx.slug}/forms?asof=${encodeURIComponent(asof)}`);
  await expect(page.getByRole("heading", { name: "Compliance forms" })).toBeVisible({ timeout: 90_000 });
  const card = page.locator("li", { hasText: "Kitchen closing checklist" }).first();
  await expect(card).toBeVisible();
  return (await card.innerText()).replace(/\s+/g, " ").toLowerCase(); // the chips are uppercase by CSS
}

test("a closing form saved today is Done at 2am tomorrow and Not started at 10am tomorrow", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  const items = Object.fromEntries(["stored", "fridge", "cooling", "clean", "floors", "bins", "off", "doors"].map((k) => [k, "pass"]));
  const res = await page.request.post("/api/staff/compliance/forms/B11", { data: { clientRequestId: randomUUID(), values: { items } } });
  expect(res.status()).toBe(200);
  expect(await b11Status(page, asofAt(2))).toContain("done");
  const morning = await b11Status(page, asofAt(10));
  expect(morning).toContain("not started");
  expect(morning).not.toContain("overdue");
});

test("the owner can change the cutoff; zero means the calendar day; bad values and frontline staff are refused", async ({ page }) => {
  await loginOwner(page, fx);
  const patch = (hour: unknown) => page.request.patch("/api/owner/compliance/settings", { data: { tradingDayCutoffHour: hour } });
  expect((await patch(13)).status()).toBe(400);
  expect((await patch(-1)).status()).toBe(400);
  expect((await patch("5")).status()).toBe(400);
  expect((await patch(0)).status()).toBe(200);
  const { data } = await adminClient().from("venue_compliance_settings").select("trading_day_cutoff_hour").eq("venue_id", fx.venueId).single();
  expect(data?.trading_day_cutoff_hour).toBe(0);
  // with a zero cutoff the calendar day applies: 2am tomorrow is a new day, so the form is no longer Done
  await loginStaff(page, fx, FIXTURE_NAMES.kitchenHand);
  expect(await b11Status(page, asofAt(2))).toContain("not started");
  await loginOwner(page, fx);
  expect((await patch(5)).status()).toBe(200);
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  const denied = await page.request.patch("/api/owner/compliance/settings", { data: { tradingDayCutoffHour: 7 } });
  expect(denied.status()).toBe(403);
  const { data: after } = await adminClient().from("venue_compliance_settings").select("trading_day_cutoff_hour").eq("venue_id", fx.venueId).single();
  expect(after?.trading_day_cutoff_hour).toBe(5);
});
