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
// FROM_EMAIL below is the same placeholder as cert-nudge/index.ts and has
// the identical blocker: asklarder.com.au is not yet a verified sending
// domain in the shared Resend account (only rolechamp.com.au is, confirmed
// 6 Sep 2026) -- this will 403 until that domain is added and DNS-verified
// in the Resend dashboard, a manual step only the founder can do.

import { createClient } from "jsr:@supabase/supabase-js@2";

const FROM_EMAIL = "Larder <notifications@larder-updates.example>";

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

async function sendDigestEmail(to: string[], venueName: string, total: number, outOfScope: DigestQuestion[], escalations: DigestQuestion[]): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");

  const body = [
    `${venueName} — Ask Larder weekly report`,
    ``,
    `${total} question(s) asked this week.`,
    ``,
    formatSection("Not covered by any SOP", outOfScope),
    ``,
    formatSection("Needed a supervisor", escalations),
    ``,
    `Full detail in the owner dashboard's Weekly report page.`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: `${venueName}: Ask Larder weekly report`,
      text: body,
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
