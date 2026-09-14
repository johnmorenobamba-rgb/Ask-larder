// Daily cert-expiry nudge, invoked by pg_cron via pg_net (see migration
// 20260828070000_cert_nudge_cron.sql). For each venue, checks every
// staff_certificate against that venue's cert_nudge_cadence (default
// {30,14,7} days) and emails the venue's owner/manager(s) once per
// (certificate, cadence day) -- logged in cert_nudge_log so a daily cron
// run never re-sends the same threshold twice. Notifies the owner rather
// than the staff member directly: PIN-login staff often have no real email
// on file (a synthetic staff-${id}@venue.internal), and compliance tracking
// is explicitly the owner dashboard's job per the product description.
//
// asklarder.com.au is now verified and DNS-wired in the shared Resend
// account (confirmed live 14 Sep 2026) -- this was still pointing at the
// pre-verification ".example" placeholder because nobody had come back to
// update it after verification landed, not because of any other blocker.

import { createClient } from "jsr:@supabase/supabase-js@2";

const FROM_EMAIL = "Larder <hello@asklarder.com.au>";

// Duplicated (not imported) from src/lib/email/brandedEmail.ts -- this runs
// in Deno and can't import a Next.js server module. Keep both in sync by
// hand if the shell ever changes, same convention already used for
// src/lib/reports/weeklyDigest.ts's query logic vs this function's own copy.
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderBrandedEmailHtml({ heading, bodyHtml }: { heading: string; bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background-color:#F2E9D8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2E9D8;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
<tr><td style="padding-bottom:20px;border-bottom:3px solid #E8A93B;"><span style="font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:24px;color:#1F1B16;">Larder</span></td></tr>
<tr><td style="padding:28px 0 4px 0;"><h1 style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#1F1B16;margin:0 0 16px 0;">${escapeHtml(heading)}</h1>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1F1B16;">${bodyHtml}</div></td></tr>
<tr><td style="padding-top:28px;border-top:1px solid rgba(122,92,67,0.3);"><p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7A5C43;margin:0;">Larder, staff onboarding and training built from your own SOPs.</p></td></tr>
</table></td></tr></table></body></html>`;
}

interface StaffCertificateRow {
  id: string;
  expiry_date: string | null;
  certificate_types: { name: string; tracking_type: string | null } | null;
  app_users: { name: string } | null;
}

// Calendar-day difference, not a raw time delta -- truncating both sides to
// UTC midnight before subtracting keeps this stable regardless of what time
// of day the cron actually fires. A raw (targetMs - Date.now()) / 86400000
// with Math.round is time-of-day-dependent: at 22:00 UTC (this function's
// actual cron time), a cert expiring exactly 7 calendar days out reads as
// 6.08 days and rounds to 6, silently missing the cadence=7 nudge every
// single day. Confirmed live during Block D/E testing (2026-08-28,
// 12:26 UTC): a cert set to current_date + 7 computed as 6 days under the
// old logic and was skipped.
function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00Z`);
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const targetUTC = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.round((targetUTC - todayUTC) / (1000 * 60 * 60 * 24));
}

// VIC-specific cert tracking distinction (15 Sep 2026 build session, kept in
// sync by hand with src/lib/certs/certTracking.ts -- this Deno function
// can't import a Next.js server module, same convention already used
// elsewhere in this file). WWCC (hard_expiry) is a real legal deadline and
// keeps "expiring"/"expires" wording. RSA/Food Handling/Food Safety
// Supervisor/First Aid (recommended_refresher) read as a refresher
// recommendation, never as non-compliance. MUST be re-verified per state
// before any interstate venue onboards.
async function sendNudgeEmail(
  to: string[],
  staffName: string,
  certName: string,
  trackingType: string | null,
  days: number,
): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");

  const isRefresher = trackingType === "recommended_refresher";
  const subject = isRefresher
    ? `${certName} refresher recommended for ${staffName} in ${days} day(s)`
    : `${certName} expiring for ${staffName} in ${days} day(s)`;
  const bodyText = isRefresher
    ? `${staffName}'s ${certName} refresher is recommended in ${days} day(s). This is a recommended refresher, not a mandatory renewal. Check the certificates page in the owner dashboard.`
    : `${staffName}'s ${certName} expires in ${days} day(s). Check the certificates page in the owner dashboard.`;
  const heading = isRefresher ? "Certificate refresher recommended soon" : "Certificate expiring soon";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      text: bodyText,
      html: renderBrandedEmailHtml({
        heading,
        bodyHtml: `<p style="margin:0;">${escapeHtml(bodyText)}</p>`,
      }),
    }),
  });
  if (!res.ok) throw new Error(`Resend request failed (${res.status}): ${await res.text()}`);
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: venues, error: venuesError } = await supabase.from("venues").select("id, cert_nudge_cadence");
  if (venuesError) return new Response(venuesError.message, { status: 500 });

  let sent = 0;
  let skipped = 0;
  const failed: string[] = [];
  const errors: string[] = [];

  for (const venue of venues ?? []) {
    const cadence = venue.cert_nudge_cadence ?? [30, 14, 7];

    const { data: owners } = await supabase
      .from("app_users")
      .select("email")
      .eq("venue_id", venue.id)
      .in("role", ["owner", "manager"])
      .not("email", "is", null);
    const recipients = (owners ?? []).map((o) => o.email).filter((e): e is string => Boolean(e));
    if (recipients.length === 0) continue;

    // !inner is required for the .eq() below to actually scope the parent
    // rows -- without it, PostgREST doesn't guarantee filtering on an
    // embedded resource's column restricts which staff_certificates rows
    // come back, only which nested object shape they'd have.
    const { data: certs } = await supabase
      .from("staff_certificates")
      .select("id, expiry_date, certificate_types(name, tracking_type), app_users!inner(name)")
      .not("expiry_date", "is", null)
      .eq("app_users.venue_id", venue.id)
      .returns<StaffCertificateRow[]>();

    for (const cert of certs ?? []) {
      if (!cert.expiry_date) continue;
      const days = daysUntil(cert.expiry_date);
      if (!cadence.includes(days)) continue;

      const { data: existing } = await supabase
        .from("cert_nudge_log")
        .select("id")
        .eq("staff_certificate_id", cert.id)
        .eq("cadence_days", days)
        .maybeSingle();
      if (existing) {
        skipped++;
        continue;
      }

      // One failed send (e.g. Resend outage, or the key not set yet) must
      // not abort the whole run -- other venues' nudges still matter today.
      // Nothing gets logged for a failed send, so it's retried on the next
      // daily run rather than silently skipped forever.
      try {
        await sendNudgeEmail(
          recipients,
          cert.app_users?.name ?? "A staff member",
          cert.certificate_types?.name ?? "A certificate",
          cert.certificate_types?.tracking_type ?? null,
          days,
        );
        await supabase.from("cert_nudge_log").insert({ staff_certificate_id: cert.id, cadence_days: days });
        sent++;
      } catch (err) {
        console.error(`cert-nudge send failed for certificate ${cert.id}:`, err);
        failed.push(cert.id);
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  return new Response(JSON.stringify({ sent, skipped, failed, errors }), { headers: { "Content-Type": "application/json" } });
});
