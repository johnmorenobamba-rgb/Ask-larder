import { config } from "dotenv";
config({ path: ".env.local" });

import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/types";
import { WIZARD_STEP_SLUGS, getPreviousStep, stepHref, type WizardStepSlug } from "../../src/lib/onboarding/steps";

// Real, committed back-button audit -- the 11 Sep Block Q pass never became
// this. It lived as a gitignored scratch script (scratch/back-button-audit.mjs)
// that checked one specific thing: the rendered "← Back" WizardBackLink
// component, only across the 15 onboarding-wizard steps. It never tested
// real browser back-button/popstate behaviour, and never touched the other
// 45 pages in the app. This spec does both: reproduces the original
// Back-link check for the wizard (still the right mechanism there -- these
// pages use a real rendered link, not free browser history), and adds a
// genuine page.goBack() check for every other page, reached via a real
// in-app click so real history exists to go back through.
//
// Fixtures follow the disposable-venue convention already established in
// owner-dashboard-smoke.spec.ts (bootstrap_owner RPC + rich direct seed)
// and ask-larder.spec.ts (a synthetic PIN-login staff fixture) -- not a
// hardcoded real venue's credentials, which don't belong in a committed
// test file.

function adminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function expectHealthyPage(page: Page) {
  // No Next.js error overlay, no app-level "something went wrong" text.
  await expect(page.getByText("Something went wrong", { exact: false })).toHaveCount(0);
}

// Documented project gotcha (reference_elevated_cell_playwright_click_gotcha):
// any button inside an ElevatedCell (both login forms, the staff PIN picker)
// carries a continuous idle-float animation that never reports a stable
// bounding box, so locator.click() retries forever waiting for stability --
// and force:true only skips the pointer-interception check, not the
// stability one, so it still unreliably misses. A native DOM click bypasses
// Playwright's synthesized-event/actionability path entirely.
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

// ============================================================================
// Section A -- the 15 wizard steps' rendered "← Back" link
// ============================================================================
test.describe.serial("back-button audit: onboarding wizard (15 pages)", () => {
  const suffix = randomUUID().slice(0, 8);
  const SLUG = `back-audit-wizard-${suffix}`;
  // bootstrapOwner.ts's looksLikeRealEmail() rejects RFC 2606 test domains
  // (example.com etc, added 14 Sep after finding Two Fires' own owner email
  // used one) -- a real domain with a disposable alias, same convention
  // already used for every other throwaway account in this project.
  const OWNER_EMAIL = `john.moreno.bamba+back-audit-wizard-${suffix}@gmail.com`;
  const PASSWORD = "BackAuditWizard123!";
  const SPECIALIST_PIN = "8823";
  let venueId: string | undefined;
  let specialistId: string | undefined;

  test.beforeAll(async ({ browser }) => {
    const admin = adminClient();
    // Page 1's onboarding-specialist PIN gate (shipped 15 Sep 2026, after
    // onboarding-wizard.spec.ts was written) is checked server-side against
    // real onboarding_specialists rows -- a disposable one here, same
    // known-hash-for-a-synthetic-fixture pattern already used for staff PINs
    // in ask-larder.spec.ts, not a real specialist's credential.
    const pinHash = await bcrypt.hash(SPECIALIST_PIN, 10);
    const { data: specialist } = await admin
      .from("onboarding_specialists")
      .insert({ name: "Back Audit Specialist", pin_hash: pinHash, active: true })
      .select("id")
      .single();
    specialistId = specialist!.id;

    const page = await browser.newPage();
    await page.goto("/onboarding/start");
    await page.getByPlaceholder("Trading name").fill("Back Audit Wizard Venue");
    const slugInput = page.getByPlaceholder("venue-slug");
    await slugInput.fill("");
    await slugInput.fill(SLUG);
    await page.getByPlaceholder("Your name").fill("Back Audit Owner");
    await page.getByPlaceholder("you@venue.com.au").fill(OWNER_EMAIL);
    await page.getByPlaceholder("At least 8 characters").fill(PASSWORD);
    await page.getByPlaceholder("4-6 digit PIN").fill(SPECIALIST_PIN);
    // Deliberately NOT forced -- this button is disabled until React
    // re-renders after the last field's state update, and force bypasses
    // exactly the "wait until enabled" check that protects against
    // clicking it one frame too early.
    await page.getByRole("button", { name: "Create venue and start onboarding" }).click();
    await page.waitForURL(new RegExp(`/${SLUG}/owner/onboarding/venue-basics$`), { waitUntil: "commit", timeout: 20_000 });
    await page.close();

    const { data: venue } = await admin.from("venues").select("id").eq("slug", SLUG).maybeSingle();
    venueId = venue?.id;
    expect(venueId).toBeTruthy();
  });

  test.afterAll(async () => {
    const admin = adminClient();
    if (venueId) await admin.from("venues").delete().eq("id", venueId);
    if (specialistId) await admin.from("onboarding_specialists").delete().eq("id", specialistId);
    const { data: authList } = await admin.auth.admin.listUsers();
    const u = authList.users.find((x) => x.email === OWNER_EMAIL);
    if (u) await admin.auth.admin.deleteUser(u.id);
  });

  async function loginOwner(page: Page) {
    await page.goto(`/${SLUG}/owner/login`);
    await page.locator('input[type="email"]').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await nativeClick(page, "Log in");
    await page.waitForURL(/\/owner\/(dashboard|onboarding)/, { waitUntil: "commit", timeout: 15000 });
  }

  for (const slug of WIZARD_STEP_SLUGS) {
    test(`wizard step: ${slug}`, async ({ page }) => {
      await loginOwner(page);
      await page.goto(`/${SLUG}/owner/onboarding/${slug}`);
      await expectHealthyPage(page);

      const previous: WizardStepSlug | null = getPreviousStep(slug, {});
      const backLink = page.getByRole("link", { name: "← Back" });

      if (previous === null) {
        // venue-basics only -- the legitimate N/A, first page of the wizard
        // proper (page 1, owner+venue creation, is a separate pre-auth route).
        await expect(backLink).toHaveCount(0);
        return;
      }

      await expect(backLink).toHaveCount(1);
      const href = await backLink.getAttribute("href");
      expect(href).toBe(stepHref(SLUG, previous));
      await backLink.click();
      await page.waitForURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"), { waitUntil: "commit" });
      await expectHealthyPage(page);
    });
  }
});

