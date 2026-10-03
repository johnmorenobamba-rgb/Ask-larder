import { config } from "dotenv";
import { fixturePin, randomPassword } from "../helpers/secrets";
config({ path: ".env.local" });

import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
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
// Real domain with a disposable alias: bootstrapOwner rejects RFC 2606 test domains.
const OWNER_EMAIL = `john.moreno.bamba+onboarding-wizard-smoke-${suffix}@gmail.com`;
const SPECIALIST_PIN = fixturePin();
let specialistId: string | undefined;
const PASSWORD = randomPassword();

let venueId: string | undefined;

test.afterAll(async () => {
  const admin = adminClient();
  if (venueId) {
    await admin.from("venues").delete().eq("id", venueId);
  }
  if (specialistId) await admin.from("onboarding_specialists").delete().eq("id", specialistId);
  const { data: authList } = await admin.auth.admin.listUsers();
  const u = authList.users.find((x) => x.email === OWNER_EMAIL);
  if (u) await admin.auth.admin.deleteUser(u.id);
});

test.describe.serial("onboarding wizard walkthrough (Block Q)", () => {
  test("create venue, fill every guaranteed-field page, reach review & activate", async ({ page }) => {
    test.setTimeout(180_000);

    // --- Page 1: pre-auth owner + venue creation ---
    // Onboarding specialist PIN gate (15 Sep): disposable specialist row.
    const { data: specialist } = await adminClient()
      .from("onboarding_specialists")
      .insert({ name: "Wizard Smoke Specialist", pin_hash: await bcrypt.hash(SPECIALIST_PIN, 10), active: true })
      .select("id")
      .single();
    specialistId = specialist!.id;
    await page.goto("/onboarding/start");
    await page.getByPlaceholder("Trading name").fill("Onboarding Wizard Smoke Venue");
    const slugInput = page.getByPlaceholder("venue-slug");
    await slugInput.fill("");
    await slugInput.fill(SLUG);
    await page.getByPlaceholder("Your name").fill("Test Owner");
    await page.getByPlaceholder("you@venue.com.au").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 8 characters").fill(PASSWORD);
    await page.getByPlaceholder("4-6 digit PIN").fill(SPECIALIST_PIN);
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
    await page.getByLabel("Licence type").selectOption("general");
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
    await expect(page.getByText("Main Bar", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/compliance-setup$/);

    // --- Compliance Forms Stage 0a: fridges and compliance ---
    // Trade Waste Agreement is the one required answer.
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await page.getByRole("button", { name: "Add unit" }).click();
    await page.getByLabel("Unit name 1").fill("Walk in cool room");
    await expect(page.getByLabel("Safe maximum (°C) 1")).toHaveValue("5"); // cold default
    await page.getByRole("button", { name: "Add unit" }).click();
    await page.getByLabel("Unit name 2").fill("Bain marie");
    await page.getByLabel("Unit type 2").selectOption("hot_hold");
    await expect(page.getByLabel("Safe minimum (°C) 2")).toHaveValue("60"); // hot hold default
    await page.getByRole("button", { name: "Add unit" }).click();
    await page.getByLabel("Unit name 3").fill("Chest freezer");
    await page.getByLabel("Unit type 3").selectOption("frozen");
    await expect(page.getByLabel("Safe maximum (°C) 3")).toHaveValue("-15"); // frozen default
    await page.getByLabel("Station 1").selectOption({ label: "Main Bar" });
    await page.getByText("Sous vide").click();
    await page.getByText("This venue offers accommodation").click();
    await page.getByLabel("Trade Waste Agreement").selectOption("yes");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/promotions$/);

    // Persisted to the real tables, not just component state.
    {
      const admin = adminClient();
      const { data: settings } = await admin.from("venue_compliance_settings").select("*").eq("venue_id", venueId!).single();
      expect(settings?.high_risk_activities).toEqual(["sous_vide"]);
      expect(settings?.offers_accommodation).toBe(true);
      expect(settings?.trade_waste_agreement).toBe("yes");
      const { data: units } = await admin.from("venue_refrigeration_units").select("*").eq("venue_id", venueId!).order("created_at");
      expect(units?.map((u) => [u.name, u.unit_type, u.min_temp_c, u.max_temp_c])).toEqual([
        ["Walk in cool room", "cold", null, 5],
        ["Bain marie", "hot_hold", 60, null],
        ["Chest freezer", "frozen", null, -15],
      ]);
    }

    // Back button lands on the step, values re-read from the database.
    await page.getByRole("link", { name: "← Back" }).click();
    await page.waitForURL(/\/compliance-setup$/);
    await expect(page.getByLabel("Unit name 2")).toHaveValue("Bain marie");
    await expect(page.getByLabel("Trade Waste Agreement")).toHaveValue("yes");
    // Retire one unit (never deleted), then save: still 3 rows, one inactive.
    await page.getByRole("button", { name: "Retire unit" }).nth(2).click();
    await expect(page.getByText("Retired", { exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/promotions$/);
    {
      const admin = adminClient();
      const { data: units } = await admin.from("venue_refrigeration_units").select("name, is_active").eq("venue_id", venueId!).order("created_at");
      expect(units).toEqual([
        { name: "Walk in cool room", is_active: true },
        { name: "Bain marie", is_active: true },
        { name: "Chest freezer", is_active: false },
      ]);
    }
    // Restore it so the rest of the walkthrough sees a normal venue.
    await page.getByRole("link", { name: "← Back" }).click();
    await page.waitForURL(/\/compliance-setup$/);
    await page.getByRole("button", { name: "Restore unit" }).click();
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

    // --- Page 12: SOP intake hub ---
    // Since the Block U/V interview work, a fresh venue lands on a real
    // question interview (the "Continue" button only exists once every topic
    // has been generated), so this spec no longer clicks through it. It
    // asserts the page renders for a fresh venue (this makes the real
    // determineSopTopics AI call, so it needs a valid ANTHROPIC_API_KEY) and
    // then moves on by direct URL, which Q2 §1 guarantees works for any step.
    await expect(page.getByRole("heading", { name: "SOPs & training content" })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("Something went wrong", { exact: false })).toHaveCount(0);
    await page.goto(`/${SLUG}/owner/onboarding/certificate-types`);

    // --- Page 13: certificate types ---
    await page.getByRole("button", { name: /Add Working with Children Check/ }).click();
    await expect(page.getByText("Already added.").first()).toBeVisible();
    await page.getByRole("button", { name: "Add First Aid" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/review$/);

    // --- Page 14: review & activate ---
    await expect(page.getByRole("heading", { name: "Onboarding Wizard Smoke Venue" }).first()).toBeVisible();
    // Inside an ElevatedCell (continuous float animation): Playwright never sees
    // a stable box, so use a native DOM click (documented project gotcha, same
    // helper as back-button-audit.spec.ts).
    await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("button")).find((e) => e.textContent?.trim() === "Mark onboarding complete") as HTMLElement;
      el.click();
    });
    await expect(page.getByText("Onboarding marked complete.")).toBeVisible({ timeout: 10_000 });

    const { data: session } = await admin.from("wizard_sessions").select("status").eq("venue_id", venueId!).maybeSingle();
    expect(session?.status).toBe("completed");
  });
});
