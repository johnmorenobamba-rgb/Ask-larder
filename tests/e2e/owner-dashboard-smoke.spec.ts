import { config } from "dotenv";
config({ path: ".env.local" });

import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/types";

// Build Manual C1-C10 walkthrough, owner-dashboard half (Block E, E0-E8) --
// mirrors phase2/3/4-smoke.spec.ts's convention (real browser, real venue,
// no mocking) but against a disposable throwaway venue rather than the
// shared Smoke Test Venue fixture, since this needs a much richer seed
// (modules in every status, certs, escalations, near-misses) than that
// fixture carries and shouldn't accumulate state across runs the way it
// does.

function adminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const suffix = randomUUID().slice(0, 8);
const SLUG = `owner-dashboard-smoke-${suffix}`;
const OWNER_EMAIL = `owner-dashboard-smoke-${suffix}@example.com`;
const PASSWORD = "OwnerDashboardSmoke123!";
const QR_SLUG = `owner-dashboard-smoke-station-${suffix}`;

let venueId: string;
let pendingModuleId: string;
let liveModuleId: string;
let staffId: string;

test.beforeAll(async () => {
  const admin = adminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (authError || !authData.user) throw authError ?? new Error("no owner user");

  const { data: bootstrapData, error: rpcError } = await admin.rpc("bootstrap_owner", {
    p_auth_id: authData.user.id,
    p_venue_name: "Owner Dashboard Smoke Venue",
    p_venue_slug: SLUG,
    p_owner_name: "Owner Checker",
    p_owner_email: OWNER_EMAIL,
  });
  if (rpcError || !bootstrapData) throw rpcError ?? new Error("no bootstrap data");
  venueId = (bootstrapData as { venue_id: string }).venue_id;

  const { data: role } = await admin
    .from("staff_roles")
    .insert({ venue_id: venueId, name: "Smoke Staff Role", department: "FOH" })
    .select("id")
    .single();
  const { data: staff } = await admin
    .from("app_users")
    .insert({ venue_id: venueId, role: "staff", name: "Smoke Staff", staff_role_id: role!.id })
    .select("id")
    .single();
  staffId = staff!.id;

  const { data: pending } = await admin
    .from("modules")
    .insert({ venue_id: venueId, title: "Pending Smoke Module", status: "pending_approval" })
    .select("id")
    .single();
  pendingModuleId = pending!.id;

  const { data: live } = await admin
    .from("modules")
    .insert({ venue_id: venueId, title: "Live Smoke Module", status: "live" })
    .select("id")
    .single();
  liveModuleId = live!.id;
  await admin
    .from("module_sections")
    .insert({ module_id: liveModuleId, section_order: 1, content: "Original smoke content" });

  await admin
    .from("staff_module_progress")
    .insert({ user_id: staffId, module_id: liveModuleId, status: "completed", completed_at: new Date().toISOString() });

  const { data: certType } = await admin
    .from("certificate_types")
    .insert({ venue_id: venueId, name: "Smoke Cert" })
    .select("id")
    .single();
  const soon = new Date();
  soon.setDate(soon.getDate() + 5);
  await admin
    .from("staff_certificates")
    .insert({ user_id: staffId, certificate_type_id: certType!.id, expiry_date: soon.toISOString().slice(0, 10) });

  await admin.from("chat_messages").insert({
    venue_id: venueId,
    user_id: staffId,
    role: "assistant",
    message: "Ask your supervisor for assistance, as they have access to the safe.",
    is_escalation: true,
  });

  await admin.from("near_miss_reports").insert({
    venue_id: venueId,
    description: "Smoke test hazard: loose cable near the pass",
    is_anonymous: true,
  });
});

test.afterAll(async () => {
  const admin = adminClient();
  await admin.from("venues").delete().eq("id", venueId);
  const { data: authList } = await admin.auth.admin.listUsers();
  const u = authList.users.find((x) => x.email === OWNER_EMAIL);
  if (u) await admin.auth.admin.deleteUser(u.id);
});

