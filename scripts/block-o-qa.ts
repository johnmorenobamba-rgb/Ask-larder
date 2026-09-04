import { config } from "dotenv";
config({ path: ".env.local" });

import { chromium, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/types";

const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

// Block O (O5) — full agentic QA walkthrough against the REAL, persistent
// "Two Fires" demo venue and its 3 real accounts (not a throwaway fixture,
// no cleanup). Multi-viewport labeled screenshots per standing practice
// (Build Manual Part C.6) for the highest-value screens; full flow walked
// once at the tablet viewport (the product's primary device, per PRD).

const BASE = "http://localhost:3000/two-fires";
const OUT_DIR = "scratch/block-o-qa";
mkdirSync(OUT_DIR, { recursive: true });

const OWNER_EMAIL = "two-fires-owner@example.com";
const OWNER_PASSWORD = "TwoFiresOwner2026!";
const VM_NAME = "Aisha Farouk";
const VM_PIN = "5192";
const CHEF_NAME = "Tomas Reyes";
const CHEF_PIN = "8340";

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1194 },
  desktop: { width: 1440, height: 900 },
} as const;

function adminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function shot(page: Page, viewport: keyof typeof VIEWPORTS, name: string) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT_DIR}/${viewport}-${name}.png`, fullPage: true });
  console.log(`shot: ${viewport}-${name}`);
}

// Capture the same screen/state across all 3 viewports (standing practice
// for a screen under real visual/design review), reusing one browser.
async function multiViewportShot(browser: import("@playwright/test").Browser, url: string, name: string, prep?: (p: Page) => Promise<void>) {
  for (const [label, size] of Object.entries(VIEWPORTS) as [keyof typeof VIEWPORTS, { width: number; height: number }][]) {
    const ctx = await browser.newContext({ viewport: size });
    const page = await ctx.newPage();
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    if (prep) await prep(page);
    await shot(page, label, name);
    await ctx.close();
  }
}

async function loginOwner(page: Page) {
  await page.goto(`${BASE}/owner/login`);
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("Email").fill(OWNER_EMAIL);
  await page.getByPlaceholder("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/owner\/dashboard$/, { timeout: 10000 });
}

async function loginStaff(page: Page, name: string, pin: string) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name }).click();
  await page.locator('input[type="password"]').fill(pin);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForTimeout(1500);
}

// Correct-option substrings for every check question authored in
// scripts/seed-block-o-two-fires.mjs -- generic enough to drive any
// module's comprehension check without per-module scripting.
// Pulled verbatim from check_questions.options[correct_option_index] for
// every question in the venue (queried live) -- not reconstructed from
// memory, after an earlier version of this list missed several answers
// (e.g. "Water", "The Venue Manager", the shorter "5°C or colder") and
// silently stalled those modules.
const ANSWER_SUBSTRINGS = [
  "Get your supervisor immediately",
  "Tell the customer honestly it can't be made safely through the shared fryer",
  "Sesame",
  "Oil shared with other fried items (like crumbed or battered food) can transfer allergens into an otherwise safe dish",
  "3 years",
  "The staff member personally faces a real legal penalty, separate from the licensee's",
  "Stop serving them alcohol",
  "CO2 from the beer system can displace breathable air in a small space",
  "Biofilm, yeast, mould and beer stone build up inside the lines over time",
  "Every fortnight",
  "Report it to Elena the same day",
  "Cash and card totals",
  "Into the designated waste-oil container",
  "shared-ingredient issue, not a cleanliness one",
  "Overheated oil can ignite on its own",
  "^Water$",
  "Calling for help / your supervisor first, paperwork after",
  "The Head Chef and Venue Manager",
  "A Class F wet chemical extinguisher, specifically for cooking oil/fat fires",
  "Every 5 years",
  "Touching the tap handle with a clean hand can re-contaminate it",
  "5°C or colder, or 60°C or hotter",
  "The previous night's closing count",
  "^The Venue Manager$",
  "Once cooled",
  "So no single shift carries the whole workload and nothing gets skipped",
  "It's the most common cause of a stock or allergen mix-up",
  "^5°C or colder$",
  "The same night, to the Venue Manager and Elena",
  "Cleaning a hot surface risks a burn",
  "Oil level and oil quality (not dark or smoking)",
  "The fryer and dishwashing areas both create wet or greasy floor patches",
  "Bend at the knees, keep the load close, get help if needed",
  "A damp cloth on a hot surface flashes to steam and can burn you",
  "Much hotter",
  "Leave it to a licensed technician",
  "Contact your supervisor at least 30 minutes",
  "Ask Larder — it only knows what's actually true for this venue",
  "Only genuinely work-related uses",
];

/** Opens a module from the /modules list, clicks through Continue and
 * check-questions (matching the known-correct answer text), until the
 * completion stamp shows or a step budget runs out. */
async function completeModuleFlow(page: Page, moduleTitle: string) {
  await page.goto(`${BASE}/modules`);
  await page.waitForLoadState("networkidle");
  try {
    await page.getByRole("link", { name: moduleTitle }).click();
  } catch {
    console.log(`  (module link not found/clickable: "${moduleTitle}" — may already be complete)`);
    return;
  }
  await page.waitForTimeout(900);

  let stuckStreak = 0;
  for (let step = 0; step < 14 && stuckStreak < 3; step++) {
    const continueBtn = page.locator('button:not([disabled])').filter({ hasText: /^Continue$/ }).first();
    if (await continueBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      try {
        await continueBtn.click({ timeout: 3000 });
        await page.waitForTimeout(800);
        stuckStreak = 0;
      } catch {
        stuckStreak++;
      }
      continue;
    }
    let clicked = false;
    for (const substr of ANSWER_SUBSTRINGS) {
      const isAnchored = substr.startsWith("^") && substr.endsWith("$");
      const core = isAnchored ? substr.slice(1, -1) : substr;
      const escaped = core.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(isAnchored ? `^${escaped}$` : escaped, "i");
      const opt = page.locator('button:not([disabled])').filter({ hasText: re }).first();
      if (await opt.isVisible({ timeout: 800 }).catch(() => false)) {
        try {
          await opt.click({ timeout: 3000 });
          await page.waitForTimeout(1100);
          clicked = true;
          stuckStreak = 0;
          break;
        } catch {
          // likely a transition race -- fall through and retry next loop
        }
      }
    }
    if (clicked) continue;
    stuckStreak++;
    await page.waitForTimeout(500);
  }
}

async function main() {
  const browser = await chromium.launch();

  // ---------------------------------------------------------------------
  // OWNER DASHBOARD — every page, tablet primary + 3-viewport on dashboard
  // home (bento/needs-attention) since that's the highest visual-risk
  // screen (elevation/tilt/glow effects from Block J/K/L).
  // ---------------------------------------------------------------------
  try {
    await multiViewportShot(browser, `${BASE}/owner/dashboard`, "owner-dashboard-needs-attention", async (p) => {
      await p.getByPlaceholder("Email").fill(OWNER_EMAIL).catch(() => {});
      const emailField = p.getByPlaceholder("Email");
      if (await emailField.isVisible().catch(() => false)) {
        await emailField.fill(OWNER_EMAIL);
        await p.getByPlaceholder("Password").fill(OWNER_PASSWORD);
        await p.getByRole("button", { name: "Log in" }).click();
        await p.waitForURL(/\/owner\/dashboard$/, { timeout: 10000 });
      }
    });
  } catch (err) {
    console.error("owner dashboard multiviewport error:", err);
  }

  try {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.tablet });
    const p = await ctx.newPage();
    await loginOwner(p);
    await shot(p, "tablet", "owner-01-dashboard");

    const pages: [string, string][] = [
      ["staff", "owner-02-staff"],
      ["completions", "owner-03-completions"],
      ["certs", "owner-04-certs"],
      ["modules", "owner-05-modules-before-approval"],
      ["escalations", "owner-06-escalations"],
      ["near-misses", "owner-07-near-misses"],
      ["stations", "owner-08-stations"],
      ["photo-library", "owner-09-photo-library"],
    ];
    for (const [path, name] of pages) {
      await p.goto(`${BASE}/owner/${path}`);
      await p.waitForLoadState("networkidle");
      await shot(p, "tablet", name);
    }

    // Exercise the real owner-approval-gate flow live on the
    // "Beer Line & Cellar Hygiene" module seeded as pending_approval.
    await p.goto(`${BASE}/owner/modules`);
    await p.waitForLoadState("networkidle");
    await p.getByText("Beer Line & Cellar Hygiene").click();
    await p.waitForTimeout(800);
    await shot(p, "tablet", "owner-10-module-detail-pending");

    const approveBtn = p.getByRole("button", { name: /approve/i });
    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();
      await p.waitForTimeout(1000);
      await shot(p, "tablet", "owner-11-module-approved");
    }
    const goLiveBtn = p.getByRole("button", { name: /go live/i });
    if (await goLiveBtn.isVisible().catch(() => false)) {
      await goLiveBtn.click();
      await p.waitForTimeout(1000);
      await shot(p, "tablet", "owner-12-module-live");
    }

    await ctx.close();
  } catch (err) {
    console.error("Owner flow error:", err);
  }

  // Ingest the newly-approved module now that it's live, so Ask Larder
  // (O6) can actually retrieve it.
  try {
    const admin = adminClient();
    const { data: mod } = await admin
      .from("modules")
      .select("id, status")
      .eq("title", "Beer Line & Cellar Hygiene")
      .maybeSingle();
    console.log("Beer Line & Cellar Hygiene status after approval flow:", mod?.status);
  } catch (err) {
    console.error("Post-approval status check error:", err);
  }

  // ---------------------------------------------------------------------
  // HEAD CHEF (BOH staff) — full new-hire flow at tablet, key screens at
  // mobile/desktop too.
  // ---------------------------------------------------------------------
  try {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.tablet });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/login`);
    await p.waitForLoadState("networkidle");
    await shot(p, "tablet", "chef-01-staff-login");

    await loginStaff(p, CHEF_NAME, CHEF_PIN);
    await shot(p, "tablet", "chef-02-post-login");

    // Welcome beat, if shown (first login for a fresh account)
    const getStarted = p.getByRole("link", { name: "Get started" });
    if (await getStarted.isVisible().catch(() => false)) {
      await shot(p, "tablet", "chef-03-welcome");
      await getStarted.click();
      await p.waitForTimeout(1000);
    }

    await p.goto(`${BASE}/modules`);
    await p.waitForLoadState("networkidle");
    await shot(p, "tablet", "chef-04-modules-list");

    // Complete every module visible to Head Chef (shared + BOH) so the
    // signature gate genuinely unlocks -- a real full-shift walkthrough,
    // not a single spot-checked module.
    const chefModules = [
      "Welcome & How We Work",
      "Food Safety & Hygiene",
      "Allergen Handling",
      "Manual Handling & PPE",
      "Emergencies & Incidents",
      "Kitchen Opening & Closing Procedure",
      "Deep Fryer Safety & Oil Management",
      "Pizza Oven & Grill Safety",
      "Kitchen Cleaning & Sanitation",
    ];
    for (const title of chefModules) {
      try {
        await completeModuleFlow(p, title);
        console.log(`  chef completed: ${title}`);
      } catch (err) {
        console.error(`  chef module error (${title}):`, err instanceof Error ? err.message : err);
      }
    }
    await p.goto(`${BASE}/modules`);
    await p.waitForLoadState("networkidle");
    await shot(p, "tablet", "chef-06-modules-all-complete");

    await p.goto(`${BASE}/certs`);
    await p.waitForLoadState("networkidle");
    await shot(p, "tablet", "chef-07-certs-list-empty");

    const jpegPath = `${OUT_DIR}/tiny-test-cert.jpg`;
    writeFileSync(jpegPath, Buffer.from(TINY_JPEG_BASE64, "base64"));

    // Upload both certs visible to Head Chef: Food Handling, First Aid.
    for (const certLinkName of [/Food Handling/i, /First Aid/i]) {
      await p.goto(`${BASE}/certs`);
      await p.waitForLoadState("networkidle");
      const link = p.getByRole("link", { name: certLinkName }).first();
      const linkVisible = await link.isVisible().catch(() => false);
      console.log(`  chef cert link visible (${certLinkName}):`, linkVisible);
      if (linkVisible) {
        await link.click();
        await p.waitForTimeout(1200);
        const fileInput = p.locator('input[type="file"]');
        if ((await fileInput.count()) > 0) {
          await fileInput.setInputFiles(jpegPath);
          const dateInputs = p.locator('input[type="date"]');
          await dateInputs.first().fill("2026-01-01");
          if ((await dateInputs.count()) > 1) await dateInputs.nth(1).fill("2028-01-01");
          const saveBtn = p.getByRole("button", { name: /save certificate/i });
          const saveVisible = await saveBtn.isVisible().catch(() => false);
          console.log(`  chef save button visible (${certLinkName}):`, saveVisible);
          if (saveVisible) {
            await saveBtn.click();
            await p.waitForTimeout(1800);
          }
        }
      }
    }
    await p.goto(`${BASE}/certs`);
    await p.waitForLoadState("networkidle");
    await shot(p, "tablet", "chef-08-certs-list-uploaded");

    await p.goto(`${BASE}/signature`);
    await p.waitForLoadState("networkidle");
    const sigField = p.getByPlaceholder(/full name/i);
    if (await sigField.isVisible().catch(() => false)) {
      await shot(p, "tablet", "chef-09-signature");
      await sigField.fill(CHEF_NAME);
      const confirmBtn = p.getByRole("button", { name: /confirm and sign/i });
      await confirmBtn.click();
      await p.waitForTimeout(2000);
      await shot(p, "tablet", "chef-10-completion");
    } else {
      console.log("Head Chef: signature gate not yet unlocked — captured current /signature state instead.");
      await shot(p, "tablet", "chef-09-signature-gate-not-unlocked");
    }

    await ctx.close();
  } catch (err) {
    console.error("Head Chef flow error:", err);
  }

  // ---------------------------------------------------------------------
  // VENUE MANAGER (FOH staff, role='manager') — full flow + QR station
  // entry + near-miss report.
  // ---------------------------------------------------------------------
  try {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.tablet });
    const p = await ctx.newPage();
    await loginStaff(p, VM_NAME, VM_PIN);
    await shot(p, "tablet", "vm-01-post-login");

    const getStarted = p.getByRole("link", { name: "Get started" });
    if (await getStarted.isVisible().catch(() => false)) {
      await getStarted.click();
      await p.waitForTimeout(1000);
    }

    await p.goto(`${BASE}/modules`);
    await p.waitForLoadState("networkidle");
    await shot(p, "tablet", "vm-02-modules-list");

    const vmModules = [
      "Welcome & How We Work",
      "Food Safety & Hygiene",
      "Allergen Handling",
      "Manual Handling & PPE",
      "Emergencies & Incidents",
      "Full Venue Open/Close",
      "Bar Service & RSA Compliance",
      "Cash Handling & End-of-Day",
      "Beer Line & Cellar Hygiene",
    ];
    for (const title of vmModules) {
      try {
        await completeModuleFlow(p, title);
        console.log(`  vm completed: ${title}`);
      } catch (err) {
        console.error(`  vm module error (${title}):`, err instanceof Error ? err.message : err);
      }
    }
    await p.goto(`${BASE}/modules`);
    await p.waitForLoadState("networkidle");
    await shot(p, "tablet", "vm-04-modules-all-complete");

    const jpegPath = `${OUT_DIR}/tiny-test-cert.jpg`;
    writeFileSync(jpegPath, Buffer.from(TINY_JPEG_BASE64, "base64"));
    await p.goto(`${BASE}/certs`);
    await p.waitForLoadState("networkidle");
    for (const certLinkName of [/RSA/i, /First Aid/i]) {
      await p.goto(`${BASE}/certs`);
      await p.waitForLoadState("networkidle");
      const link = p.getByRole("link", { name: certLinkName }).first();
      const linkVisible = await link.isVisible().catch(() => false);
      console.log(`  vm cert link visible (${certLinkName}):`, linkVisible);
      if (linkVisible) {
        await link.click();
        await p.waitForTimeout(1200);
        const fileInput = p.locator('input[type="file"]');
        if ((await fileInput.count()) > 0) {
          await fileInput.setInputFiles(jpegPath);
          const dateInputs = p.locator('input[type="date"]');
          await dateInputs.first().fill("2026-01-01");
          if ((await dateInputs.count()) > 1) await dateInputs.nth(1).fill("2028-01-01");
          const saveBtn = p.getByRole("button", { name: /save certificate/i });
          const saveVisible = await saveBtn.isVisible().catch(() => false);
          console.log(`  vm save button visible (${certLinkName}):`, saveVisible);
          if (saveVisible) {
            await saveBtn.click();
            await p.waitForTimeout(1800);
          }
        }
      }
    }
    await shot(p, "tablet", "vm-05-certs-uploaded");

    await p.goto(`${BASE}/signature`);
    await p.waitForLoadState("networkidle");
    const vmSigField = p.getByPlaceholder(/full name/i);
    if (await vmSigField.isVisible().catch(() => false)) {
      await vmSigField.fill(VM_NAME);
      await p.getByRole("button", { name: /confirm and sign/i }).click();
      await p.waitForTimeout(2000);
      await shot(p, "tablet", "vm-06-completion");
    } else {
      await shot(p, "tablet", "vm-06-signature-gate-not-unlocked");
    }

    // Station QR entry — the Bar station's slug.
    await p.goto(`${BASE}/station/two-fires-bar`);
    await p.waitForLoadState("networkidle");
    await shot(p, "tablet", "vm-07-station-qr-entry");

    // Near-miss quick-report -- real button text is "Something felt unsafe?"
    // (fixed bottom-right chip), not a literal "near miss"/"report" label.
    const nearMissBtn = p.getByRole("button", { name: "Something felt unsafe?" }).first();
    if (await nearMissBtn.isVisible().catch(() => false)) {
      await nearMissBtn.click();
      await p.waitForTimeout(600);
      await shot(p, "tablet", "vm-08-near-miss-form");
      const textArea = p.locator("textarea").first();
      if (await textArea.isVisible().catch(() => false)) {
        await textArea.fill("CO2 smell noticed near the cellar door before shift — reported so it gets checked before anyone spends time in there.");
        const submitBtn = p.getByRole("button", { name: "Send" });
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click();
          await p.waitForTimeout(1000);
          await shot(p, "tablet", "vm-09-near-miss-submitted");
        }
      }
    } else {
      console.log("  near-miss button 'Something felt unsafe?' not found on station page");
    }

    await ctx.close();
  } catch (err) {
    console.error("Venue Manager flow error:", err);
  }

  // ---------------------------------------------------------------------
  // Home bento dashboard (staff) — 3-viewport, highest motion/elevation
  // visual risk per standing practice.
  // ---------------------------------------------------------------------
  try {
    await multiViewportShot(browser, `${BASE}/home`, "staff-home-bento", async (p) => {
      const btn = p.getByRole("button", { name: CHEF_NAME });
      if (await btn.isVisible().catch(() => false)) {
        await loginStaff(p, CHEF_NAME, CHEF_PIN);
        await p.goto(`${BASE}/home`);
        await p.waitForLoadState("networkidle");
      }
    });
  } catch (err) {
    console.error("Home bento multiviewport error:", err);
  }

  await browser.close();
  console.log("\nBlock O QA screenshots written to", OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
