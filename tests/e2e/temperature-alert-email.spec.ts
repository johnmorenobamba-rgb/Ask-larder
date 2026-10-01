import { config } from "dotenv";
config({ path: ".env.local" });

import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/types";

// DELIBERATE owner alert email test (Stage 0b). Runs only when RUN_ALERT_EMAIL_TEST=1, against
// a dev server started with COMPLIANCE_ALERT_EMAIL_ENABLED=true and
// COMPLIANCE_ALERT_EMAIL_TEST_RECIPIENT=delivered@resend.dev. Two independent safeguards keep a
// real person from being emailed: the server only sends to the test recipient outside production,
// AND this spec's fixture owner address is itself a Resend test address (delivered+<id>@resend.dev),
// so even a misconfigured server could only reach Resend's sandbox. The disposable venue is removed
// with the service role afterwards. No other spec turns email on.
test.skip(process.env.RUN_ALERT_EMAIL_TEST !== "1", "set RUN_ALERT_EMAIL_TEST=1 and start the dev server with the alert env vars");

function adminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const suffix = randomUUID().slice(0, 8);
const SLUG = `temp-alert-${suffix}`;
const OWNER_EMAIL = `delivered+ta${suffix}@resend.dev`;
const PIN = "4821";
let venueId = "";
let ownerAuthId = "";
let kitId = "";
let unitId = "";

async function nativeClick(page: Page, text: string) {
  const ok = await page.evaluate((t) => {
    const el = Array.from(document.querySelectorAll("button")).find((e) => e.textContent?.trim() === t) as HTMLElement | undefined;
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!ok) throw new Error(`no button "${text}"`);
}

test.beforeAll(async () => {
  const admin = adminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({ email: OWNER_EMAIL, password: "TempAlertOwner123!", email_confirm: true });
  if (authError || !authData.user) throw authError ?? new Error("no owner user");
  ownerAuthId = authData.user.id;
  const { data: boot, error } = await admin.rpc("bootstrap_owner", {
    p_auth_id: ownerAuthId,
    p_venue_name: "Temp Alert Test Venue",
    p_venue_slug: SLUG,
    p_owner_name: "Temp Alert Owner",
    p_owner_email: OWNER_EMAIL,
  });
  if (error || !boot) throw error ?? new Error("no bootstrap data");
  venueId = (boot as { venue_id: string }).venue_id;
  const { data: role } = await admin.from("staff_roles").insert({ venue_id: venueId, name: "Kitchen Hand", department: "BOH", fallback_tier: "frontline" }).select("id").single();
  const { data: kit } = await admin
    .from("app_users")
    .insert({ venue_id: venueId, role: "staff", name: "Kit Hand", staff_role_id: role!.id, pin_hash: await bcrypt.hash(PIN, 10), pin_set_at: new Date().toISOString(), onboarding_completed_at: new Date().toISOString() })
    .select("id")
    .single();
  kitId = kit!.id;
  const { data: unit } = await admin.from("venue_refrigeration_units").insert({ venue_id: venueId, name: "Walk in cool room", unit_type: "cold", max_temp_c: 5 }).select("id").single();
  unitId = unit!.id;
});

test.afterAll(async () => {
  const admin = adminClient();
  if (venueId) await admin.from("venues").delete().eq("id", venueId);
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of authList?.users ?? []) {
    if (u.id === ownerAuthId || u.email === `staff-${kitId}@venue.internal`) await admin.auth.admin.deleteUser(u.id);
  }
});

test("one email per out of range EPISODE, to the Resend test address only", async ({ page }) => {
  await page.goto(`/${SLUG}/login`);
  await nativeClick(page, "Kit Hand");
  await page.locator('input[type="password"]').fill(PIN);
  await nativeClick(page, "Log in");
  await page.waitForURL(/\/(welcome|roles|modules|home)$/, { waitUntil: "commit", timeout: 20_000 });

  const post = async (readingC: number, note?: string) => {
    const res = await page.request.post(`/api/staff/compliance/b2`, { data: { entries: [{ clientRequestId: randomUUID(), unitId, readingC, correctiveAction: note }] } });
    expect(res.status()).toBe(200);
    return (await res.json()) as { ownerAlertsSent: number };
  };
  const admin = adminClient();
  const alerts = async () => {
    const { data: subs } = await admin.from("compliance_form_submissions").select("id").eq("venue_id", venueId);
    const { data } = await admin
      .from("compliance_alert_log")
      .select("submission_id, email_sent_at, email_error, email_attempts")
      .in("submission_id", (subs ?? []).map((s) => s.id));
    return data ?? [];
  };

  // 1. first out of range reading starts an episode: exactly one email sent
  expect((await post(9, "Door ajar, closed it")).ownerAlertsSent).toBe(1);
  let rows = await alerts();
  expect(rows).toHaveLength(1);
  expect(rows[0].email_sent_at).not.toBeNull();
  expect(rows[0].email_error).toBeNull();

  // 2. still out of range: the same episode, NO second email
  expect((await post(10, "Still warm, called technician")).ownerAlertsSent).toBe(0);
  expect(await alerts()).toHaveLength(1);

  // 3. back in range ends the episode: no email
  expect((await post(4)).ownerAlertsSent).toBe(0);

  // 4. out of range again after being in range: a NEW episode, a second email
  expect((await post(8, "Failed again")).ownerAlertsSent).toBe(1);
  rows = await alerts();
  expect(rows).toHaveLength(2);
  expect(rows.every((r) => r.email_sent_at !== null && r.email_error === null)).toBe(true);
});
