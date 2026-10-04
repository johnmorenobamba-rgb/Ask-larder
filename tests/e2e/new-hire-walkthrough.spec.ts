import { test, expect } from "@playwright/test";
import { adminClient, createFixture, destroyFixture, loginStaff, nativeClick, FIXTURE_NAMES, type Fixture } from "./helpers/stage0";

// New hire walkthrough on a DISPOSABLE venue (replaces the stale phase2 and phase3 smoke specs, which drove a persistent seeded
// venue whose PIN is no longer known): welcome, role select, open a module, read both sections, answer the check question,
// completion, then the e-signature screen and the completion screen. Nothing here touches an existing venue.
test.describe.configure({ timeout: 600_000, mode: "serial" });
let fx: Fixture;

test.beforeAll(async () => {
  fx = await createFixture("nh");
  const admin = adminClient();
  const { data: mod, error } = await admin.from("modules").insert({ venue_id: fx.venueId, title: "Smoke Test Module", status: "live", version: 1 }).select("id").single();
  if (error) throw error;
  await admin.from("module_sections").insert([
    { module_id: mod!.id, section_order: 1, content: "Wash your hands before you start." },
    { module_id: mod!.id, section_order: 2, content: "Label and date everything that goes in the fridge." },
  ]).throwOnError();
  await admin.from("check_questions").insert({ module_id: mod!.id, question: "How many sections did you just read?", options: ["1", "2", "3", "4"], correct_option_index: 3, expected_answer_context: "Pick option 4 for this test." }).throwOnError();
  // the waiter is a brand new hire: no role yet, onboarding not completed
  await admin.from("app_users").update({ staff_role_id: null, onboarding_completed_at: null }).eq("id", fx.staff.waiter.id);
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

test("welcome, role select, module, completion, signature, completion screen", async ({ page }) => {
  await loginStaff(page, fx, FIXTURE_NAMES.waiter);
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: /^Welcome to/ })).toBeVisible({ timeout: 60_000 });

  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/roles$/, { timeout: 60_000 });
  await page.getByRole("button", { name: "Waiter" }).click();

  await expect(page).toHaveURL(/\/modules$/, { timeout: 60_000 });
  await page.getByRole("link", { name: "Smoke Test Module" }).click();
  await expect(page).toHaveURL(/\/modules\/.+$/, { timeout: 60_000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "4" }).click();
  // answering shows the result with a Continue button; continuing finishes the module
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Smoke Test Module completed")).toBeVisible({ timeout: 30_000 });

  const { data: prog } = await adminClient().from("staff_module_progress").select("status").eq("user_id", fx.staff.waiter.id);
  expect(prog?.map((p) => p.status)).toEqual(["completed"]);

  await page.goto(`/${fx.slug}/signature`);
  await expect(page.getByRole("heading", { name: "Sign to confirm" })).toBeVisible({ timeout: 60_000 });
  await page.getByPlaceholder("Full name").fill(FIXTURE_NAMES.waiter);
  await nativeClick(page, "Confirm and sign");
  await page.waitForURL(new RegExp(`/${fx.slug}/complete$`), { waitUntil: "commit", timeout: 60_000 });
  const { data: sig } = await adminClient().from("esignatures").select("typed_name").eq("user_id", fx.staff.waiter.id);
  expect(sig).toHaveLength(1);
});
