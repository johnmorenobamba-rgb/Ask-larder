import Link from "next/link";
import { requireOwnerPageStaff } from "@/lib/auth/ownerPage";
import { createClient } from "@/lib/supabase/server";
import { FORM_OPTIONS, parseFilters, queryRecords, tagLabel } from "@/lib/compliance/engine/records";
import { PrintRecordsButton } from "@/components/owner/PrintRecordsButton";

export const dynamic = "force-dynamic";

// Per form record list with filters, a print layout an inspector would accept (Branding Kit: Ink on
// white, Space Grotesk headings, Plex Mono labels) and a CSV download of exactly what is on screen.
export default async function OwnerRecordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ venueSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { venueSlug } = await params;
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const staff = await requireOwnerPageStaff(venueSlug);
  const supabase = await createClient();
  const { records, timeZone, degraded, truncated, venueName } = await queryRecords(supabase, staff!.venue_id!, filters, 500);

  const qs = new URLSearchParams();
  if (filters.formId) qs.set("form", filters.formId);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  if (filters.result !== "all") qs.set("result", filters.result);
  const csvHref = `/api/owner/compliance/export${qs.toString() ? `?${qs.toString()}` : ""}`;
  const formTitle = FORM_OPTIONS.find((f) => f.id === filters.formId)?.title ?? "All forms";
  const period = filters.from || filters.to ? `${filters.from ?? "the start"} to ${filters.to ?? "today"}` : "All dates";
  const printedAt = new Intl.DateTimeFormat("en-AU", { timeZone, dateStyle: "long", timeStyle: "short" }).format(new Date());
  const fails = records.filter((r) => r.failed).length;

  return (
    <main className="records-page min-h-screen bg-parchment px-4 py-10 md:px-6">
      <style>{`
        @page { size: A4; margin: 14mm; }
        .print-only { display: none; }
        @media print {
          html, body, .records-page { background: #ffffff !important; color: #1F1B16 !important; }
          .records-page { padding: 0 !important; min-height: 0 !important; }
          [data-no-print], header, nav { display: none !important; }
          .print-only { display: block !important; }
          .record-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
          .record-table th { text-align: left; font-family: var(--font-mono, "IBM Plex Mono", monospace); font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1.5pt solid #1F1B16; padding: 3pt 4pt; }
          .record-table td { border-bottom: 0.5pt solid #7A5C43; padding: 4pt; vertical-align: top; }
          .record-table tr { break-inside: avoid; }
          .record-fail td:first-child { box-shadow: inset 3pt 0 0 #B23A2C; }
          h1, h2 { font-family: var(--font-display, "Space Grotesk", sans-serif); }
        }
      `}</style>

      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div data-no-print className="space-y-1">
          <Link href={`/${venueSlug}/owner/compliance`} className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-wide text-clay-brown hover:text-ink">
            Back to compliance overview
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink">Compliance records</h1>
        </div>

        <form data-no-print method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border-2 border-clay-brown/50 px-4 py-4">
          <label className="space-y-1 font-sans text-sm text-ink">
            <span className="block font-mono text-xs uppercase tracking-wide text-clay-brown">Form</span>
            <select name="form" defaultValue={filters.formId ?? ""} className="min-h-12 rounded-xl border-2 border-clay-brown bg-parchment px-3 font-sans text-base text-ink">
              <option value="">All forms</option>
              {FORM_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 font-sans text-sm text-ink">
            <span className="block font-mono text-xs uppercase tracking-wide text-clay-brown">From</span>
            <input type="date" name="from" defaultValue={filters.from ?? ""} className="min-h-12 rounded-xl border-2 border-clay-brown bg-parchment px-3 font-sans text-base text-ink" />
          </label>
          <label className="space-y-1 font-sans text-sm text-ink">
            <span className="block font-mono text-xs uppercase tracking-wide text-clay-brown">To</span>
            <input type="date" name="to" defaultValue={filters.to ?? ""} className="min-h-12 rounded-xl border-2 border-clay-brown bg-parchment px-3 font-sans text-base text-ink" />
          </label>
          <label className="space-y-1 font-sans text-sm text-ink">
            <span className="block font-mono text-xs uppercase tracking-wide text-clay-brown">Result</span>
            <select name="result" defaultValue={filters.result} className="min-h-12 rounded-xl border-2 border-clay-brown bg-parchment px-3 font-sans text-base text-ink">
              <option value="all">All results</option>
              <option value="fail">Fails only</option>
              <option value="pass">Passes only</option>
            </select>
          </label>
          <button type="submit" className="min-h-12 rounded-full bg-ink px-6 font-sans text-base font-medium text-parchment">
            Show records
          </button>
        </form>

        <div data-no-print className="flex flex-wrap gap-3">
          <PrintRecordsButton />
          <a href={csvHref} className="inline-flex min-h-12 items-center rounded-full border-2 border-clay-brown px-6 font-sans text-base font-medium text-ink hover:border-ink">
            Download CSV
          </a>
        </div>

        {degraded && (
          <p role="alert" className="rounded-2xl border-2 border-preserve-red px-4 py-3 font-sans text-base text-preserve-red">
            Couldn&apos;t load the records. Reload the page to try again.
          </p>
        )}

        <div className="print-only space-y-1" aria-hidden="false">
          <p className="font-mono text-[8pt] uppercase tracking-wide">Larder compliance record</p>
          <h2 className="text-[20pt] font-bold">{venueName}</h2>
          <p className="text-[10pt]">
            {formTitle}. {period}. {filters.result === "fail" ? "Fails only. " : filters.result === "pass" ? "Passes only. " : ""}
            Printed {printedAt}. Times are venue local time. Records are never edited: a correction is a new linked record.
          </p>
        </div>

        <p data-no-print className="font-sans text-base text-ink/70">
          {formTitle}. {period}. {records.length} {records.length === 1 ? "record" : "records"}, {fails} {fails === 1 ? "fail" : "fails"}.
          {truncated ? " Showing the newest 500. Narrow the dates to see older records." : ""}
        </p>

        {records.length === 0 ? (
          <p className="font-sans text-base text-ink/70">No records match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="record-table w-full border-collapse font-sans text-sm">
              <thead>
                <tr>
                  <th className="border-b-2 border-clay-brown/40 px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-clay-brown">When</th>
                  <th className="border-b-2 border-clay-brown/40 px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-clay-brown">Form</th>
                  <th className="border-b-2 border-clay-brown/40 px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-clay-brown">By</th>
                  <th className="border-b-2 border-clay-brown/40 px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-clay-brown">Result</th>
                  <th className="border-b-2 border-clay-brown/40 px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-clay-brown">Details</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className={r.failed ? "record-fail" : ""}>
                    <td className="border-b border-clay-brown/20 px-3 py-2 align-top text-ink">{r.at}</td>
                    <td className="border-b border-clay-brown/20 px-3 py-2 align-top text-ink">
                      {r.formTitle}
                      {r.stage ? <span className="block text-xs text-ink/70">{r.stage}</span> : null}
                      <span className="block font-mono text-[10px] uppercase tracking-wide text-clay-brown">{tagLabel(r.formId)}</span>
                    </td>
                    <td className="border-b border-clay-brown/20 px-3 py-2 align-top text-ink">
                      {r.by}
                      {r.cosigned ? <span className="block text-xs text-ink/70">Second signature: {r.cosigned}</span> : null}
                    </td>
                    <td className={`border-b border-clay-brown/20 px-3 py-2 align-top font-medium ${r.failed ? "text-preserve-red" : "text-bay-green"}`}>{r.failed ? "Fail" : "Pass"}</td>
                    <td className="border-b border-clay-brown/20 px-3 py-2 align-top text-ink">
                      {r.headline}
                      {r.corrects ? <span className="block text-xs text-ink/70">Corrects an earlier record.</span> : null}
                      {r.failed && r.reasons.length > 0 ? <span className="block text-xs">What failed: {r.reasons.join(". ")}.</span> : null}
                      {r.note ? <span className="block text-xs">Action: {r.note}</span> : null}
                      {r.comment ? <span className="block text-xs text-ink/70">Comment: {r.comment}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
