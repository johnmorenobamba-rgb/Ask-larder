import { config } from "dotenv";
config({ path: ".env.local" });

import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/types";

// Block Q4 — end-to-end walkthrough of the onboarding wizard on fresh
// fictional data, using only the manual-entry paths (no menu/SOP file
// upload), so this spec doesn't depend on Q5's AI parsing endpoints being
// done yet. Per CLAUDE.md's standing Playwright-walkthrough practice, this
// is a real regression test, not a one-off script — Q6 extends it later
// with messier simulated data.
//
// RSA (Page 6a) and Food service (Page 7b) both need at least one staff
// role to select from, but Staff roles is Page 11a in Q2's own canonical
// order — later than both. Every wizard page stays independently reachable
// via a direct URL (Q2 §1's "never gate a page" rule), so this spec visits
// Staff roles out of the linear order to create a role before RSA/Food
// service, then returns to the natural order for the rest of the walk.

function adminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const suffix = randomUUID().slice(0, 8);
const SLUG = `onboarding-wizard-smoke-${suffix}`;
const OWNER_EMAIL = `onboarding-wizard-smoke-${suffix}@example.com`;
const PASSWORD = "OnboardingWizardSmoke123!";

let venueId: string | undefined;

test.afterAll(async () => {
  const admin = adminClient();
  if (venueId) {
    await admin.from("venues").delete().eq("id", venueId);
  }
  const { data: authList } = await admin.auth.admin.listUsers();
  const u = authList.users.find((x) => x.email === OWNER_EMAIL);
  if (u) await admin.auth.admin.deleteUser(u.id);
});

test.describe.serial("onboarding wizard walkthrough (Block Q)", () => {
  test("create venue, fill every guaranteed-field page, reach review & activate", async ({ page }) => {
    test.setTimeout(180_000);

    // --- Page 1: pre-auth owner + venue creation ---
    await page.goto("/onboarding/start");
    await page.getByPlaceholder("Trading name").fill("Onboarding Wizard Smoke Venue");
    const slugInput = page.getByPlaceholder("venue-slug");
    await slugInput.fill("");
    await slugInput.fill(SLUG);
    await page.getByPlaceholder("Your name").fill("Test Owner");
    await page.getByPlaceholder("you@venue.com.au").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 8 characters").fill(PASSWORD);
    await page.getByRole("button", { name: "Create venue and start onboarding" }).click();
    await page.waitForURL(new RegExp(`/${SLUG}/owner/onboarding/venue-basics$`), { timeout: 20_000 });

    const admin = adminClient();
    const { data: venue } = await admin.from("venues").select("id").eq("slug", SLUG).maybeSingle();
    venueId = venue?.id;
    expect(venueId).toBeTruthy();

    // --- Page 2: venue basics ---
    await page.getByLabel("State or territory").selectOption("VIC");
    await page.getByPlaceholder("Street address").fill("1 Test Street, Melbourne");
    await page.getByPlaceholder("11 digits").fill("51824753556");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/licensing$/);

    // --- Page 3: LIC0 root licensing gate ---
    await page.getByText("Full licence", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/licence-detail$/);

    // --- Page 4: licence detail ---
    await page.getByLabel("Licence type").selectOption("general_club");
    await page.getByPlaceholder("Licence number").fill("LIC-12345");
    await page.getByPlaceholder("Licensed capacity").fill("120");
    await page.getByRole("button", { name: "No", exact: true }).click(); // gaming/EGM
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/crowd-control$/);

    // --- Page 5: crowd control ---
    await page.getByRole("button", { name: "No controllers used" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/rsa$/);

    // --- Out-of-order detour: Page 11a, staff roles, needed by RSA/Food service below ---
    await page.goto(`/${SLUG}/owner/onboarding/staff-roles`);
    await page.getByPlaceholder("Roster location").fill("Shared roster doc");
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByPlaceholder("Role name").fill("Bartender");
    await page.getByRole("button", { name: "Add role" }).click();
    await expect(page.getByText("Bartender")).toBeVisible();

    // --- Page 6a+6b: RSA ---
    await page.goto(`/${SLUG}/owner/onboarding/rsa`);
    await page.getByText("Bartender").click();
    await page.getByRole("button", { name: "No", exact: true }).click(); // marshal designated
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/food-service$/);

    // --- Page 7+7a+7b: food service ---
    await page.getByLabel("Food service level").selectOption("full_kitchen");
    await page.getByPlaceholder("Food Safety Supervisor's name").fill("FSS Person");
    await page.getByText("Bartender").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/menu$/);

    // --- Page 8a+8b: menu ---
    await page.getByPlaceholder("Item name").fill("House Chips");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText("House Chips")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/equipment$/);

    // --- Page 8c: equipment ---
    await page.getByPlaceholder("Station name").fill("Main Bar");
    await page.getByPlaceholder("qr-code-slug").fill(`main-bar-${suffix}`);
    await page.getByRole("button", { name: "Create station" }).click();
    await expect(page.getByText("Main Bar")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/promotions$/);

    // --- Page 9: promotions ---
    await page.getByRole("button", { name: "Yes", exact: true }).click();
    await page.getByLabel("Day of the week").selectOption("friday");
    await page.locator('input[type="time"]').first().fill("17:00");
    await page.locator('input[type="time"]').last().fill("19:00");
    await page.getByRole("button", { name: "Add promotion" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/contacts$/);

    // --- Page 10: business continuity contacts ---
    await page.getByLabel("Contact type").selectOption("electrician");
    await page.getByPlaceholder("Name").fill("Test Electrician");
    await page.getByRole("button", { name: "Add contact" }).click();
    await expect(page.getByText("Test Electrician")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/staff-roles$/);

    // --- Page 11a: staff roles (revisited, already has a role) ---
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/staff-invite$/);

    // --- Page 11b: staff invite ---
    await page.getByPlaceholder("Name").fill("New Hire");
    await page.getByPlaceholder("Email").fill(`new-hire-${suffix}@example.com`);
    await page.getByRole("button", { name: "Add staff member" }).click();
    await expect(page.getByText("New Hire")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/content-intake$/);

    // --- Page 12: SOP intake hub (no upload — manual-entry-equivalent is simply moving on) ---
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/certificate-types$/);

    // --- Page 13: certificate types ---
    await page.getByRole("button", { name: /Add Working with Children Check/ }).click();
    await expect(page.getByText("Already added.").first()).toBeVisible();
    await page.getByRole("button", { name: "Add First Aid" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/review$/);

    // --- Page 14: review & activate ---
    await expect(page.getByText("Onboarding Wizard Smoke Venue")).toBeVisible();
    await page.getByRole("button", { name: "Mark onboarding complete" }).click();
    await expect(page.getByText("Onboarding marked complete.")).toBeVisible({ timeout: 10_000 });

    const { data: session } = await admin.from("wizard_sessions").select("status").eq("venue_id", venueId!).maybeSingle();
    expect(session?.status).toBe("completed");
  });
});
