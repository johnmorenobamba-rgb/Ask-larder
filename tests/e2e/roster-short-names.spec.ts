import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { adminClient, createFixture, destroyFixture, nativeClick, PIN, type Fixture } from "./helpers/stage0";

// Roster privacy: the staff picker (and the anon venue_roster call behind it) shows short names only.
// Disposable fixture venue with colliding names, removed afterwards.
test.describe.configure({ timeout: 300_000, mode: "serial" });

let fx: Fixture;
const EXTRA = ["Priya Nair", "Priya Nash", "Sam Lee", "Sam Lee"];
const SHOWN = ["Priya Nai.", "Priya Nas.", "Sam L. 1", "Sam L. 2"];

test.beforeAll(async () => {
  fx = await createFixture("rs");
  const admin = adminClient();
  const { data: role } = await admin.from("staff_roles").select("id").eq("venue_id", fx.venueId).eq("name", "Waiter").single();
  const pinHash = await bcrypt.hash(PIN, 10);
  const stamp = new Date().toISOString();
  for (const name of EXTRA) {
    const { error } = await admin.from("app_users").insert({ venue_id: fx.venueId, role: "staff", name, staff_role_id: role!.id, pin_hash: pinHash, pin_set_at: stamp, onboarding_completed_at: stamp });
    if (error) throw error;
  }
});
test.afterAll(async () => {
  await destroyFixture(fx);
});

test("the anon roster call returns short names and no full surname", async () => {
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await anon.rpc("venue_roster", { p_slug: fx.slug });
  expect(error).toBeNull();
  const names = (data as { staff: { id: string; name: string }[] }).staff.map((s) => s.name);
  for (const s of SHOWN) expect(names).toContain(s);
  expect(names.join("|")).not.toMatch(/Nair|Nash|Lee|Hand\b|Waiter|Bartender|Manager|Chef\b/);
});

test("the login page shows the short names as cards", async ({ page }) => {
  await page.goto(`/${fx.slug}/login`);
  for (const s of SHOWN) await expect(page.getByRole("button", { name: s })).toBeVisible();
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/Nair|Nash|Lee\b/);
});

for (const shown of SHOWN) {
  test(`login works from the card "${shown}"`, async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`/${fx.slug}/login`);
    await nativeClick(page, shown);
    await page.locator('input[type="password"]').fill(PIN);
    await nativeClick(page, "Log in");
    await page.waitForURL(/\/(welcome|roles|modules|home)$/, { waitUntil: "commit", timeout: 60_000 });
  });
}
