import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "../src/lib/supabase/admin";
import { processAlerts } from "../src/lib/compliance/alerts";

// Generic owner alerts (hardening-2 task 6). Disposable venue, removed with the service role.
//  1. ALWAYS runs: with the email flag unset nothing is sent (the outcome is skipped_disabled) and the alert row stays unsent.
//  2. Runs ONLY with RUN_ALERT_EMAIL_TEST=1: ONE deliberate send, to Resend's own test address delivered@resend.dev and
//     nowhere else (the test refuses to send unless the recipient override is exactly that address and the run is not production).
// The flag is set only inside this test process, never in any env file, Vercel or the dev server.
const admin = createAdminClient();
const suffix = randomUUID().slice(0, 8);
const SLUG = `ge-${suffix}`;
let venueId = "";
let staffId = "";
let alertId = "";

const rules = {
  version: 1,
  form_version: "1",
  event: true,
  allow_correction: true,
  cosign: false,
  fields: [
    { key: "kind", type: "choice", options: ["sighting", "trap_check"], required: true },
    { key: "location", type: "text", required: true },
  ],
  fail: [{ field: "kind", op: "eq", value: "sighting", label: "Pest sighting" }],
};

async function saveSighting(location: string) {
  const { data, error } = await admin.rpc("submit_compliance_record", {
    p_venue_id: venueId,
    p_staff_id: staffId,
    p_form_id: "B12",
    p_gate_roles: ["BOH"],
    p_visible_roles: ["BOH"],
    p_rules: rules,
    p_entry: { client_request_id: randomUUID(), values: { kind: "sighting", location }, corrective_action: "Called the contractor" },
    p_device_stamp: "generic alert test",
  });
  if (error) throw error;
  return (data as { id: string }).id;
}

beforeAll(async () => {
  const { data: v, error } = await admin.from("venues").insert({ name: "Generic Alert Test (test data)", slug: SLUG }).select("id").single();
  if (error) throw error;
  venueId = v!.id;
  const { data: role } = await admin.from("staff_roles").insert({ venue_id: venueId, name: "Kitchen Hand", department: "BOH", fallback_tier: "frontline" }).select("id").single();
  const { data: s } = await admin.from("app_users").insert({ venue_id: venueId, role: "staff", name: "Kit Hand", staff_role_id: role!.id }).select("id").single();
  staffId = s!.id;
  alertId = await saveSighting("Dry store");
});

afterAll(async () => {
  delete process.env.COMPLIANCE_ALERT_EMAIL_ENABLED;
  delete process.env.COMPLIANCE_ALERT_EMAIL_TEST_RECIPIENT;
  if (venueId) await admin.from("venues").delete().eq("id", venueId);
});

describe("generic alert sending", () => {
  it("the trigger wrote one unsent alert row for the first sighting, and a second sighting at the same place adds none", async () => {
    await saveSighting("dry store ");
    const { data } = await admin.from("compliance_alert_log").select("submission_id, kind, email_sent_at, email_attempts").eq("venue_id", venueId);
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ submission_id: alertId, kind: "generic_fail_episode", email_sent_at: null, email_attempts: 0 });
  });

  it("with the email flag unset nothing is sent and the row stays unsent", async () => {
    delete process.env.COMPLIANCE_ALERT_EMAIL_ENABLED;
    const results = await processAlerts(admin, venueId, [alertId]);
    expect(results).toEqual([{ submissionId: alertId, outcome: "skipped_disabled" }]);
    const { data } = await admin.from("compliance_alert_log").select("email_sent_at, email_attempts").eq("submission_id", alertId).single();
    expect(data).toMatchObject({ email_sent_at: null, email_attempts: 0 });
  });

  it.skipIf(process.env.RUN_ALERT_EMAIL_TEST !== "1")("ONE deliberate send, to delivered@resend.dev only", async () => {
    process.env.COMPLIANCE_ALERT_EMAIL_ENABLED = "true";
    process.env.COMPLIANCE_ALERT_EMAIL_TEST_RECIPIENT = "delivered@resend.dev";
    delete process.env.VERCEL_ENV; // never production here
    expect(process.env.COMPLIANCE_ALERT_EMAIL_TEST_RECIPIENT).toBe("delivered@resend.dev");
    expect(process.env.VERCEL_ENV).toBeUndefined();
    const results = await processAlerts(admin, venueId, [alertId]);
    expect(results).toEqual([{ submissionId: alertId, outcome: "sent" }]);
    const { data } = await admin.from("compliance_alert_log").select("email_sent_at, email_error, email_attempts").eq("submission_id", alertId).single();
    expect(data?.email_sent_at).not.toBeNull();
    expect(data?.email_error).toBeNull();
    expect(data?.email_attempts).toBe(1);
    // nothing more to send: the episode has been emailed once
    expect(await processAlerts(admin, venueId, [alertId])).toEqual([]);
  });
});
