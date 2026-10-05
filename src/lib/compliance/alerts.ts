import "server-only";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { renderBrandedEmailHtml, escapeHtml } from "@/lib/email/brandedEmail";
import { formatLocalDateTime, formatTemp, venueTimeZone } from "./b2";
import { isGenericForm, sendGenericAlert, type GenericSub } from "./genericAlert";

// Owner alert for a B2 out of range EPISODE (one email per unit per episode).
// The database decides what starts an episode and writes the compliance_alert_log
// row in the same transaction as the reading (submit_compliance_form). This
// module only sends: it claims an unsent row, emails, and records the outcome.
//
// SAFETY (John, 2 Oct 2026):
//   - Sending is OFF unless COMPLIANCE_ALERT_EMAIL_ENABLED === "true". Unset in
//     every environment until the owner turns it on; always off in e2e.
//   - Outside production (VERCEL_ENV !== "production"), sending REQUIRES
//     COMPLIANCE_ALERT_EMAIL_TEST_RECIPIENT and goes only there (Resend's own test
//     address, delivered@resend.dev, in our tests). A dev machine, a preview deploy
//     or a test run can never email a real owner, even with the flag on.
//   - Synthetic staff addresses (@venue.internal) are never recipients.
//
// Retry safety without a lease column: a row is only eligible when it has never been
// attempted, or its last attempt FAILED (email_error set). A claim clears email_error,
// so a row that is mid send (attempts > 0, no error, not sent) is never picked up by
// another caller. The cost: a crash mid send leaves that row unsent and unretried (it
// can never double send); the owner dashboard flag is the safety net for that case.

type Admin = SupabaseClient<Database>;

const FROM_EMAIL = "Larder <hello@asklarder.com.au>";
const MAX_ATTEMPTS = 5;
const SWEEP_AFTER_MS = 2 * 60 * 1000;
/** An alert older than this is not sent: the news is stale (for example emails were switched off). */
export const ALERT_MAX_AGE_MS = 48 * 60 * 60 * 1000;
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function alertEmailsEnabled(): boolean {
  return process.env.COMPLIANCE_ALERT_EMAIL_ENABLED === "true";
}

export function isProductionDeploy(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function filterRecipients(emails: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const raw of emails) {
    const e = (raw ?? "").trim().toLowerCase();
    if (!e || !EMAIL_SHAPE.test(e)) continue;
    if (e.endsWith("@venue.internal")) continue;
    seen.add(e);
  }
  return Array.from(seen);
}

/**
 * Where an alert may go, or why it must not be sent. Pure so it can be unit tested.
 * Outside production the test recipient is mandatory and exclusive.
 */
export function decideRecipients(opts: {
  production: boolean;
  testRecipient: string | undefined;
  venueEmails: (string | null | undefined)[];
}): { mode: "send"; to: string[] } | { mode: "refuse"; reason: string } {
  const override = (opts.testRecipient ?? "").trim().toLowerCase();
  if (override) {
    return EMAIL_SHAPE.test(override) ? { mode: "send", to: [override] } : { mode: "refuse", reason: "test recipient is not a valid address" };
  }
  if (!opts.production) {
    return { mode: "refuse", reason: "not production and no test recipient set" };
  }
  const to = filterRecipients(opts.venueEmails);
  return to.length > 0 ? { mode: "send", to } : { mode: "refuse", reason: "no recipients" };
}

type AlertRow = Database["public"]["Tables"]["compliance_alert_log"]["Row"];

async function claim(admin: Admin, row: AlertRow): Promise<boolean> {
  // optimistic claim (only one caller can move email_attempts from n to n+1); clearing
  // email_error marks the row as in flight so nobody else picks it up
  const { data } = await admin
    .from("compliance_alert_log")
    .update({ email_attempts: row.email_attempts + 1, email_error: null })
    .eq("submission_id", row.submission_id)
    .eq("email_attempts", row.email_attempts)
    .is("email_sent_at", null)
    .select("submission_id");
  return !!data && data.length === 1;
}

export type AlertResult = {
  submissionId: string;
  outcome: "sent" | "skipped_disabled" | "refused" | "not_claimed" | "failed" | "stale" | "expired";
};

