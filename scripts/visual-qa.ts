import { config } from "dotenv";
config({ path: ".env.local" });

import { chromium } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import type { Database } from "../src/lib/supabase/types";

// Final full-coverage visual QA pass — NOT a Playwright test. Seeds a rich
// throwaway venue (everything needed for the owner "needs attention" board
// to actually flag, a real end-to-end cert upload to verify this session's
// certs-bucket RLS fix, the full new-hire flow, and the new bento
// dashboard), plus a second minimal venue purely for the owner dashboard's
// quiet state. Screenshots every distinct screen requested for review.

const OUT_DIR = "scratch/visual-qa";
mkdirSync(OUT_DIR, { recursive: true });

// 1x1 px JPEG, just enough for a real storage upload + RLS round-trip.
const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

function adminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const suffix = randomUUID().slice(0, 8);
const SLUG = `visual-qa-${suffix}`;
const OWNER_EMAIL = `visual-qa-${suffix}@example.com`;
const PASSWORD = "VisualQaPass123!";
const QR_SLUG = `visual-qa-station-${suffix}`;

const QUIET_SLUG = `visual-qa-quiet-${suffix}`;
const QUIET_OWNER_EMAIL = `visual-qa-quiet-${suffix}@example.com`;

async function seedRichVenue() {
  const admin = adminClient();
  const { data: authData } = await admin.auth.admin.createUser({ email: OWNER_EMAIL, password: PASSWORD, email_confirm: true });
  const { data: bootstrapData } = await admin.rpc("bootstrap_owner", {
    p_auth_id: authData!.user!.id,
    p_venue_name: "Visual QA Venue",
    p_venue_slug: SLUG,
    p_owner_name: "QA Owner",
    p_owner_email: OWNER_EMAIL,
  });
  const venueId = (bootstrapData as { venue_id: string }).venue_id;

  const { data: role } = await admin
    .from("staff_roles")
    .insert({ venue_id: venueId, name: "Kitchen Hand", department: "BOH" })
    .select("id")
    .single();

  const pinHash = await bcrypt.hash("1234", 10);
  const { data: staff } = await admin
    .from("app_users")
    .insert({ venue_id: venueId, role: "staff", name: "Jamie Rivera", pin_hash: pinHash })
    .select("id")
    .single();
  const staffId = staff!.id;

  const { data: existingStaff } = await admin
    .from("app_users")
    .insert({ venue_id: venueId, role: "staff", name: "Sam Ochoa", staff_role_id: role!.id })
    .select("id")
    .single();

  const { data: pending } = await admin
    .from("modules")
    .insert({ venue_id: venueId, title: "Knife Safety & Sanitation", status: "pending_approval" })
    .select("id")
    .single();

  const { data: live1 } = await admin
    .from("modules")
    .insert({ venue_id: venueId, title: "Opening Procedure", status: "live" })
    .select("id")
    .single();
  const liveModuleId = live1!.id;
  await admin.from("module_sections").insert({
    module_id: liveModuleId,
    section_order: 1,
    content:
      "Unlock the front door and disable the alarm using the code on the office wall. Turn on all kitchen equipment: griddle, fryers, and the coffee machine. Check the walk-in fridge temperature is between 1-4°C and log it on the compliance sheet.",
  });
  await admin.from("check_questions").insert({
    module_id: liveModuleId,
    question: "What temperature range should the walk-in fridge be?",
    options: ["1-4°C", "8-10°C", "-2-0°C", "5-7°C"],
    correct_option_index: 0,
  });

  const { data: live2 } = await admin
    .from("modules")
    .insert({ venue_id: venueId, title: "Closing Procedure", status: "live" })
    .select("id")
    .single();
  const liveModule2Id = live2!.id;
  await admin.from("module_sections").insert({
    module_id: liveModule2Id,
    section_order: 1,
    content: "Wipe down all surfaces, empty the bins, turn off equipment, and set the alarm before locking up.",
  });

  await admin
    .from("staff_module_progress")
    .insert({ user_id: existingStaff!.id, module_id: liveModuleId, status: "completed", completed_at: new Date().toISOString() });

  const { data: certTypeRSA } = await admin
    .from("certificate_types")
    .insert({ venue_id: venueId, name: "RSA" })
    .select("id")
    .single();
  const soon = new Date();
  soon.setDate(soon.getDate() + 5);
  // Seeded for BOTH staff: existingStaff (Sam Ochoa) needs it to show up in
  // the owner's expiring-certs "needs attention" flag; staffId (Jamie
  // Rivera) needs it pre-satisfied since she only uploads First Aid live
  // in the browser flow below, and both certs are required to reach
  // /signature's completion gate.
  await admin
    .from("staff_certificates")
    .insert({ user_id: existingStaff!.id, certificate_type_id: certTypeRSA!.id, expiry_date: soon.toISOString().slice(0, 10) });
  await admin
    .from("staff_certificates")
    .insert({ user_id: staffId, certificate_type_id: certTypeRSA!.id, expiry_date: soon.toISOString().slice(0, 10) });

  const { data: certTypeFirstAid } = await admin
    .from("certificate_types")
    .insert({ venue_id: venueId, name: "First Aid" })
    .select("id")
    .single();

  const { data: station } = await admin
    .from("stations")
    .insert({ venue_id: venueId, name: "Kitchen Pass", qr_code_slug: QR_SLUG })
    .select("id")
    .single();

  // Escalation spike: 4 fallback hits on the same station within 7 days
  // (threshold is 3+) so the owner "needs attention" board flags it.
  for (let i = 0; i < 4; i++) {
    await admin.from("chat_messages").insert({
      venue_id: venueId,
      user_id: existingStaff!.id,
      station_id: station!.id,
      role: "assistant",
      message: "Ask your supervisor for assistance, as they have access to the safe.",
      is_escalation: true,
    });
  }

  await admin.from("near_miss_reports").insert({
    venue_id: venueId,
    station_id: station!.id,
    description: "Loose cable near the pass, tripping hazard during service.",
    is_anonymous: true,
  });

  return { venueId, staffId, liveModuleId, liveModule2Id, certTypeFirstAidId: certTypeFirstAid!.id };
}

