import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSuggestionPass, type SuggestionPassSummary } from "@/lib/suggestions/runSuggestionPass";

// Internal, machine-to-machine route -- called only by the pg_cron job added
// in supabase/migrations/20260921030000_suggestion_pass_cron.sql, never from
// the browser. Auth is a shared secret (SUGGESTION_PASS_CRON_SECRET), not a
// staff session -- there is no logged-in user behind a scheduled job. The
// existing manual "Check for new suggestions" trigger
// (src/app/api/owner/suggestions/run/route.ts) is unrelated and unchanged.
//
// Job-level idempotency: skip a venue already recorded in
// suggestion_pass_runs for the current ISO week before ever calling
// runSuggestionPass, so an accidental double-fire (or a manual re-trigger of
// this route) doesn't burn Claude tokens twice. runSuggestionPass's own
// overlapsExisting() check is the separate, unchanged content-level guard
// that stops a dismissed suggestion resurrecting or a pending one
// duplicating -- this table only prevents the pass itself from re-running.

function currentIsoWeekMonday(): string {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const isoDayOfWeek = utcMidnight.getUTCDay() === 0 ? 7 : utcMidnight.getUTCDay(); // Mon=1..Sun=7
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() - (isoDayOfWeek - 1));
  return utcMidnight.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const expected = process.env.SUGGESTION_PASS_CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const runWeek = currentIsoWeekMonday();

  const { data: venues, error: venuesError } = await supabase.from("venues").select("id, slug");
  if (venuesError || !venues) {
    console.error("suggestions/run-all: failed to list venues", venuesError);
    return NextResponse.json({ error: "Failed to list venues." }, { status: 500 });
  }

  let venuesProcessed = 0;
  let venuesSkippedAlreadyRun = 0;
  const results: { venueId: string; slug: string; summary: SuggestionPassSummary }[] = [];
  const errors: { venueId: string; slug: string; message: string }[] = [];

  for (const venue of venues) {
    const { data: existingRun } = await supabase
      .from("suggestion_pass_runs")
      .select("id")
      .eq("venue_id", venue.id)
      .eq("run_week", runWeek)
      .maybeSingle();

    if (existingRun) {
      venuesSkippedAlreadyRun += 1;
      continue;
    }

    const slug = venue.slug ?? "";
    try {
      const summary = await runSuggestionPass(supabase, venue.id);
      results.push({ venueId: venue.id, slug, summary });
      venuesProcessed += 1;

      const { error: logError } = await supabase
        .from("suggestion_pass_runs")
        .insert({ venue_id: venue.id, run_week: runWeek });
      if (logError) {
        console.error(`suggestions/run-all: failed to log run for venue ${venue.id}`, logError);
      }
    } catch (err) {
      console.error(`suggestions/run-all: unexpected error for venue ${venue.id}`, err);
      errors.push({ venueId: venue.id, slug, message: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ ok: true, venuesProcessed, venuesSkippedAlreadyRun, results, errors });
}
