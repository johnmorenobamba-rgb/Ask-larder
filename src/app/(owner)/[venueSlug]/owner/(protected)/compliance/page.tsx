import Link from "next/link";
import { resolveNow } from "@/lib/compliance/engine/testClock";
import { requireOwnerPageStaff } from "@/lib/auth/ownerPage";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadHub, groupHubByCadence } from "@/lib/compliance/engine/hubData";
import { CADENCE_HEADINGS, FORM_TAG_LABELS } from "@/lib/compliance/engine/types";
import { LINKED_FEATURES } from "@/lib/compliance/engine/forms";
import { formatLocalDateTime } from "@/lib/compliance/b2";

export const dynamic = "force-dynamic";

// Owner compliance overview: what is done, what is missing (overdue), what failed and what is still out of
// range. Overdue is shown on screen only, never emailed. Records, print and CSV live on the records page.
export default async function OwnerCompliancePage({ params, searchParams }: { params: Promise<{ venueSlug: string }>; searchParams: Promise<{ asof?: string }> }) {
  const { venueSlug } = await params;
  const sp = await searchParams;
  const staff = await requireOwnerPageStaff(venueSlug);
  const supabase = await createClient();
  const now = resolveNow(sp.asof);
  const hub = await loadHub(supabase, createAdminClient(), staff!.venue_id!, { isManagerTier: true, department: null }, now);
  const on = hub.forms.filter((f) => f.on);
  const groups = groupHubByCadence(on);

  const overdue = on.filter((f) => f.status.status === "overdue");
  const toDo = on.filter((f) => f.status.status === "not_started");
  const done = on.filter((f) => f.status.status === "done");
  const flagged = on.filter((f) => f.openFlags > 0);
  const recentFails = on.reduce((n, f) => n + f.recentFails, 0);
  const openFlagTotal = flagged.reduce((n, f) => n + f.openFlags, 0) + hub.b2.openFlags;
  const waiting = on.reduce((n, f) => n + f.openChains, 0);

  const tile = (label: string, value: number, bad: boolean) => (
    <div className={`rounded-2xl border-2 px-4 py-4 ${bad && value > 0 ? "border-preserve-red" : "border-clay-brown"}`}>
      <p className={`font-display text-4xl font-bold ${bad && value > 0 ? "text-preserve-red" : "text-ink"}`}>{value}</p>
      <p className="font-sans text-sm text-ink/80">{label}</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-parchment px-4 py-10 md:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold text-ink">Compliance overview</h1>
          <p className="font-sans text-base text-ink/70">
            {formatLocalDateTime(now, hub.timeZone)}. Overdue is shown here on screen only. Nothing is emailed.
          </p>
        </div>

        {hub.degraded && (
          <p role="alert" className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-preserve-red">
            Some data didn&apos;t load, so the numbers below may be incomplete. Reload the page to try again.
          </p>
        )}

        <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {tile("Forms done for now", done.length, false)}
          {tile("Forms not started yet", toDo.length, false)}
          {tile("Forms overdue", overdue.length, true)}
          {tile("Open flags", openFlagTotal, true)}
          {tile("Failed in the last 7 days", recentFails, true)}
        </section>

        <section aria-labelledby="attention" className="space-y-3">
          <h2 id="attention" className="font-display text-xl font-bold text-ink">
            Needs attention
          </h2>
          {overdue.length + flagged.length === 0 && hub.b2.openFlags === 0 && waiting === 0 ? (
            <p className="font-sans text-base text-bay-green">Nothing needs attention right now.</p>
          ) : (
            <ul className="space-y-2">
              {hub.b2.openFlags > 0 && (
                <li className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-ink">
                  <Link className="font-medium underline" href={`/${venueSlug}/owner/temperature`}>
                    Temperature log
                  </Link>
                  : {hub.b2.openFlags === 1 ? "1 unit is" : `${hub.b2.openFlags} units are`} out of range and not rechecked.
                </li>
              )}
              {flagged.map((f) => (
                <li key={f.def.id} className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-ink">
                  <Link className="font-medium underline" href={`/${venueSlug}/owner/compliance/records?form=${f.def.id}&result=fail`}>
                    {f.def.title}
                  </Link>
                  : failed and not yet fine again ({f.openFlags}).
                </li>
              ))}
              {overdue.map((f) => (
                <li key={f.def.id} className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-ink">
                  <Link className="font-medium underline" href={`/${venueSlug}/owner/compliance/records?form=${f.def.id}`}>
                    {f.def.title}
                  </Link>
                  : overdue. {f.status.reason}.
                </li>
              ))}
              {on
                .filter((f) => f.openChains > 0)
                .map((f) => (
                  <li key={f.def.id} className="rounded-2xl border-2 border-clay-brown px-4 py-3 font-sans text-base text-ink">
                    {f.def.title}: {f.openChains === 1 ? "1 is" : `${f.openChains} are`} waiting for the next step.
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="all-forms" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="all-forms" className="font-display text-xl font-bold text-ink">
              Every form that is on
            </h2>
            <div className="flex flex-wrap gap-3 font-sans text-sm">
              <Link className="inline-flex min-h-11 items-center font-medium underline" href={`/${venueSlug}/owner/forms`}>
                Switch forms on or off
              </Link>
              <Link className="inline-flex min-h-11 items-center font-medium underline" href={`/${venueSlug}/owner/compliance/records`}>
                See and print records
              </Link>
              {/* A file download from an API route, not a page: a plain anchor is correct here */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a className="inline-flex min-h-11 items-center font-medium underline" href="/api/owner/compliance/export">
                Download all records as CSV
              </a>
            </div>
          </div>
          {groups.map((g) => (
            <div key={g.cadence} className="space-y-2">
              <h3 className="font-mono text-xs uppercase tracking-wide text-clay-brown">{CADENCE_HEADINGS[g.cadence]}</h3>
              <ul className="divide-y-2 divide-clay-brown/20 rounded-2xl border-2 border-clay-brown/40">
                {g.cadence === "daily" && (
                  <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <Link className="font-sans text-base font-medium text-ink underline" href={`/${venueSlug}/owner/temperature`}>
                      Temperature log
                    </Link>
                    <p className="font-sans text-sm text-ink/80">
                      {hub.b2.doneToday} of {hub.b2.total} units logged today{hub.b2.openFlags > 0 ? `, ${hub.b2.openFlags} out of range` : ""}
                    </p>
                  </li>
                )}
                {g.forms.map((f) => (
                  <li key={f.def.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div>
                      <Link className="font-sans text-base font-medium text-ink underline" href={`/${venueSlug}/owner/compliance/records?form=${f.def.id}`}>
                        {f.def.title}
                      </Link>
                      <p className="font-mono text-[11px] uppercase tracking-wide text-clay-brown">{FORM_TAG_LABELS[f.def.tag]}</p>
                    </div>
                    <p className={`font-sans text-sm ${f.status.status === "overdue" ? "font-medium text-preserve-red" : "text-ink/80"}`}>
                      {f.status.status === "done"
                        ? "Done"
                        : f.status.status === "overdue"
                          ? `Overdue. ${f.status.reason}`
                          : f.status.status === "event"
                            ? f.status.lastAt
                              ? `Last logged ${formatLocalDateTime(f.status.lastAt, hub.timeZone)}`
                              : "Nothing logged yet"
                            : "Not started"}
                      {f.recentFails > 0 ? `. ${f.recentFails} failed in the last 7 days` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section aria-labelledby="linked" className="space-y-2">
          <h2 id="linked" className="font-display text-xl font-bold text-ink">
            Records kept elsewhere in Larder
          </h2>
          <ul className="space-y-1 font-sans text-base text-ink">
            {LINKED_FEATURES.map((l) => (
              <li key={l.id}>
                <Link
                  className="font-medium underline"
                  href={l.kind === "certs" ? `/${venueSlug}/owner/certs` : l.kind === "menu" ? `/${venueSlug}/owner/onboarding/menu` : `/${venueSlug}/owner/completions`}
                >
                  {l.title}
                </Link>
                . {l.note}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
