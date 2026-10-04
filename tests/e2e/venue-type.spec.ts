import { test, expect } from "@playwright/test";
import { adminClient, createFixture, destroyFixture, loginOwner, type Fixture } from "./helpers/stage0";

// Venue type in the wizard (20261005070000, P27), through the real app on a disposable venue: the owner picks a type on the
// compliance setup step, the forms page shows the matching forms on by default with the reason, an explicit owner switch always
// wins over the type, and a venue that never chose a type keeps its older defaults.
test.describe.configure({ timeout: 600_000, mode: "serial" });
let fx: Fixture;

test.beforeAll(async () => {
  fx = await createFixture("vt");
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

const typeOf = async () => (await adminClient().from("venue_compliance_settings").select("venue_type").eq("venue_id", fx.venueId).single()).data?.venue_type;

async function chooseType(page: import("@playwright/test").Page, label: string) {
  await page.goto(`/${fx.slug}/owner/onboarding/compliance-setup`);
  const select = page.getByLabel("What kind of venue is this?");
  await expect(select).toBeVisible({ timeout: 90_000 });
  await select.selectOption({ label });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect.poll(typeOf, { timeout: 60_000 }).toBe(label.toLowerCase());
}

test("a venue with no type keeps the older defaults and the step shows the question unselected", async ({ page }) => {
  expect(await typeOf()).toBeNull();
  await loginOwner(page, fx);
  await page.goto(`/${fx.slug}/owner/forms`);
  await expect(page.getByRole("switch", { name: "Display cabinet temperatures" })).toHaveAttribute("aria-checked", "false", { timeout: 90_000 });
  await page.goto(`/${fx.slug}/owner/onboarding/compliance-setup`);
  await expect(page.getByLabel("What kind of venue is this?")).toHaveValue("", { timeout: 90_000 });
});

test("a cafe starts with the cafe forms on, shown with the reason", async ({ page }) => {
  await loginOwner(page, fx);
  await chooseType(page, "Cafe");
  await page.goto(`/${fx.slug}/owner/forms`);
  await expect(page.getByRole("switch", { name: "Display cabinet temperatures" })).toHaveAttribute("aria-checked", "true", { timeout: 90_000 });
  await expect(page.getByText("On by default. On for cafes.").first()).toBeVisible();
  // saving the step does not create activation rows: the forms follow the type until the owner chooses
  expect((await adminClient().from("venue_compliance_forms").select("form_id").eq("venue_id", fx.venueId)).data ?? []).toHaveLength(0);
});

test("an explicit owner switch beats the type, and survives a change of type", async ({ page }) => {
  await loginOwner(page, fx);
  await page.goto(`/${fx.slug}/owner/forms`);
  const sw = page.getByRole("switch", { name: "Display cabinet temperatures" });
  await expect(sw).toHaveAttribute("aria-checked", "true", { timeout: 90_000 });
  await sw.click();
  await expect(sw).toHaveAttribute("aria-checked", "false", { timeout: 60_000 });
  await chooseType(page, "Cafe");
  await page.goto(`/${fx.slug}/owner/forms`);
  await expect(page.getByRole("switch", { name: "Display cabinet temperatures" })).toHaveAttribute("aria-checked", "false", { timeout: 90_000 });
  await expect(page.getByText("Switched off by the owner").first()).toBeVisible();
  await chooseType(page, "Pub");
  expect(await typeOf()).toBe("pub");
  await page.goto(`/${fx.slug}/owner/forms`);
  await expect(page.getByRole("switch", { name: "Display cabinet temperatures" })).toHaveAttribute("aria-checked", "false", { timeout: 90_000 });
});

test("a pub starts with the bar forms on and the cafe forms back off; a bad type is refused", async ({ page }) => {
  // the fixture venue has no licence type, so the bar forms are on because of the type alone
  await adminClient().from("venue_licence_profile").update({ licence_type: null }).eq("venue_id", fx.venueId);
  await loginOwner(page, fx);
  await page.goto(`/${fx.slug}/owner/forms`);
  await expect(page.getByRole("switch", { name: "Beer line cleaning" })).toHaveAttribute("aria-checked", "true", { timeout: 90_000 });
  const bad = await page.request.post("/api/owner/onboarding/compliance-setup", { data: { units: [], highRiskActivities: [], offersAccommodation: false, tradeWasteAgreement: "yes", venueType: "nightclub" } });
  expect(bad.status()).toBe(400);
  expect(await typeOf()).toBe("pub");
  // an older client that sends no venueType leaves the stored type alone
  const old = await page.request.post("/api/owner/onboarding/compliance-setup", { data: { units: [], highRiskActivities: [], offersAccommodation: false, tradeWasteAgreement: "yes" } });
  expect(old.status()).toBe(200);
  expect(await typeOf()).toBe("pub");
});