/**
 * Sends the unsent alert emails for the given submissions (plus a retry sweep of the
 * venue's other eligible unsent rows). Never throws: a failure is recorded on the alert
 * row and the reading itself is already safely stored.
 */
export async function processAlerts(admin: Admin, venueId: string, submissionIds: string[]): Promise<AlertResult[]> {
  if (!alertEmailsEnabled()) {
    return submissionIds.map((submissionId) => ({ submissionId, outcome: "skipped_disabled" as const }));
  }
  const results: AlertResult[] = [];
  try {
    // eligible: never attempted, or the last attempt failed
    const eligible = (r: AlertRow) => r.email_sent_at === null && r.email_attempts < MAX_ATTEMPTS && (r.email_attempts === 0 || r.email_error !== null);
    const { data: byId } = submissionIds.length
      ? await admin.from("compliance_alert_log").select("*").eq("venue_id", venueId).in("submission_id", submissionIds).is("email_sent_at", null)
      : { data: [] as AlertRow[] };
    const { data: sweep } = await admin
      .from("compliance_alert_log")
      .select("*")
      .eq("venue_id", venueId)
      .is("email_sent_at", null)
      .lt("created_at", new Date(Date.now() - SWEEP_AFTER_MS).toISOString())
      .lt("email_attempts", MAX_ATTEMPTS);
    const rows = new Map<string, AlertRow>();
    for (const r of [...(byId ?? []), ...(sweep ?? [])]) if (eligible(r)) rows.set(r.submission_id, r);
    if (rows.size === 0) return results;

    const [{ data: venue }, { data: profile }, { data: owners }] = await Promise.all([
      admin.from("venues").select("name, slug").eq("id", venueId).maybeSingle(),
      admin.from("venue_licence_profile").select("state").eq("venue_id", venueId).maybeSingle(),
      admin
        .from("app_users")
        .select("email")
        .eq("venue_id", venueId)
        .in("role", ["owner", "manager"])
        .is("deactivated_at", null)
        .not("email", "is", null),
    ]);
    const tz = venueTimeZone(profile?.state);
    const decision = decideRecipients({
      production: isProductionDeploy(),
      testRecipient: process.env.COMPLIANCE_ALERT_EMAIL_TEST_RECIPIENT,
      venueEmails: (owners ?? []).map((o) => o.email),
    });
    const resend = new Resend(process.env.RESEND_API_KEY);

    for (const row of rows.values()) {
      // 1. decide whether this alert should be sent at all, WITHOUT using up an attempt
      if (decision.mode === "refuse") {
        console.warn(`[compliance alert] not sending: ${decision.reason}`);
        results.push({ submissionId: row.submission_id, outcome: "refused" });
        continue;
      }
      if (Date.now() - new Date(row.created_at).getTime() > ALERT_MAX_AGE_MS) {
        await admin
          .from("compliance_alert_log")
          .update({ email_error: "expired, not sent", email_attempts: MAX_ATTEMPTS })
          .eq("submission_id", row.submission_id)
          .is("email_sent_at", null);
        results.push({ submissionId: row.submission_id, outcome: "expired" });
        continue;
      }
      const { data: sub } = await admin
        .from("compliance_form_submissions")
        .select("id, form_id, out_of_range, corrective_action, submitted_at, submitted_by_name, payload")
        .eq("id", row.submission_id)
        .maybeSingle();
      const { data: corrections } = await admin
        .from("compliance_form_submissions")
        .select("id")
        .eq("corrects_submission_id", row.submission_id)
        .limit(1);
      const unitId = (sub?.payload as { unit_id?: string } | null)?.unit_id;
      const { data: latest } = unitId
        ? await admin.from("compliance_b2_latest_readings").select("id, out_of_range").eq("venue_id", venueId).eq("unit_id", unitId).maybeSingle()
        : { data: null };
      // a generic (B3, B6, B12) episode is judged by its own record: not corrected away and still a failure; B2 by the unit's latest reading
      const generic = isGenericForm(sub?.form_id);
      const stillOpen = generic ? true : !!latest && latest.out_of_range === true;
      if (!sub || !sub.out_of_range || (corrections ?? []).length > 0 || !stillOpen) {
        // corrected away, or the unit has since been back in range: nothing to tell the owner
        await admin
          .from("compliance_alert_log")
          .update({ email_error: "resolved before sending, not sent", email_attempts: MAX_ATTEMPTS })
          .eq("submission_id", row.submission_id)
          .is("email_sent_at", null);
        results.push({ submissionId: row.submission_id, outcome: "stale" });
        continue;
      }

      // 2. claim, then send
      if (!(await claim(admin, row))) {
        results.push({ submissionId: row.submission_id, outcome: "not_claimed" });
        continue;
      }
      if (generic) {
        results.push({ submissionId: row.submission_id, outcome: await sendGenericAlert(admin, resend, decision.to, row, sub as unknown as GenericSub, venue ?? null, tz) });
        continue;
      }
      const p = sub.payload as { unit_name?: string; reading_c?: number; limit_kind?: string; limit_c?: number };
      const unitName = p.unit_name ?? "A unit";
      const reading = typeof p.reading_c === "number" ? formatTemp(p.reading_c) : "unknown";
      const limitText =
        typeof p.limit_c === "number" ? `${formatTemp(p.limit_c)} or ${p.limit_kind === "min" ? "hotter" : "colder"}` : "not recorded";
      const when = formatLocalDateTime(sub.submitted_at, tz);
      const venueName = venue?.name ?? "Your venue";
      const base = process.env.NEXT_PUBLIC_SITE_URL || "https://asklarder.com.au";
      const link = venue?.slug ? `${base}/${venue.slug}/owner/temperature` : undefined;

      try {
        const { error } = await resend.emails.send(
          {
            from: FROM_EMAIL,
            to: decision.to,
            subject: `Temperature out of range: ${unitName} at ${reading}`,
            text: [
              `${venueName}: ${unitName} was ${reading}.`,
              `Limit: ${limitText}.`,
              `Recorded by ${sub.submitted_by_name}, ${when}.`,
              `Action taken: ${sub.corrective_action ?? "none recorded"}`,
              "",
              "This is the first out of range reading since this unit was last in range. You will not get another email for it until it has been back in range and fails again.",
              link ? `View the log: ${link}` : "",
            ].join("\n"),
            html: renderBrandedEmailHtml({
              heading: "Temperature out of range",
              bodyHtml: `
              <p style="margin:0 0 4px 0;"><strong>${escapeHtml(venueName)}</strong></p>
              <p style="margin:0 0 4px 0;"><strong>${escapeHtml(unitName)}</strong> was <strong>${escapeHtml(reading)}</strong>.</p>
              <p style="margin:0 0 4px 0;">Limit: ${escapeHtml(limitText)}.</p>
              <p style="margin:0 0 4px 0;">Recorded by ${escapeHtml(sub.submitted_by_name)}, ${escapeHtml(when)}.</p>
              <p style="margin:0 0 16px 0;">Action taken: ${escapeHtml(sub.corrective_action ?? "none recorded")}</p>
              <p style="margin:0;font-size:13px;color:#7A5C43;">This is the first out of range reading since this unit was last in range. You will not get another email for it until it has been back in range and fails again.</p>
            `,
              ctaLabel: link ? "View the temperature log" : undefined,
              ctaUrl: link,
            }),
          },
          // one alert per episode even if two callers ever race: Resend dedupes on this key
          { idempotencyKey: `b2-alert-${row.submission_id}` },
        );
        if (error) throw new Error(typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : "send failed");
        const { error: markError } = await admin
          .from("compliance_alert_log")
          .update({ email_sent_at: new Date().toISOString(), email_error: null })
          .eq("submission_id", row.submission_id);
        if (markError) console.error("[compliance alert] sent but could not record it:", markError.message);
        results.push({ submissionId: row.submission_id, outcome: "sent" });
      } catch (err) {
        console.error("[compliance alert] send failed:", err instanceof Error ? err.message : "unknown error");
        await admin
          .from("compliance_alert_log")
          .update({ email_error: (err instanceof Error ? err.message : "send failed").slice(0, 300) })
          .eq("submission_id", row.submission_id);
        results.push({ submissionId: row.submission_id, outcome: "failed" });
      }
    }
  } catch (err) {
    console.error("[compliance alert] processing failed:", err instanceof Error ? err.message : "unknown error");
  }
  return results;
}