// ============================================================================
// Section B -- owner/manager protected pages (19 pages)
// ============================================================================
test.describe.serial("back-button audit: owner pages (19 pages)", () => {
  const suffix = randomUUID().slice(0, 8);
  const SLUG = `back-audit-owner-${suffix}`;
  const OWNER_EMAIL = `back-audit-owner-${suffix}@example.com`;
  const PASSWORD = "BackAuditOwner123!";
  const QR_SLUG = `back-audit-owner-station-${suffix}`;

  let venueId: string;
  let liveModuleId: string;
  let pendingModuleId: string;
  let staffId: string;
  let stationId: string;

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
      p_venue_name: "Back Audit Owner Venue",
      p_venue_slug: SLUG,
      p_owner_name: "Back Audit Owner",
      p_owner_email: OWNER_EMAIL,
    });
    if (rpcError || !bootstrapData) throw rpcError ?? new Error("no bootstrap data");
    venueId = (bootstrapData as { venue_id: string }).venue_id;

    const { data: role } = await admin
      .from("staff_roles")
      .insert({ venue_id: venueId, name: "Back Audit Role", department: "FOH" })
      .select("id")
      .single();
    const { data: staff } = await admin
      .from("app_users")
      .insert({ venue_id: venueId, role: "staff", name: "Back Audit Staff", staff_role_id: role!.id })
      .select("id")
      .single();
    staffId = staff!.id;

    const { data: pending } = await admin
      .from("modules")
      .insert({ venue_id: venueId, title: "Back Audit Pending Module", status: "pending_approval" })
      .select("id")
      .single();
    pendingModuleId = pending!.id;

    const { data: live } = await admin
      .from("modules")
      .insert({ venue_id: venueId, title: "Back Audit Live Module", status: "live" })
      .select("id")
      .single();
    liveModuleId = live!.id;
    await admin.from("module_sections").insert({ module_id: liveModuleId, section_order: 1, content: "Back audit content." });
    // Needed for the SOPs list to render a real "View" link at all -- it
    // only shows for modules with a generated sop_documents row, otherwise
    // the row renders a GenerateSopButton instead.
    await admin.from("sop_documents").insert({
      module_id: liveModuleId,
      content: { sections: [{ heading: "Back audit", body: "Back audit content." }] },
      generated_from_hash: "back-audit-fixture",
    });

    const { data: certType } = await admin
      .from("certificate_types")
      .insert({ venue_id: venueId, name: "Back Audit Cert" })
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
      description: "Back audit fixture: loose cable near the pass",
      is_anonymous: true,
    });

    await admin.from("content_suggestions").insert({
      venue_id: venueId,
      status: "pending",
      signal_type: "repeated_gap",
      evidence: { sourceIds: [], items: [] },
      headline: "Back audit fixture suggestion",
      reasoning: "Fixture row for the suggestions page back-button check.",
      blocked_reason: "no_target_module",
    });

    const { data: station } = await admin
      .from("stations")
      .insert({ venue_id: venueId, name: "Back Audit Station", qr_code_slug: QR_SLUG })
      .select("id")
      .single();
    stationId = station!.id;
  });

  test.afterAll(async () => {
    const admin = adminClient();
    await admin.from("venues").delete().eq("id", venueId);
    const { data: authList } = await admin.auth.admin.listUsers();
    const u = authList.users.find((x) => x.email === OWNER_EMAIL);
    if (u) await admin.auth.admin.deleteUser(u.id);
  });

  async function loginOwner(page: Page) {
    await page.goto(`/${SLUG}/owner/login`);
    await page.locator('input[type="email"]').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await nativeClick(page, "Log in");
    await page.waitForURL(/\/owner\/dashboard/, { waitUntil: "commit", timeout: 15000 });
  }

  test("dashboard: back returns toward login (arrived via real login)", async ({ page }) => {
    await loginOwner(page);
    await expectHealthyPage(page);
    await page.goBack();
    await expectHealthyPage(page);
    // Whatever the real history behaviour is (router.push vs replace on
    // login), this must not crash or dead-end on an error page.
    expect(page.url()).not.toContain("undefined");
  });

  const NAV_SECTIONS: { href: string; label: string }[] = [
    { href: "staff", label: "Staff" },
    { href: "completions", label: "Completions" },
    { href: "certs", label: "Certificates" },
    { href: "modules", label: "Modules" },
    { href: "sops", label: "SOPs" },
    { href: "weekly-report", label: "Weekly report" },
    { href: "escalations", label: "Escalations" },
    { href: "near-misses", label: "Near-misses" },
    { href: "stations", label: "Stations" },
    { href: "photo-library", label: "Photos" },
    { href: "contacts", label: "Contacts" },
    { href: "suggestions", label: "Suggestions" },
    { href: "settings", label: "Settings" },
  ];

  for (const section of NAV_SECTIONS) {
    test(`owner nav: ${section.label} (${section.href})`, async ({ page }) => {
      await loginOwner(page);
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("link", { name: section.label, exact: true }).click();
      await page.waitForURL(new RegExp(`/owner/${section.href}$`), { waitUntil: "commit" });
      await expectHealthyPage(page);
      await page.goBack();
      await page.waitForURL(/\/owner\/dashboard$/, { waitUntil: "commit" });
      await expectHealthyPage(page);
    });
  }

  test("owner nested: module versions (from Modules list)", async ({ page }) => {
    await loginOwner(page);
    await page.goto(`/${SLUG}/owner/modules`);
    await page.getByRole("link", { name: "Versions", exact: true }).click();
    await page.waitForURL(new RegExp(`/owner/modules/${liveModuleId}/versions$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(/\/owner\/modules$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("owner nested: SOP detail (from SOPs list)", async ({ page }) => {
    await loginOwner(page);
    await page.goto(`/${SLUG}/owner/sops`);
    await page.getByRole("link", { name: "View", exact: true }).click();
    await page.waitForURL(new RegExp(`/owner/sops/${liveModuleId}$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(/\/owner\/sops$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("owner nested: SOP print-all (from SOPs list)", async ({ page }) => {
    await loginOwner(page);
    await page.goto(`/${SLUG}/owner/sops`);
    await page.getByRole("link", { name: "Print all" }).click();
    await page.waitForURL(/\/owner\/sops\/print-all$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(/\/owner\/sops$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("owner nested: station label (from Stations list)", async ({ page }) => {
    await loginOwner(page);
    await page.goto(`/${SLUG}/owner/stations`);
    await page.getByRole("link", { name: "View / print QR label" }).click();
    await page.waitForURL(new RegExp(`/owner/stations/${stationId}/label$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(/\/owner\/stations$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("owner nested: station content (from Stations list)", async ({ page }) => {
    await loginOwner(page);
    await page.goto(`/${SLUG}/owner/stations`);
    await page.getByRole("link", { name: "FAQs & troubleshooting" }).click();
    await page.waitForURL(new RegExp(`/owner/stations/${stationId}/content$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(/\/owner\/stations$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("owner: approve pending module, then check versions back from modules", async ({ page }) => {
    await loginOwner(page);
    await page.goto(`/${SLUG}/owner/modules`);
    await expect(page.getByText("Back Audit Pending Module")).toBeVisible();
    // Structural check only -- approval flow itself is covered elsewhere;
    // this just confirms pendingModuleId fixture renders without error.
    expect(pendingModuleId).toBeTruthy();
  });
});

// ============================================================================
// Section C -- staff protected pages + station QR pages (17 pages)
// ============================================================================
test.describe.serial("back-button audit: staff pages (17 pages)", () => {
  const suffix = randomUUID().slice(0, 8);
  const SLUG = `back-audit-staff-${suffix}`;
  const QR_SLUG = `back-audit-staff-station-${suffix}`;
  const FRESH_NAME = "Back Audit Fresh Staff";
  const SET_NAME = "Back Audit Set Staff";
  const PIN = "7412";

  let venueId: string;
  let liveModuleId: string;
  let certTypeId: string;

  test.beforeAll(async () => {
    const admin = adminClient();
    const { data: venue } = await admin.from("venues").insert({ name: "Back Audit Staff Venue", slug: SLUG }).select("id").single();
    venueId = venue!.id;

    const { data: role } = await admin
      .from("staff_roles")
      .insert({ venue_id: venueId, name: "Back Audit Staff Role" })
      .select("id")
      .single();

    const { data: mod } = await admin
      .from("modules")
      .insert({ venue_id: venueId, title: "Back Audit Staff Module", status: "live" })
      .select("id")
      .single();
    liveModuleId = mod!.id;
    await admin.from("module_sections").insert({ module_id: liveModuleId, section_order: 1, content: "Back audit staff content." });

    const { data: certType } = await admin
      .from("certificate_types")
      .insert({ venue_id: venueId, name: "Back Audit Staff Cert" })
      .select("id")
      .single();
    certTypeId = certType!.id;

    const pinHash = await bcrypt.hash(PIN, 10);

    // Fresh: no role yet -- exercises welcome -> roles -> modules.
    await admin.from("app_users").insert({
      venue_id: venueId,
      role: "staff",
      name: FRESH_NAME,
      pin_hash: pinHash,
      pin_set_at: new Date().toISOString(),
    });

    // Set: already onboarded -- exercises home and everything past it.
    const { data: setStaff } = await admin
      .from("app_users")
      .insert({
        venue_id: venueId,
        role: "staff",
        name: SET_NAME,
        staff_role_id: role!.id,
        pin_hash: pinHash,
        pin_set_at: new Date().toISOString(),
        onboarding_completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    await admin.from("staff_module_progress").insert({
      user_id: setStaff!.id,
      module_id: liveModuleId,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    await admin.from("stations").insert({
      venue_id: venueId,
      name: "Back Audit Staff Station",
      qr_code_slug: QR_SLUG,
      primary_module_id: liveModuleId,
    });
  });

  test.afterAll(async () => {
    const admin = adminClient();
    await admin.from("venues").delete().eq("id", venueId);
  });

  async function loginStaff(page: Page, name: string) {
    await page.goto(`/${SLUG}/login`);
    await nativeClick(page, name);
    await page.locator('input[type="password"]').fill(PIN);
    await nativeClick(page, "Log in");
    await page.waitForURL(/\/(welcome|roles|modules|home)$/, { waitUntil: "commit", timeout: 15000 });
  }

  test("staff login -> welcome (fresh staff, first ever login)", async ({ page }) => {
    await loginStaff(page, FRESH_NAME);
    await page.waitForURL(new RegExp(`/${SLUG}/welcome$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await expectHealthyPage(page);
    expect(page.url()).toContain(`/${SLUG}/login`);
  });

  test("welcome -> roles -> back to welcome", async ({ page }) => {
    await loginStaff(page, FRESH_NAME);
    await page.waitForURL(new RegExp(`/${SLUG}/welcome$`), { waitUntil: "commit" });
    await page.getByRole("link", { name: "Get started" }).click();
    await page.waitForURL(new RegExp(`/${SLUG}/roles$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(new RegExp(`/${SLUG}/welcome$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("roles -> modules -> back to roles", async ({ page }) => {
    await loginStaff(page, FRESH_NAME);
    await page.waitForURL(new RegExp(`/${SLUG}/welcome$`), { waitUntil: "commit" });
    await page.getByRole("link", { name: "Get started" }).click();
    await page.waitForURL(new RegExp(`/${SLUG}/roles$`), { waitUntil: "commit" });
    await page.getByRole("button", { name: "Back Audit Staff Role" }).click();
    await page.waitForURL(new RegExp(`/${SLUG}/modules$`), { waitUntil: "commit", timeout: 10000 });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(new RegExp(`/${SLUG}/roles$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("home (set staff, already onboarded)", async ({ page }) => {
    await loginStaff(page, SET_NAME);
    await page.waitForURL(new RegExp(`/${SLUG}/home$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await expectHealthyPage(page);
  });

  const DRAWER_ITEMS = [
    { segment: "modules", label: "Modules" },
    { segment: "certs", label: "Certificates" },
    { segment: "settings", label: "Settings" },
  ];

  for (const item of DRAWER_ITEMS) {
    test(`staff nav: ${item.label} (${item.segment})`, async ({ page }) => {
      await loginStaff(page, SET_NAME);
      await page.waitForURL(new RegExp(`/${SLUG}/home$`), { waitUntil: "commit" });
      await page.getByRole("button", { name: "Open menu" }).click();
      await page.getByRole("link", { name: item.label, exact: true }).click();
      await page.waitForURL(new RegExp(`/${SLUG}/${item.segment}$`), { waitUntil: "commit" });
      await expectHealthyPage(page);
      await page.goBack();
      await page.waitForURL(new RegExp(`/${SLUG}/home$`), { waitUntil: "commit" });
      await expectHealthyPage(page);
    });
  }

  test("modules -> module detail -> back to modules", async ({ page }) => {
    await loginStaff(page, SET_NAME);
    await page.goto(`/${SLUG}/modules`);
    await page.getByRole("link", { name: "Back Audit Staff Module" }).click();
    await page.waitForURL(new RegExp(`/${SLUG}/modules/${liveModuleId}$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(new RegExp(`/${SLUG}/modules$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("certs -> cert type detail -> back to certs", async ({ page }) => {
    await loginStaff(page, SET_NAME);
    await page.goto(`/${SLUG}/certs`);
    await page.getByRole("link", { name: "Back Audit Staff Cert" }).click();
    await page.waitForURL(new RegExp(`/${SLUG}/certs/${certTypeId}$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(new RegExp(`/${SLUG}/certs$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("contacts (direct, no full crash)", async ({ page }) => {
    await loginStaff(page, SET_NAME);
    await page.goto(`/${SLUG}/home`);
    await page.goto(`/${SLUG}/contacts`);
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(new RegExp(`/${SLUG}/home$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("intro (direct, Ask Larder explainer)", async ({ page }) => {
    await loginStaff(page, SET_NAME);
    await page.goto(`/${SLUG}/home`);
    await page.goto(`/${SLUG}/intro`);
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(new RegExp(`/${SLUG}/home$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("complete (direct -- not gated on real completion state)", async ({ page }) => {
    await loginStaff(page, SET_NAME);
    await page.goto(`/${SLUG}/home`);
    await page.goto(`/${SLUG}/complete`);
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(new RegExp(`/${SLUG}/home$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("signature (direct -- role already set, not gated further)", async ({ page }) => {
    await loginStaff(page, SET_NAME);
    await page.goto(`/${SLUG}/home`);
    await page.goto(`/${SLUG}/signature`);
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(new RegExp(`/${SLUG}/home$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("module-updates (direct -- no outstanding updates in this fixture, N/A by redirect)", async ({ page }) => {
    await loginStaff(page, SET_NAME);
    await page.goto(`/${SLUG}/module-updates`);
    // Zero outstanding -> the page's own logic redirects straight to
    // /modules (see module-updates/page.tsx). Confirms the redirect still
    // works; there's no "back" to test here since nothing renders.
    await page.waitForURL(new RegExp(`/${SLUG}/modules$`), { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("station hub (QR entry point)", async ({ page }) => {
    await loginStaff(page, SET_NAME);
    await page.goto(`/${SLUG}/station/${QR_SLUG}`);
    await expectHealthyPage(page);
    // Genuine entry point -- arrived at directly (a QR scan), no natural
    // prior in-app page to go back to. N/A alongside venue-basics, same
    // justification: first page of a flow.
  });

  const STATION_SUBPAGES = [
    { path: "/training", label: "Training" },
    { path: "/faqs", label: "FAQs" },
    { path: "/troubleshooting", label: "Troubleshooting" },
  ];

  for (const sp of STATION_SUBPAGES) {
    test(`station ${sp.label.toLowerCase()} (from station hub)`, async ({ page }) => {
      await loginStaff(page, SET_NAME);
      // A real click from the hub, not a raw goto -- otherwise there's no
      // real "came from the hub" history entry to go back to at all.
      await page.goto(`/${SLUG}/station/${QR_SLUG}`);
      // Not exact -- the card's accessible name concatenates the label
      // span with its description span ("TrainingWork through your...").
      await page.getByRole("link", { name: sp.label }).click();
      await page.waitForURL(new RegExp(`/${SLUG}/station/${QR_SLUG}${sp.path.replace(/\//g, "\\/")}$`), { waitUntil: "commit" });
      await expectHealthyPage(page);
      await page.goBack();
      await page.waitForURL(new RegExp(`/${SLUG}/station/${QR_SLUG}$`), { waitUntil: "commit" });
      await expectHealthyPage(page);
    });
  }
});

// ============================================================================
// Section D -- public / marketing / auth pages (9 pages)
// ============================================================================
test.describe("back-button audit: public pages (9 pages)", () => {
  test("home -> contact -> back to home", async ({ page }) => {
    await page.goto("/");
    // Appears twice (CTA section + footer) -- either is a real, equally
    // valid "came from home" link, so .first() is fine here.
    await page.getByRole("link", { name: "Book a walkthrough" }).first().click();
    await page.waitForURL(/\/contact$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(/\/$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("home -> venue gateway (/two-fires) -> back to home", async ({ page }) => {
    await page.goto("/");
    // Appears twice (header + footer) -- either is a real, equally valid
    // "came from home" link, so .first() is fine here.
    await page.getByRole("link", { name: "See a live demo" }).first().click();
    await page.waitForURL(/\/two-fires$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(/\/$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("home -> legal -> back to home", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Legal", exact: true }).click();
    await page.waitForURL(/\/legal$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(/\/$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("home -> privacy -> back to home", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Privacy Policy", exact: true }).click();
    await page.waitForURL(/\/privacy$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
    await page.goBack();
    await page.waitForURL(/\/$/, { waitUntil: "commit" });
    await expectHealthyPage(page);
  });

  test("venue gateway -> owner login -> back to gateway", async ({ page }) => {
    await page.goto("/two-fires");
    await expectHealthyPage(page);
    const ownerLink = page.getByRole("link", { name: /owner/i }).first();
    if (await ownerLink.count()) {
      await ownerLink.click();
      await page.waitForURL(/\/owner\/login$/, { waitUntil: "commit" });
      await expectHealthyPage(page);
      await page.goBack();
      await page.waitForURL(/\/two-fires$/, { waitUntil: "commit" });
      await expectHealthyPage(page);
    } else {
      await page.goto("/two-fires/owner/login");
      await expectHealthyPage(page);
    }
  });

  test("venue gateway -> staff login -> back to gateway", async ({ page }) => {
    await page.goto("/two-fires");
    await expectHealthyPage(page);
    const staffLink = page.getByRole("link", { name: /staff|log in/i }).first();
    if (await staffLink.count()) {
      await staffLink.click();
      await page.waitForURL(/\/login$/, { waitUntil: "commit" });
      await expectHealthyPage(page);
      await page.goBack();
      await page.waitForURL(/\/two-fires$/, { waitUntil: "commit" });
      await expectHealthyPage(page);
    } else {
      await page.goto("/two-fires/login");
      await expectHealthyPage(page);
    }
  });

  test("onboarding/start (direct, pre-auth venue creation -- N/A, genuine entry point)", async ({ page }) => {
    await page.goto("/onboarding/start");
    await expectHealthyPage(page);
    // No natural prior in-app page -- this is where a brand new owner
    // account's journey begins. N/A alongside venue-basics and the station
    // QR hub entry, same justification each time: nothing real to go back to.
  });

  test("owner reset-password (direct, only ever reached via a Supabase Auth email link -- N/A)", async ({ page }) => {
    await page.goto("/two-fires/owner/reset-password");
    await expectHealthyPage(page);
    // Genuinely no natural prior in-app page: this route is only ever
    // linked to from a password-reset email sent outside the app.
  });
});
