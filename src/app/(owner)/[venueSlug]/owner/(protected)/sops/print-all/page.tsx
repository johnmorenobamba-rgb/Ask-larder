import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { fetchSopDocumentData } from "@/lib/sop/fetchSopDocumentData";
import { SopDocumentView } from "@/components/owner/SopDocumentView";
import { PrintButton } from "@/components/owner/PrintButton";

// Block R3 -- concatenates every module's cached sop_documents row into one
// continuous print job (cover page, table of contents, one SOP per page),
// same print-stylesheet + window.print() approach as the single view page,
// not a separate generation path. A module with no cached document is
// listed and flagged in the table of contents, never silently dropped --
// the whole point of caching-not-regenerating-on-view is that "Print all"
// must be honest about what it's actually printing.
export default async function PrintAllSopsPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: venue }, { data: modules }] = await Promise.all([
    supabase.from("venues").select("name").eq("id", staff!.venue_id!).maybeSingle(),
    supabase.from("modules").select("id, title").eq("venue_id", staff!.venue_id!).order("title"),
  ]);

  const rows = modules ?? [];
  const withDocs = await Promise.all(
    rows.map(async (m) => ({
      module: m,
      data: await fetchSopDocumentData(supabase, staff!.venue_id!, m.id),
    })),
  );
  const missing = withDocs.filter((r) => !r.data);

  return (
    <main className="min-h-screen bg-parchment px-6 py-10 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/${venueSlug}/owner/sops`} className="font-mono text-xs uppercase tracking-wide text-clay-brown">
            Back to SOPs
          </Link>
          <PrintButton label="Print all" />
        </div>

        {/* Cover page */}
        <section className="space-y-2 break-after-page bg-parchment px-8 py-16 text-center print:bg-white">
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Standard operating procedures</p>
          <h1 className="font-display text-4xl font-bold text-ink">{venue?.name ?? "Venue"}</h1>
          <p className="font-mono text-xs text-clay-brown">Printed {new Date().toLocaleDateString()}</p>
        </section>

        {/* Table of contents */}
        <section className="break-after-page space-y-3 bg-parchment px-8 py-10 print:bg-white">
          <h2 className="font-display text-xl font-bold text-ink">Contents</h2>
          <ol className="list-decimal space-y-1 pl-5 font-sans text-ink">
            {withDocs.map(({ module, data }) => (
              <li key={module.id}>
                {module.title}
                {!data && (
                  <span className="ml-2 font-mono text-xs font-bold uppercase tracking-wide text-preserve-red">
                    Missing curated document
                  </span>
                )}
              </li>
            ))}
          </ol>
          {missing.length > 0 && (
            <p className="font-sans text-sm text-preserve-red">
              {missing.length} module{missing.length === 1 ? "" : "s"} flagged above have no curated SOP document yet
              and are not included below. Generate them from the SOPs page before relying on this as a complete set.
            </p>
          )}
        </section>

        {/* One SOP per section */}
        {withDocs.map(({ module, data }, i) => (
          <section key={module.id} className={i < withDocs.length - 1 ? "break-after-page" : undefined}>
            {data ? (
              <SopDocumentView {...data} />
            ) : (
              <div className="rounded-2xl border-2 border-preserve-red px-6 py-8 text-center">
                <p className="font-display text-lg font-bold text-ink">{module.title}</p>
                <p className="mt-2 font-sans text-preserve-red">
                  No curated SOP document has been generated for this module yet. This page intentionally shows this
                  notice rather than silently omitting the module from the printed set.
                </p>
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
