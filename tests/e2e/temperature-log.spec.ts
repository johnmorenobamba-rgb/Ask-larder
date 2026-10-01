import { config } from "dotenv";
config({ path: ".env.local" });

import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/types";

// Stage 0b: B2 storage temperature log, end to end, on a DISPOSABLE venue that is
// removed with the service role afterwards (cascade). Owner alert emails are OFF in
// this spec (COMPLIANCE_ALERT_EMAIL_ENABLED is never set), so nothing is ever emailed.
// The demo venue is never touched.

function adminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const suffix = randomUUID().slice(0, 8);
const SLUG = `temp-log-${suffix}`;
const OWNER_EMAIL = `john.moreno.bamba+temp-log-${suffix}@gmail.com`;
const OWNER_PASSWORD = "TempLogOwner123!";
const PIN = "4821";
const SHOTS = path.resolve(__dirname, "../../scratch/compliance-0b-report/screenshots");

let venueId = "";
let ownerAuthId = "";
const staffIds: Record<string, string> = {};
const unitIds: Record<string, string> = {};

async function nativeClick(page: Page, text: string, tag = "button") {
  const clicked = await page.evaluate(
    ({ tag, text }) => {
      const el = Array.from(document.querySelectorAll(tag)).find((e) => e.textContent?.trim() === text) as HTMLElement | undefined;
      if (!el) return false;
      el.click();
      return true;
    },
    { tag, text },
  );
  if (!clicked) throw new Error(`nativeClick: no <${tag}> with exact text "${text}" found`);
}

async function loginStaff(page: Page, name: string) {
  await page.goto(`/${SLUG}/login`);
  await nativeClick(page, name);
  await page.locator('input[type="password"]').fill(PIN);
  await nativeClick(page, "Log in");
  await page.waitForURL(/\/(welcome|roles|modules|home)$/, { waitUntil: "commit", timeout: 20_000 });
}

async function loginOwner(page: Page) {
  await page.goto(`/${SLUG}/owner/login`);
  await page.locator('input[type="email"]').fill(OWNER_EMAIL);
  await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
  await nativeClick(page, "Log in");
  await page.waitForURL(/\/owner\/(dashboard|onboarding)/, { waitUntil: "commit", timeout: 20_000 });
}

function entry(unitKey: string, readingC: number, note?: string, correctsSubmissionId?: string, clientRequestId = randomUUID()) {
  return { clientRequestId, unitId: unitIds[unitKey], readingC, correctiveAction: note, correctsSubmissionId };
}

test.beforeAll(async () => {
  const admin = adminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
  });
  if (authError || !authData.user) throw authError ?? new Error("no owner user");
  ownerAuthId = authData.user.id;
  const { data: boot, error: rpcError } = await admin.rpc("bootstrap_owner", {
    p_auth_id: ownerAuthId,
    p_venue_name: "Temp Log Test Venue",
    p_venue_slug: SLUG,
    p_owner_name: "Temp Log Owner",
    p_owner_email: OWNER_EMAIL,
  });
  if (rpcError || !boot) throw rpcError ?? new Error("no bootstrap data");
  venueId = (boot as { venue_id: string }).venue_id;
  await admin.from("venue_licence_profile").upsert({ venue_id: venueId, state: "VIC" }, { onConflict: "venue_id" });

  const mkRole = async (name: string, department: "BOH" | "FOH", tier: "frontline" | "authorized") => {
    const { data, error } = await admin.from("staff_roles").insert({ venue_id: venueId, name, department, fallback_tier: tier }).select("id").single();
    if (error) throw error;
    return data!.id;
  };
  const roleBoh = await mkRole("Kitchen Hand", "BOH", "frontline");
  const roleFoh = await mkRole("Floor Staff", "FOH", "frontline");
  const roleMgr = await mkRole("Duty Manager", "FOH", "authorized");
  const pinHash = await bcrypt.hash(PIN, 10);
  const mkStaff = async (key: string, name: string, roleId: string) => {
    const { data, error } = await admin
      .from("app_users")
      .insert({ venue_id: venueId, role: "staff", name, staff_role_id: roleId, pin_hash: pinHash, pin_set_at: new Date().toISOString(), onboarding_completed_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw error;
    staffIds[key] = data!.id;
  };
  await mkStaff("kit", "Kit Hand", roleBoh);
  await mkStaff("flo", "Flo Floor", roleFoh);
  await mkStaff("dave", "Dave Duty", roleMgr);

  const mkUnit = async (key: string, name: string, unit_type: string, min: number | null, max: number | null) => {
    const { data, error } = await admin
      .from("venue_refrigeration_units")
      .insert({ venue_id: venueId, name, unit_type, min_temp_c: min, max_temp_c: max })
      .select("id")
      .single();
    if (error) throw error;
    unitIds[key] = data!.id;
  };
  await mkUnit("cold", "Walk in cool room", "cold", null, 5);
  await mkUnit("frozen", "Chest freezer", "frozen", null, -15);
  await mkUnit("hot", "Bain marie", "hot_hold", 60, null);
  fs.mkdirSync(SHOTS, { recursive: true });
});

