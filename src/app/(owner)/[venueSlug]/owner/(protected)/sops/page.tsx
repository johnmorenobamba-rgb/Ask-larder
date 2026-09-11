import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { GenerateSopButton } from "@/components/owner/GenerateSopButton";

export default async function SopsPage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: modules } = await supabase
    .from("modules")
    .select("id, title, status, sop_documents(generated_at)")
    .eq("venue_id", staff!.venue_id!)
    .order("title");

  const rows = modules ?? [];
  const withDoc = rows.filter((m) => m.sop_documents !== null).length;

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">SOPs</h1>
            <p className="font-sans text-sm text-clay-brown">
              {withDoc} of {rows.length} modules have a curated SOP document.
            </p>
          </div>
          <Link
            href={`/${venueSlug}/owner/sops/print-all`}
            className="rounded-full border-2 border-clay-brown px-5 py-2 font-sans text-sm font-medium text-ink"
          >
            Print all
          </Link>
        </div>

        <div className="space-y-2">
          {rows.map((m) => {
            const hasDoc = m.sop_documents !== null;
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-clay-brown/30 px-4 py-3"
              >
                <div>
                  <p className="font-sans font-medium text-ink">{m.title}</p>
                  <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">
                    {m.status} · {hasDoc ? "SOP document ready" : "No SOP document yet"}
                  </p>
                </div>
                {hasDoc ? (
                  <Link
                    href={`/${venueSlug}/owner/sops/${m.id}`}
                    className="rounded-full bg-preserve-red px-5 py-2 font-sans text-sm font-medium text-parchment"
                  >
                    View
                  </Link>
                ) : (
                  <GenerateSopButton moduleId={m.id} hasExisting={false} />
                )}
              </div>
            );
          })}
          {rows.length === 0 && <p className="font-sans text-sm text-clay-brown">No modules yet.</p>}
        </div>
      </div>
    </main>
  );
}
