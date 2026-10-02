import Link from "next/link";
import { resolveNow } from "@/lib/compliance/engine/testClock";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { COMPLIANCE_FORMS, STATUS_TAG_LABELS } from "@/lib/compliance/catalog";
import { loadB2Overview } from "@/lib/compliance/b2Data";
import {
  UNIT_TYPE_HEADINGS,
  describeLimit,
  formatLocalDateTime,
  formatLocalTime,
  formatTemp,
} from "@/lib/compliance/b2";

export const dynamic = "force-dynamic";

// Minimal owner view of the B2 temperature log (Stage 0b scope): open out of range
// flags (however old, until a LATER in range reading exists), today's readings, and
// units not yet logged today. The full list and export is Stage 0c.
export default async function OwnerTemperaturePage({ params, searchParams }: { params: Promise<{ venueSlug: string }>; searchParams: Promise<{ asof?: string }> }) {
  const { venueSlug } = await params;
  const sp = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();
  const now = resolveNow(sp.asof);
  const overview = await loadB2Overview(supabase, staff!.venue_id!, now);
  const form = COMPLIANCE_FORMS.B2;
  const tz = overview.timeZone;
  const { total, doneToday, openFlags } = overview.summary;

  const flagged = overview.statuses.filter((s) => s.openFlag && s.latest);
  const typeRank = (t: string) => (t === "cold" ? 0 : t === "frozen" ? 1 : 2);
  const notLogged = overview.statuses.filter((s) => !s.doneToday).sort((a, b) => typeRank(a.unit.unit_type) - typeRank(b.unit.unit_type));
  const todays = overview.todays.slice().sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

  return (
    <main className="min-h-screen bg-parchment px-4 py-10 md:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold text-ink">{form.title}</h1>
          <p className="font-sans text-base text-ink/70">
            {overview.degraded
              ? "Couldn't load all of today's readings. Reload the page to try again."
              : total === 0
                ? "No units are set up yet."
                : `${doneToday} of ${total} units logged today.${openFlags > 0 ? ` ${openFlags} still out of range.` : ""}`}
          </p>
        </div>

        {overview.degraded && (
          <p role="alert" className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-preserve-red">
            Some data didn&apos;t load, so the lists below may be incomplete.
          </p>
        )}

        <section aria-labelledby="open-flags" className="space-y-3">
          <h2 id="open-flags" className="font-display text-xl font-bold text-ink">
            Out of range, not rechecked
          </h2>
          {flagged.length === 0 ? (
            <p className="font-sans text-base text-bay-green">No unit is out of range right now.</p>
          ) : (
            <ul className="space-y-3">
              {flagged.map((s) => (
                <li key={s.unit.id} className="rounded-2xl border-2 border-preserve-red px-4 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-sans text-lg font-medium text-ink">{s.unit.name}</p>
                    <p className="font-display text-2xl font-bold text-preserve-red">{s.readingC !== null ? formatTemp(s.readingC) : "No reading"}</p>
                  </div>
                  <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">
                    {describeLimit(s.unit)}. {STATUS_TAG_LABELS[form.limits[s.unit.unit_type as "cold" | "frozen" | "hot_hold"]?.tag ?? "BP"]}
                  </p>
                  <p className="mt-2 font-sans text-sm text-ink">
                    {formatLocalDateTime(s.latest!.submitted_at, tz)} by {s.latest!.submitted_by_name}
                  </p>
                  {s.latest!.corrective_action && <p className="font-sans text-sm text-ink">Action: {s.latest!.corrective_action}</p>}
                  <p className="mt-1 font-sans text-sm text-ink/70">Stays open until a later reading is in range.</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="today" className="space-y-3">
          <h2 id="today" className="font-display text-xl font-bold text-ink">
            Today&apos;s readings
          </h2>
          {todays.length === 0 ? (
            <p className="font-sans text-base text-ink/70">No readings yet today.</p>
          ) : (
            <ul className="space-y-2">
              {todays.map((r) => (
                <li
                  key={r.id}
                  className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl border-2 px-4 py-3 ${
                    r.outOfRange ? "border-preserve-red" : "border-clay-brown/20"
                  }`}
                >
                  <div>
                    <p className="font-sans text-base text-ink">{r.unitName}</p>
                    <p className="font-sans text-sm text-ink/70">
                      {formatLocalTime(r.submittedAt, tz)} by {r.submittedByName}
                      {r.correctsSubmissionId ? ", a correction" : ""}
                    </p>
                    {r.outOfRange && r.correctiveAction && <p className="font-sans text-sm text-ink">Action: {r.correctiveAction}</p>}
                  </div>
                  <p className={`font-display text-xl font-bold ${r.outOfRange ? "text-preserve-red" : "text-ink"}`}>
                    {r.readingC !== null ? formatTemp(r.readingC) : "No reading"}
                    {r.outOfRange ? <span className="ml-2 font-mono text-xs uppercase tracking-wide">Out of range</span> : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="not-yet" className="space-y-3">
          <h2 id="not-yet" className="font-display text-xl font-bold text-ink">
            Not logged today
          </h2>
          {notLogged.length === 0 ? (
            <p className="font-sans text-base text-bay-green">Every unit has a reading today.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {notLogged.map((s) => (
                <li key={s.unit.id} className="rounded-2xl border-2 border-clay-brown/20 px-4 py-3">
                  <p className="font-sans text-base text-ink">{s.unit.name}</p>
                  <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">
                    {UNIT_TYPE_HEADINGS[s.unit.unit_type as "cold" | "frozen" | "hot_hold"] ?? s.unit.unit_type}. {describeLimit(s.unit)}
                  </p>
                  {s.latest && (
                    <p className="font-sans text-sm text-ink/70">
                      Last reading {formatLocalDateTime(s.latest.submitted_at, tz)}
                      {s.readingC !== null ? `, ${formatTemp(s.readingC)}` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="about" className="space-y-2 rounded-2xl border-2 border-clay-brown/20 px-4 py-4">
          <h2 id="about" className="font-display text-lg font-bold text-ink">
            What this log is
          </h2>
          <p className="font-sans text-sm text-ink">
            <span className="font-mono text-xs uppercase tracking-wide text-clay-brown">{STATUS_TAG_LABELS[form.statusTag]}</span> {form.statusNote}
          </p>
          <ul className="space-y-1 font-sans text-sm text-ink">
            {(["cold", "frozen", "hot_hold"] as const).map((t) => (
              <li key={t}>
                <span className="font-mono text-xs uppercase tracking-wide text-clay-brown">{UNIT_TYPE_HEADINGS[t]}, {STATUS_TAG_LABELS[form.limits[t].tag]}</span>{" "}
                {form.limits[t].basis}
              </li>
            ))}
          </ul>
          <p className="font-sans text-sm text-ink/70">{form.frequency.note}</p>
          <p className="font-sans text-sm text-ink/70">{form.retentionNote}</p>
          <p className="font-sans text-sm text-ink/70">
            Units and their limits are set in{" "}
            <Link href={`/${venueSlug}/owner/onboarding/compliance-setup`} className="underline">
              the venue setup
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