async function loginAsOwner(page: Page) {
  await page.goto(`/${SLUG}/owner/login`);
  await page.getByPlaceholder("Email").fill(OWNER_EMAIL);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/owner\/dashboard$/);
}

test.describe.serial("owner dashboard walkthrough (Block E, E0-E8)", () => {
  test("E0: login and dashboard hub", async ({ page }) => {
    await loginAsOwner(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    const nav = page.getByRole("navigation");
    for (const label of ["Staff", "Completions", "Certificates", "Modules", "Escalations", "Near-misses", "Stations"]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  test("E1: staff list shows seeded staff", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto(`/${SLUG}/owner/staff`);
    const row = page.getByTestId("staff-row").filter({ hasText: "Smoke Staff" });
    await expect(row.getByText("Smoke Staff", { exact: true })).toBeVisible();
    await expect(row.getByText("Smoke Staff Role")).toBeVisible();
  });

  test("E2: completions show the seeded completed module", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto(`/${SLUG}/owner/completions`);
    await expect(page.getByText("Live Smoke Module")).toBeVisible();
    await expect(page.getByText("Completed")).toBeVisible();
  });

  test("E3: certs page shows the expiring certificate", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto(`/${SLUG}/owner/certs`);
    await expect(page.getByText("Smoke Cert")).toBeVisible();
    await expect(page.getByText(/Expires in \d+ day\(s\)/)).toBeVisible();
  });

  test("E4: approve a pending module, edit live module content, publish a version", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto(`/${SLUG}/owner/modules`);
    await expect(page.getByText("Pending Smoke Module")).toBeVisible();
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Pending approval")).not.toBeVisible();

    await page.goto(`/${SLUG}/owner/modules/${liveModuleId}/edit`);
    await page.locator("textarea").fill("Edited smoke content");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

    await page.getByPlaceholder("What changed?").fill("Smoke test changelog");
    await page.getByRole("button", { name: "Publish update" }).click();
    await expect(page.getByText("Published.")).toBeVisible();
  });

  test("E5: escalation digest shows and resolves the seeded escalation", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto(`/${SLUG}/owner/escalations`);
    await expect(page.getByText("Ask your supervisor for assistance, as they have access to the safe.")).toBeVisible();
    await page.getByRole("button", { name: "Mark resolved" }).click();
    await expect(page.getByText("Resolved")).toBeVisible();
  });

  test("E6: near-miss inbox shows and resolves the seeded report", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto(`/${SLUG}/owner/near-misses`);
    await expect(page.getByText("Smoke test hazard: loose cable near the pass")).toBeVisible();
    await expect(page.getByText("Anonymous")).toBeVisible();
    await page.getByRole("button", { name: "Mark resolved" }).click();
    await expect(page.getByText("Resolved")).toBeVisible();
  });

  test("E7: version tracker shows the published version and outstanding staff", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto(`/${SLUG}/owner/modules/${liveModuleId}/versions`);
    await expect(page.getByText("Smoke test changelog")).toBeVisible();
    await expect(page.getByText(/Outstanding \(1\): Smoke Staff/)).toBeVisible();
  });

  test("E8: create a station, QR resolves to the real station page, delete it", async ({ page }) => {
    await loginAsOwner(page);
    await page.goto(`/${SLUG}/owner/stations`);
    await page.getByPlaceholder("Station name").fill("Smoke Station");
    await page.getByPlaceholder("qr-code-slug").fill(QR_SLUG);
    await page.getByRole("button", { name: "Create station" }).click();
    await expect(page.getByText("Smoke Station")).toBeVisible();

    const stationResp = await page.request.get(`/${SLUG}/station/${QR_SLUG}`);
    expect(stationResp.status()).toBeLessThan(400);

    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Smoke Station")).not.toBeVisible();
  });
});
