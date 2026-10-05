import "server-only";
import type { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { renderBrandedEmailHtml, escapeHtml } from "@/lib/email/brandedEmail";
import { formatLocalDateTime } from "./b2";

// Owner alert for a generic form failure (hardening-2 task 6, P22): B3 goods receiving, B6 two stage cooling and B12 pest log
// ONLY. A database trigger (migration 20261005080000) writes one compliance_alert_log row per item per episode; this module
// builds and sends the email for such a row. The send is gated exactly like the B2 alert in alerts.ts: nothing is sent unless
// COMPLIANCE_ALERT_EMAIL_ENABLED is "true", and outside production only the test recipient receives anything.
export const GENERIC_ALERT_FORMS = ["B3", "B6", "B12"] as const;
export const isGenericForm = (id: string | null | undefined): boolean => !!id && (GENERIC_ALERT_FORMS as readonly string[]).includes(id);

const FROM_EMAIL = "Larder <hello@asklarder.com.au>";

type Admin = SupabaseClient<Database>;
type AlertRow = Database["public"]["Tables"]["compliance_alert_log"]["Row"];

export type GenericSub = {
  id: string;
  form_id: string;
  corrective_action: string | null;
  submitted_at: string;
  submitted_by_name: string;
  payload: unknown;
};

/** Pure: the wording of one generic alert, so it can be unit tested. No dashes in the copy. */
export function genericAlertContent(
  sub: Pick<GenericSub, "form_id" | "corrective_action" | "submitted_by_name" | "payload">,
  when: string,
  venueName: string,
) {
  const p = (sub.payload ?? {}) as { values?: Record<string, unknown>; fail_reasons?: string[]; stage?: string };
  const v = p.values ?? {};
  const str = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : "");
  let subject = "A food safety check failed";
  let heading = "Check failed";
  let what = "A check failed.";
  if (sub.form_id === "B3") {
    const item = [str(v.product), str(v.supplier) ? `from ${str(v.supplier)}` : ""].filter(Boolean).join(" ");
    subject = `Delivery check failed: ${item || "a delivery"}`;
    heading = "Delivery check failed";
    what = `The delivery of ${item || "a product"} failed the goods receiving check.`;
  } else if (sub.form_id === "B6") {
    const item = str(v.item);
    const stage = p.stage === "two_hour" ? "2 hour " : p.stage === "six_hour" ? "6 hour " : "";
    subject = `Cooling check failed: ${item || "a batch"}`;
    heading = "Cooling check failed";
    what = `${item || "A batch"} failed its ${stage}cooling check.`;
  } else if (sub.form_id === "B12") {
    const where = str(v.location);
    subject = `Pest sighting: ${where || "a location"}`;
    heading = "Pest sighting";
    what = `A pest sighting was logged at ${where || "a location"}.`;
  }
  const reasons = Array.isArray(p.fail_reasons) && p.fail_reasons.length ? p.fail_reasons.join(". ") : "";
  const action = sub.corrective_action ?? "none recorded";
  const note = "This is the first failure for this item since it was last fine. You will not get another email for it until it has been fine again and has failed again.";
  const text = [`${venueName}: ${what}`, reasons ? `Why: ${reasons}.` : "", `Recorded by ${sub.submitted_by_name}, ${when}.`, `Action taken: ${action}`, "", note]
    .filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== ""))
    .join("\n");
  const bodyHtml = `
      <p style="margin:0 0 4px 0;"><strong>${escapeHtml(venueName)}</strong></p>
      <p style="margin:0 0 4px 0;">${escapeHtml(what)}</p>
      ${reasons ? `<p style="margin:0 0 4px 0;">Why: ${escapeHtml(reasons)}.</p>` : ""}
      <p style="margin:0 0 4px 0;">Recorded by ${escapeHtml(sub.submitted_by_name)}, ${escapeHtml(when)}.</p>
      <p style="margin:0 0 16px 0;">Action taken: ${escapeHtml(action)}</p>
      <p style="margin:0;font-size:13px;color:#7A5C43;">${escapeHtml(note)}</p>`;
  return { subject, heading, what, reasons, text, bodyHtml };
}

/** Sends one generic alert and records the outcome on its alert row. Never throws. */
export async function sendGenericAlert(
  admin: Admin,
  resend: Resend,
  to: string[],
  row: AlertRow,
  sub: GenericSub,
  venue: { name: string | null; slug: string | null } | null,
  tz: string,
): Promise<"sent" | "failed"> {
  const content = genericAlertContent(sub, formatLocalDateTime(sub.submitted_at, tz), venue?.name ?? "Your venue");
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://asklarder.com.au";
  const link = venue?.slug ? `${base}/${venue.slug}/owner/compliance/records` : undefined;
  try {
    const { error } = await resend.emails.send(
      {
        from: FROM_EMAIL,
        to,
        subject: content.subject,
        text: [content.text, link ? `View the records: ${link}` : ""].filter(Boolean).join("\n\n"),
        html: renderBrandedEmailHtml({ heading: content.heading, bodyHtml: content.bodyHtml, ctaLabel: link ? "View the records" : undefined, ctaUrl: link }),
      },
      { idempotencyKey: `generic-alert-${row.submission_id}` },
    );
    if (error) throw new Error(typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : "send failed");
    const { error: markError } = await admin
      .from("compliance_alert_log")
      .update({ email_sent_at: new Date().toISOString(), email_error: null })
      .eq("submission_id", row.submission_id);
    if (markError) console.error("[compliance alert] sent but could not record it:", markError.message);
    return "sent";
  } catch (err) {
    console.error("[compliance alert] send failed:", err instanceof Error ? err.message : "unknown error");
    await admin
      .from("compliance_alert_log")
      .update({ email_error: (err instanceof Error ? err.message : "send failed").slice(0, 300) })
      .eq("submission_id", row.submission_id);
    return "failed";
  }
}
