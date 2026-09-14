// Weekly "what staff asked Ask Larder" owner email, invoked by pg_cron via
// pg_net (see migration 20260911150000_weekly_digest.sql). For each venue,
// summarizes the last 7 days of chat_messages into out-of-scope questions
// (a direct pointer at missing SOP content) and escalations (questions
// that needed a supervisor), and emails the venue's owner/manager(s) --
// same recipient-resolution and single-failure-doesn't-abort-the-run
// pattern as cert-nudge/index.ts, deliberately kept consistent with it.
//
// The query here duplicates src/lib/reports/weeklyDigest.ts's grouping
// logic rather than importing it -- this runs in Deno, that file is a
// Node/Next.js server module, the two runtimes can't share it directly.
// Keep them in sync by hand if the grouping logic ever changes.
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

interface ChatRow {
  message: string | null;
  exchange_id: string | null;
  created_at: string | null;
  out_of_scope?: boolean | null;
  is_escalation?: boolean | null;
}

interface DigestQuestion {
  question: string;
  count: number;
  lastAskedAt: string;
}

function group(rows: ChatRow[]): DigestQuestion[] {
  const byText = new Map<string, DigestQuestion>();
  for (const row of rows) {
    if (!row.message) continue;
    const key = row.message.trim().toLowerCase();
    const existing = byText.get(key);
    if (existing) {
      existing.count += 1;
      if (row.created_at && row.created_at > existing.lastAskedAt) existing.lastAskedAt = row.created_at;
    } else {
      byText.set(key, { question: row.message.trim(), count: 1, lastAskedAt: row.created_at ?? "" });
    }
  }
  return Array.from(byText.values()).sort((a, b) => b.count - a.count || b.lastAskedAt.localeCompare(a.lastAskedAt));
}

function formatSection(title: string, questions: DigestQuestion[]): string {
  if (questions.length === 0) return `${title}: none this week.`;
  const lines = questions
    .slice(0, 10)
    .map((q) => `  - "${q.question}" (asked ${q.count} time${q.count === 1 ? "" : "s"})`);
  return `${title}:\n${lines.join("\n")}`;
}

function formatSectionHtml(title: string, questions: DigestQuestion[]): string {
  if (questions.length === 0) {
    return `<p style="margin:0 0 16px 0;"><strong>${escapeHtml(title)}:</strong> none this week.</p>`;
  }
  const items = questions
    .slice(0, 10)
    .map((q) => `<li style="margin:0 0 4px 0;">&quot;${escapeHtml(q.question)}&quot; (asked ${q.count} time${q.count === 1 ? "" : "s"})</li>`)
    .join("");
  return `<p style="margin:0 0 4px 0;"><strong>${escapeHtml(title)}:</strong></p><ul style="margin:0 0 16px 0;padding-left:20px;">${items}</ul>`;
}

async function sendDigestEmail(to: string[], venueName: string, total: number, outOfScope: DigestQuestion[], escalations: DigestQuestion[]): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");

  const body = [
    `${venueName}, Ask Larder weekly report`,
    ``,
    `${total} question(s) asked this week.`,
    ``,
    formatSection("Not covered by any SOP", outOfScope),
    ``,
    formatSection("Needed a supervisor", escalations),
    ``,
    `Full detail in the owner dashboard's Weekly report page.`,
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 16px 0;">${total} question(s) asked this week.</p>
    ${formatSectionHtml("Not covered by any SOP", outOfScope)}
    ${formatSectionHtml("Needed a supervisor", escalations)}
    <p style="margin:0;">Full detail in the owner dashboard's Weekly report page.</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: `${venueName}: Ask Larder weekly report`,
      text: body,
      html: renderBrandedEmailHtml({ heading: `${venueName}, Ask Larder weekly report`, bodyHtml }),
    }),
  });
  if (!res.ok) throw new Error(`Resend request failed (${res.status}): ${await res.text()}`);
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: venues, error: venuesError } = await supabase.from("venues").select("id, name");
  if (venuesError) return new Response(venuesError.message, { status: 500 });

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  let sent = 0;
  let skipped = 0;
  const failed: string[] = [];

  for (const venue of venues ?? []) {
    const { data: owners } = await supabase
      .from("app_users")
      .select("email")
      .eq("venue_id", venue.id)
      .in("role", ["owner", "manager"])
      .not("email", "is", null);
    const recipients = (owners ?? []).map((o) => o.email).filter((e): e is string => Boolean(e));
    if (recipients.length === 0) {
      skipped++;
      continue;
    }

    const [{ data: userRows }, { data: assistantRows }] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("message, exchange_id, created_at")
        .eq("venue_id", venue.id)
        .eq("role", "user")
        .gte("created_at", sinceIso),
      supabase
        .from("chat_messages")
        .select("exchange_id, out_of_scope, is_escalation")
        .eq("venue_id", venue.id)
        .eq("role", "assistant")
        .gte("created_at", sinceIso),
    ]);

    if (!userRows || userRows.length === 0) {
      skipped++;
      continue;
    }

    const flagsByExchange = new Map<string, { outOfScope: boolean; escalation: boolean }>();
    for (const row of assistantRows ?? []) {
      if (!row.exchange_id) continue;
      flagsByExchange.set(row.exchange_id, {
        outOfScope: row.out_of_scope === true,
        escalation: row.is_escalation === true,
      });
    }

    const outOfScopeRows = userRows.filter((r) => r.exchange_id && flagsByExchange.get(r.exchange_id)?.outOfScope);
    const escalationRows = userRows.filter((r) => r.exchange_id && flagsByExchange.get(r.exchange_id)?.escalation);

    // One failed send must not abort the whole run -- other venues' reports
    // still matter this week (same reasoning as cert-nudge).
    try {
      await sendDigestEmail(recipients, venue.name, userRows.length, group(outOfScopeRows), group(escalationRows));
      sent++;
    } catch (err) {
      console.error(`weekly-digest send failed for venue ${venue.id}:`, err);
      failed.push(venue.id);
    }
  }

  return new Response(JSON.stringify({ sent, skipped, failed }), { headers: { "Content-Type": "application/json" } });
});