async function seedQuietVenue() {
  const admin = adminClient();
  const { data: authData } = await admin.auth.admin.createUser({ email: QUIET_OWNER_EMAIL, password: PASSWORD, email_confirm: true });
  const { data: bootstrapData } = await admin.rpc("bootstrap_owner", {
    p_auth_id: authData!.user!.id,
    p_venue_name: "Quiet QA Venue",
    p_venue_slug: QUIET_SLUG,
    p_owner_name: "Quiet Owner",
    p_owner_email: QUIET_OWNER_EMAIL,
  });
  const venueId = (bootstrapData as { venue_id: string }).venue_id;
  const { data: role } = await admin.from("staff_roles").insert({ venue_id: venueId, name: "Kitchen Hand" }).select("id").single();
  await admin.from("app_users").insert({ venue_id: venueId, role: "staff", name: "Quiet Staff", staff_role_id: role!.id });
  return { venueId };
}

async function cleanupVenue(venueId: string, ownerEmail: string) {
  const admin = adminClient();
  await admin.from("venues").delete().eq("id", venueId);
  const { data: authList } = await admin.auth.admin.listUsers();
  const u = authList.users.find((x) => x.email === ownerEmail);
  if (u) await admin.auth.admin.deleteUser(u.id);
}

async function main() {
  const jpegPath = `${OUT_DIR}/tiny-test-cert.jpg`;
  writeFileSync(jpegPath, Buffer.from(TINY_JPEG_BASE64, "base64"));

  const { venueId, liveModule2Id, certTypeFirstAidId } = await seedRichVenue();
  console.log("Seeded rich venue", SLUG, venueId);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 834, height: 1194 } });
  const p = await ctx.newPage();
  const shot = async (name: string) => {
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
    console.log("shot:", name);
  };

  try {
    // ---- Staff: new-hire flow ----
    await p.goto(`http://localhost:3000/${SLUG}/login`);
    await p.waitForLoadState("networkidle");
    await shot("staff-01-login");

    await p.getByRole("button", { name: "Jamie Rivera" }).click();
    await p.locator('input[type="password"]').fill("1234");
    await p.getByRole("button", { name: "Log in" }).click();
    await p.waitForURL(/\/welcome$/);
    await shot("staff-02-welcome");

    await p.getByRole("link", { name: "Get started" }).click();
    await p.waitForURL(/\/roles$/);
    await p.getByRole("button", { name: "Kitchen Hand" }).waitFor();
    await shot("staff-03-role-select");

    await p.getByRole("button", { name: "Kitchen Hand" }).click();
    await p.waitForURL(/\/modules$/);
    await shot("staff-04-module-checklist");

    await p.getByRole("link", { name: "Opening Procedure" }).click();
    await p.waitForURL(/\/modules\/.+$/);
    await p.getByRole("button", { name: "Continue" }).waitFor();
    await shot("staff-05-module-content");

    await p.getByRole("button", { name: "Continue" }).click();
    await p.getByText("What temperature range").waitFor();
    await shot("staff-06-check-question");

    await p.getByRole("button", { name: "1-4°C" }).click();
    await p.waitForTimeout(1200);
    await p.getByText("completed").waitFor();
    await shot("staff-07-module-complete-stamp");

    // Complete the second module too (needed to reach signature's gate)
    await p.goto(`http://localhost:3000/${SLUG}/modules/${liveModule2Id}`);
    await p.waitForLoadState("networkidle");
    await p.getByRole("button", { name: "Continue" }).click();
    await p.waitForTimeout(1200);

    // ---- Cert upload: real end-to-end upload, verifies this session's
    // certs-bucket RLS fix actually works live, not just the empty form ----
    await p.goto(`http://localhost:3000/${SLUG}/certs/${certTypeFirstAidId}`);
    await p.waitForLoadState("networkidle");
    await shot("staff-08-cert-upload-empty");

    await p.locator('input[type="file"]').setInputFiles(jpegPath);
    await p.locator('input[type="date"]').first().fill("2026-01-01");
    await p.locator('input[type="date"]').nth(1).fill("2027-01-01");
    await p.getByRole("button", { name: "Save certificate" }).click();
    await p.getByText("uploaded").waitFor({ timeout: 8000 });
    await shot("staff-09-cert-upload-done");

    await p.goto(`http://localhost:3000/${SLUG}/signature`);
    await p.waitForLoadState("networkidle");
    await p.getByPlaceholder("Full name").waitFor({ timeout: 5000 });
    await shot("staff-10-signature");

    await p.getByPlaceholder("Full name").fill("Jamie Rivera");
    await p.getByRole("button", { name: "Confirm and sign" }).click();
    await p.waitForURL(/\/complete$/, { timeout: 8000 });
    await shot("staff-11-completion");

    await p.waitForURL(/\/intro$/, { timeout: 5000 });
    await shot("staff-12-ask-larder-intro-beat1");

    // Advance to Beat 3 (tap-hold gesture demo) — beats auto-advance on
    // their own timers (6s, 8s), so wait past both. Cumulative elapsed
    // since landing on /intro: ~14.5s (mid Beat 3, 14-24s window).
    await p.waitForTimeout(14500);
    await shot("staff-13-ask-larder-intro-beat3-demo");

    // Skip to the end via repeated waits rather than trying to click
    // through (no skip control until the final beat, by design). Beats
    // total 6+8+10+8+8 = 40s before the final (unskippable-timer) beat —
    // wait enough more to clear that from the ~14.5s mark already elapsed.
    await p.waitForTimeout(27000);
    await p.getByRole("button", { name: "Got it" }).waitFor({ timeout: 10000 });
    await shot("staff-14-ask-larder-intro-close");
    await p.getByRole("button", { name: "Got it" }).click();
    await p.waitForURL(/\/home$/, { timeout: 5000 });
    await shot("staff-15-home-bento");

    await p.goto(`http://localhost:3000/${SLUG}/settings`);
    await p.waitForLoadState("networkidle");
    await shot("staff-16-settings");

    await p.goto(`http://localhost:3000/${SLUG}/certs`);
    await p.waitForLoadState("networkidle");
    await shot("staff-17-certs-list");

    await p.goto(`http://localhost:3000/${SLUG}/modules`);
    await p.waitForLoadState("networkidle");
    await shot("staff-18-modules-list-post-onboarding");

    // ---- Ask Larder bubble: resting + open (tap) ----
    await shot("staff-19-ask-larder-bubble-resting");
    await p.getByRole("button", { name: "Ask Larder" }).click();
    await p.waitForTimeout(500);
    await shot("staff-20-ask-larder-bubble-open");

    await ctx.close();
  } catch (err) {
    console.error("Staff flow error:", err);
    await p.screenshot({ path: `${OUT_DIR}/staff-ERROR.png`, fullPage: true }).catch(() => {});
  }

  try {
    // ---- Owner dashboard (rich venue: needs-attention state) ----
    const octx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const op = await octx.newPage();
    const oshot = async (name: string) => {
      await op.waitForTimeout(700);
      await op.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });
      console.log("shot:", name);
    };

    await op.goto(`http://localhost:3000/${SLUG}/owner/login`);
    await op.waitForLoadState("networkidle");
    await oshot("owner-01-login");

    await op.getByPlaceholder("Email").fill(OWNER_EMAIL);
    await op.getByPlaceholder("Password").fill(PASSWORD);
    await op.getByRole("button", { name: "Log in" }).click();
    await op.waitForURL(/\/owner\/dashboard$/);
    await oshot("owner-02-dashboard-needs-attention");

    const pages: [string, string][] = [
      ["staff", "owner-03-staff"],
      ["completions", "owner-04-completions"],
      ["certs", "owner-05-certs"],
      ["modules", "owner-06-modules"],
      ["escalations", "owner-07-escalations"],
      ["near-misses", "owner-08-near-misses"],
      ["stations", "owner-09-stations"],
      ["photo-library", "owner-10-photo-library"],
    ];
    for (const [path, name] of pages) {
      await op.goto(`http://localhost:3000/${SLUG}/owner/${path}`);
      await op.waitForLoadState("networkidle");
      await oshot(name);
    }

    await octx.close();
  } catch (err) {
    console.error("Owner flow error:", err);
  }

  await browser.close();
  await cleanupVenue(venueId, OWNER_EMAIL);
  console.log("Cleaned up rich venue", SLUG);

  // ---- Owner dashboard quiet state (separate minimal venue) ----
  try {
    const { venueId: quietVenueId } = await seedQuietVenue();
    console.log("Seeded quiet venue", QUIET_SLUG, quietVenueId);
    const browser2 = await chromium.launch();
    const qctx = await browser2.newContext({ viewport: { width: 1440, height: 900 } });
    const qp = await qctx.newPage();
    await qp.goto(`http://localhost:3000/${QUIET_SLUG}/owner/login`);
    await qp.waitForLoadState("networkidle");
    await qp.getByPlaceholder("Email").fill(QUIET_OWNER_EMAIL);
    await qp.getByPlaceholder("Password").fill(PASSWORD);
    await qp.getByRole("button", { name: "Log in" }).click();
    await qp.waitForURL(/\/owner\/dashboard$/);
    await qp.waitForTimeout(700);
    await qp.screenshot({ path: `${OUT_DIR}/owner-11-dashboard-quiet.png`, fullPage: true });
    console.log("shot: owner-11-dashboard-quiet");
    await browser2.close();
    await cleanupVenue(quietVenueId, QUIET_OWNER_EMAIL);
    console.log("Cleaned up quiet venue", QUIET_SLUG);
  } catch (err) {
    console.error("Quiet venue flow error:", err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