test.afterAll(async () => {
  const admin = adminClient();
  if (venueId) await admin.from("venues").delete().eq("id", venueId); // cascades over the ledger, alert log and units
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of authList?.users ?? []) {
    if (u.id === ownerAuthId || Object.values(staffIds).some((id) => u.email === `staff-${id}@venue.internal`)) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }
});

test.describe.serial("B2 temperature log", () => {
  test("FOH staff are denied: no page, no nav item, API refuses", async ({ page }) => {
    await loginStaff(page, "Flo Floor");
    await page.goto(`/${SLUG}/temperature`);
    await page.waitForURL(new RegExp(`/${SLUG}/home$`), { waitUntil: "commit" });
    await expect(page.getByText("Temperature log")).toHaveCount(0); // no home tile
    const res = await page.request.post(`/api/staff/compliance/b2`, { data: { entries: [entry("cold", 4)] } });
    expect(res.status()).toBe(403);
    const { count } = await adminClient().from("compliance_form_submissions").select("id", { count: "exact", head: true }).eq("venue_id", venueId);
    expect(count).toBe(0);
  });

  test("a forged staff id, venue id or out_of_range in the body is ignored", async ({ page }) => {
    await loginStaff(page, "Kit Hand");
    const forged = {
      staffId: staffIds.dave,
      submittedBy: staffIds.dave,
      venueId: randomUUID(),
      outOfRange: false,
      visibleToRoles: ["FOH"],
      submittedAt: "2020-01-01T00:00:00Z",
      entries: [{ ...entry("cold", 4), staffId: staffIds.dave, submittedBy: staffIds.dave, outOfRange: false }],
    };
    const ok = await page.request.post(`/api/staff/compliance/b2`, { data: forged });
    expect(ok.status()).toBe(200);
    const admin = adminClient();
    const { data: rows } = await admin.from("compliance_form_submissions").select("*").eq("venue_id", venueId);
    expect(rows).toHaveLength(1);
    expect(rows![0].submitted_by).toBe(staffIds.kit); // the session, not the forged id
    expect(rows![0].submitted_by_name).toBe("Kit Hand");
    expect(rows![0].venue_id).toBe(venueId);
    expect(rows![0].visible_to_roles).toEqual(["BOH"]); // from the catalog, not the body
    expect(new Date(rows![0].submitted_at).getFullYear()).toBeGreaterThan(2025); // server time

    // an out of range reading cannot be passed off as in range, and needs a note
    const noNote = await page.request.post(`/api/staff/compliance/b2`, { data: { outOfRange: false, entries: [entry("frozen", -10)] } });
    expect(noNote.status()).toBe(400);
    const withNote = await page.request.post(`/api/staff/compliance/b2`, {
      data: { outOfRange: false, entries: [entry("frozen", -10, "Door was left open")] },
    });
    expect(withNote.status()).toBe(200);
    const { data: frz } = await admin.from("compliance_form_submissions").select("out_of_range").eq("venue_id", venueId).eq("payload->>reading_c", "-10");
    expect(frz).toEqual([{ out_of_range: true }]);
  });

  test("a repeated request id saves once (idempotent)", async ({ page }) => {
    await loginStaff(page, "Kit Hand");
    const id = randomUUID();
    const body = { entries: [entry("hot", 70, undefined, undefined, id)] };
    const a = await page.request.post(`/api/staff/compliance/b2`, { data: body });
    const b = await page.request.post(`/api/staff/compliance/b2`, { data: body });
    expect(a.status()).toBe(200);
    expect(b.status()).toBe(200);
    expect((await b.json()).saved[0].inserted).toBe(false);
    const { count } = await adminClient().from("compliance_form_submissions").select("id", { count: "exact", head: true }).eq("venue_id", venueId).eq("client_request_id", id);
    expect(count).toBe(1);
    // the same id with a different reading is refused, not silently dropped
    const c = await page.request.post(`/api/staff/compliance/b2`, { data: { entries: [entry("hot", 71, undefined, undefined, id)] } });
    expect(c.status()).toBe(409);
  });

  test("staff walkthrough: tile, in range, out of range with a forced note, save, confirmation, correction", async ({ page }) => {
    // fresh venue state for the walkthrough: use a new unit set so earlier API rows do not interfere
    const admin = adminClient();
    const mk = async (name: string, unit_type: string, min: number | null, max: number | null) => {
      const { data } = await admin.from("venue_refrigeration_units").insert({ venue_id: venueId, name, unit_type, min_temp_c: min, max_temp_c: max }).select("id").single();
      return data!.id;
    };
    // retire the API-test units so the page lists only the walkthrough units
    await admin.from("venue_refrigeration_units").update({ is_active: false }).in("id", Object.values(unitIds));
    const walkCold = await mk("Walkthrough fridge", "cold", null, 5);
    const walkFrz = await mk("Walkthrough freezer", "frozen", null, -15);
    const walkHot = await mk("Walkthrough hot hold", "hot_hold", 60, null);

    await loginStaff(page, "Kit Hand");
    await page.goto(`/${SLUG}/home`);
    const tile = page.getByRole("link", { name: /logged today/ });
    await expect(tile).toBeVisible({ timeout: 15_000 });
    await expect(tile).toContainText("0 of 3 logged today");
    await page.goto(`/${SLUG}/temperature`);
    await expect(page.getByRole("heading", { name: "Temperature log" })).toBeVisible();
    await expect(page.getByText("0 of 3 units logged today")).toBeVisible();

    // in range cold
    await page.getByLabel("Reading (°C)").nth(0).fill("4");
    await expect(page.getByText("In range", { exact: true }).first()).toBeVisible();
    // freezer: type the minus with the plus/minus button, an out of range -10 (limit is -15)
    const freezerField = page.getByLabel("Reading (°C)").nth(1);
    await page.getByRole("button", { name: /Walkthrough freezer reading negative or positive/ }).click();
    await freezerField.fill("-10");
    await expect(page.getByText(/Out of range\./)).toBeVisible();
    const note = page.getByLabel(/What did you do about it\?/);
    await expect(note).toBeVisible();
    // Save is disabled until the note is written
    const save = page.getByRole("button", { name: /Save/ });
    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: "Moved food to another unit" }).click();
    await expect(note).toHaveValue("Moved food to another unit");
    // hot hold in range
    await page.getByLabel("Reading (°C)").nth(2).fill("68");
    await expect(save).toBeEnabled();
    await expect(save).toHaveText("Save 3 readings");

    await save.click();
    await expect(page.getByRole("status")).toContainText("3 readings saved. 1 was out of range and flagged for the owner.", { timeout: 15_000 });

    // database: 3 new rows, the freezer one flagged with its note, stamped by the session user
    const { data: rows } = await admin
      .from("compliance_form_submissions")
      .select("out_of_range, corrective_action, submitted_by, payload")
      .eq("venue_id", venueId)
      .in("payload->>unit_id", [walkCold, walkFrz, walkHot]);
    expect(rows).toHaveLength(3);
    const frozenRow = rows!.find((r) => (r.payload as { unit_id: string }).unit_id === walkFrz)!;
    expect(frozenRow.out_of_range).toBe(true);
    expect(frozenRow.corrective_action).toBe("Moved food to another unit");
    expect(rows!.every((r) => r.submitted_by === staffIds.kit)).toBe(true);

    // the page now shows today's readings and the flag
    await expect(page.getByText("3 of 3 units logged today")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("1 unit is still out of range.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Correct this reading" })).toHaveCount(3);

    // correct the freezer reading (the latest for that unit): a new linked record
    await page.getByRole("button", { name: "Correct this reading" }).nth(1).click();
    const fixed = page.getByLabel("Corrected reading (°C)");
    await expect(fixed).toBeVisible();
    await page.getByRole("button", { name: /Walkthrough freezer reading negative or positive/ }).click();
    await fixed.fill("-18");
    await expect(page.locator('[id^="reading-"][id$="-status"]').filter({ hasText: "In range" })).toBeVisible();
    await page.getByRole("button", { name: "Save reading" }).click();
    await expect(page.getByRole("status")).toContainText("1 reading saved.", { timeout: 15_000 });
    const { data: chain } = await admin
      .from("compliance_form_submissions")
      .select("id, out_of_range, corrects_submission_id, payload")
      .eq("venue_id", venueId)
      .eq("payload->>unit_id", walkFrz)
      .order("submitted_at");
    expect(chain).toHaveLength(2);
    expect(chain![1].corrects_submission_id).toBe(chain![0].id); // linked, nothing edited
    expect(chain![0].out_of_range).toBe(true); // the original is untouched
    expect(chain![1].out_of_range).toBe(false);

    // a second reading on the cold unit: the first one becomes an older reading
    await page.reload();
    await page.getByRole("button", { name: "Correct this reading" }).nth(0).click();
    await page.getByLabel("Corrected reading (°C)").fill("4.5");
    await page.getByRole("button", { name: "Save reading" }).click();
    await expect(page.getByRole("status")).toContainText("1 reading saved.", { timeout: 15_000 });
    // only the latest reading can be corrected: an older one is refused, with an explanation
    const { data: coldRows } = await admin
      .from("compliance_form_submissions")
      .select("id, corrects_submission_id")
      .eq("venue_id", venueId)
      .eq("payload->>unit_id", walkCold)
      .order("submitted_at");
    expect(coldRows).toHaveLength(2);
    // log a fresh (non correction) reading so the correction chain's root is no longer latest
    const fresh = await page.request.post(`/api/staff/compliance/b2`, { data: { entries: [{ clientRequestId: randomUUID(), unitId: walkCold, readingC: 3.5 }] } });
    expect(fresh.status()).toBe(200);
    const stale = await page.request.post(`/api/staff/compliance/b2`, {
      data: { entries: [{ clientRequestId: randomUUID(), unitId: walkCold, readingC: 4, correctsSubmissionId: coldRows![1].id }] },
    });
    expect(stale.status()).toBe(409);
    expect((await stale.json()).error).toMatch(/Only the latest reading for a unit can be corrected/);
    await page.reload();
    await expect(page.getByText("Only the latest reading for a unit can be corrected. Log a new reading to change it.").first()).toBeVisible();
  });

  test("manager tier (FOH Duty Manager) can open the log", async ({ page }) => {
    await loginStaff(page, "Dave Duty");
    await page.goto(`/${SLUG}/temperature`);
    await expect(page.getByRole("heading", { name: "Temperature log" })).toBeVisible();
  });

  test("owner sees the cell and page; an open flag stays until a LATER in range reading", async ({ page, browser }) => {
    const admin = adminClient();
    // a hot hold unit that fails and is not rechecked
    const { data: flagUnit } = await admin
      .from("venue_refrigeration_units")
      .insert({ venue_id: venueId, name: "Pass warmer", unit_type: "hot_hold", min_temp_c: 60 })
      .select("id")
      .single();
    unitIds.warmer = flagUnit!.id;

    const kit = await browser.newPage();
    await loginStaff(kit, "Kit Hand");
    const failed = await kit.request.post(`/api/staff/compliance/b2`, { data: { entries: [entry("warmer", 52, "Element tripped, reheating")] } });
    expect(failed.status()).toBe(200);

    await loginOwner(page);
    await page.goto(`/${SLUG}/owner/dashboard`);
    const cell = page.getByRole("link", { name: /logged today/ });
    await expect(cell).toContainText("out of range", { timeout: 15_000 });
    await cell.click();
    await page.waitForURL(new RegExp(`/${SLUG}/owner/temperature$`), { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: "Out of range, not rechecked" })).toBeVisible();
    const flagItem = page.getByRole("listitem").filter({ hasText: "Pass warmer" }).first();
    await expect(flagItem).toContainText("52°C");
    await expect(flagItem).toContainText("Element tripped, reheating");
    await expect(flagItem).toContainText("Stays open until a later reading is in range.");

    // a recheck that is still out of range keeps it open, and sends no second alert
    const still = await kit.request.post(`/api/staff/compliance/b2`, { data: { entries: [entry("warmer", 55, "Still heating")] } });
    expect(still.status()).toBe(200);
    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: "Pass warmer" }).first()).toContainText("55°C");

    // the alert log has exactly one row for this unit's episode
    const { data: warmerSubs } = await admin.from("compliance_form_submissions").select("id").eq("venue_id", venueId).eq("payload->>unit_id", unitIds.warmer);
    const { data: warmerAlerts } = await admin
      .from("compliance_alert_log")
      .select("submission_id, email_sent_at")
      .in("submission_id", (warmerSubs ?? []).map((r) => r.id));
    expect(warmerSubs).toHaveLength(2); // the failing reading and the still failing recheck
    expect(warmerAlerts).toHaveLength(1); // one alert for the whole episode, not one per reading
    expect(warmerAlerts![0].email_sent_at).toBeNull(); // emails are off in this spec

    // a LATER in range reading closes the flag
    const ok = await kit.request.post(`/api/staff/compliance/b2`, { data: { entries: [entry("warmer", 66)] } });
    expect(ok.status()).toBe(200);
    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: "Pass warmer" }).filter({ hasText: "Stays open until" })).toHaveCount(0);
    await kit.close();
  });

  test("screenshots: staff form (one out of range row), owner cell and owner page at mobile, iPad and desktop", async ({ page: basePage, browser }) => {
    let page = basePage;
    const admin = adminClient();
    // a unit with an open flag so the owner pages show one, and a staff form with an out of range value typed (not saved)
    const { data: u } = await admin
      .from("venue_refrigeration_units")
      .insert({ venue_id: venueId, name: "Bar fridge", unit_type: "cold", max_temp_c: 5 })
      .select("id")
      .single();
    unitIds.bar = u!.id;
    const { data: d } = await admin
      .from("venue_refrigeration_units")
      .insert({ venue_id: venueId, name: "Display fridge", unit_type: "cold", max_temp_c: 5 })
      .select("id")
      .single();
    unitIds.disp = d!.id;
    const kit = await browser.newPage();
    await loginStaff(kit, "Kit Hand");
    await kit.request.post(`/api/staff/compliance/b2`, { data: { entries: [entry("bar", 9, "Door ajar, closed it and rechecking")] } });
    await kit.close();

    const sizes = {
      mobile: { width: 375, height: 812 },
      ipad: { width: 820, height: 1180 },
      "ipad-landscape": { width: 1024, height: 768 },
      desktop: { width: 1440, height: 900 },
    } as const;
    for (const [name, size] of Object.entries(sizes)) {
      const staffCtx = await browser.newContext({ viewport: size, baseURL: "http://localhost:3000" });
      const staffPage = await staffCtx.newPage();
      await loginStaff(staffPage, "Kit Hand");
      page = staffPage;
      await page.goto(`/${SLUG}/temperature`);
      await expect(page.getByRole("heading", { name: "Temperature log" })).toBeVisible();
      // type an out of range reading into the first unit that still needs one (not saved)
      const fields = page.getByLabel(/^Reading \(°C\)$/);
      if ((await fields.count()) > 0) {
        await fields.first().fill("8.5");
        await expect(page.getByText(/Out of range\./).first()).toBeVisible();
      }
      await page.waitForTimeout(1500); // let the page slide in finish
      await page.screenshot({ path: path.join(SHOTS, `staff-temperature-form-${name}.png`), fullPage: true });
      await page.goto(`/${SLUG}/home`);
      await expect(page.getByRole("link", { name: /logged today/ })).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(3500); // let the bento entrance finish
      await page.screenshot({ path: path.join(SHOTS, `staff-home-tile-${name}.png`), fullPage: true });
      await staffCtx.close();

      const ownerCtx = await browser.newContext({ viewport: size, baseURL: "http://localhost:3000" });
      page = await ownerCtx.newPage();
      await loginOwner(page);
      await page.goto(`/${SLUG}/owner/dashboard`);
      await expect(page.getByRole("link", { name: /logged today/ })).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(3500); // let the dashboard intro overlay finish before the screenshot
      await page.screenshot({ path: path.join(SHOTS, `owner-dashboard-cell-${name}.png`), fullPage: true });
      await page.goto(`/${SLUG}/owner/temperature`);
      await expect(page.getByRole("heading", { name: "Out of range, not rechecked" })).toBeVisible();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SHOTS, `owner-temperature-page-${name}.png`), fullPage: true });
      await ownerCtx.close();
    }
  });
});
