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
// FROM_EMAIL below is a placeholder -- update it once a real domain is
// verified in Resend (create-domain / verify-domain). RESEND_API_KEY is
// now set as a function secret and the send pipeline is confirmed working
// end-to-end (verified 2026-08-28 via Resend's onboarding@resend.dev
// sandbox sender) -- domain verification is the only remaining blocker.

import { createClient } from "jsr:@supabase/supabase-js@2";

const FROM_EMAIL = "Larder <notifications@larder-updates.example>";

interface StaffCertificateRow {
  id: string;
  expiry_date: string | null;
  certificate_types: { name: string } | null;
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

async function sendNudgeEmail(to: string[], staffName: string, certName: string, days: number): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: `${certName} expiring for ${staffName} in ${days} day(s)`,
      text: `${staffName}'s ${certName} expires in ${days} day(s). Check the certificates page in the owner dashboard.`,
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
      .select("id, expiry_date, certificate_types(name), app_users!inner(name)")
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
          days,
        );
        await supabase.from("cert_nudge_log").insert({ staff_certificate_id: cert.id, cadence_days: days });
        sent++;
      } catch (err) {
        console.error(`cert-nudge send failed for certificate ${cert.id}:`, err);
        failed.push(cert.id);
      }
    }
  }

  return new Response(JSON.stringify({ sent, skipped, failed }), { headers: { "Content-Type": "application/json" } });
});
