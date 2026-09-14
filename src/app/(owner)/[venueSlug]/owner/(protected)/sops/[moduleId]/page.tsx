import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { fetchSopDocumentData } from "@/lib/sop/fetchSopDocumentData";
import { SopDocumentView } from "@/components/owner/SopDocumentView";
import { GenerateSopButton } from "@/components/owner/GenerateSopButton";
import { RequestEditForm } from "@/components/owner/RequestEditForm";
import { PrintButton } from "@/components/owner/PrintButton";
import { ProvenanceBadge, type Provenance } from "@/components/owner/ProvenanceBadge";

// The View page doubles as the Print page (Block R3): no separate PDF
// generation, no server-side rendering pipeline -- window.print() against
// this same rendered page, with print:hidden on every action element and
// print:bg-white on the document itself (SopDocumentView), is the entire
// print path.
export default async function SopDocumentPage({
  params,
}: {
  params: Promise<{ venueSlug: string; moduleId: string }>;
}) {
  const { venueSlug, moduleId } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [data, { data: sections }, { data: moduleRow }] = await Promise.all([
    fetchSopDocumentData(supabase, staff!.venue_id!, moduleId),
    supabase.from("module_sections").select("id, provenance, citation").eq("module_id", moduleId),
    supabase.from("modules").select("topic_key").eq("id", moduleId).maybeSingle(),
  ]);
  let manufacturer: string | null = null;
  if (moduleRow?.topic_key?.startsWith("station_equipment_")) {
    const slug = moduleRow.topic_key.replace("station_equipment_", "");
    const { data: station } = await supabase.from("stations").select("equipment_manufacturer").eq("qr_code_slug", slug).maybeSingle();
    manufacturer = station?.equipment_manufacturer ?? null;
  }
  // The curated SOP document resynthesizes every section into new
  // Purpose/Scope/Procedure/etc. fields (generateSopDocument.ts), so a
  // per-paragraph provenance badge isn't structurally possible here the way
  // it is on the raw section preview in the Modules list -- this is a
  // document-level "this document includes content Larder added" signal
  // instead, one badge per distinct source actually present.
  const distinctProvenance = new Map<string, { provenance: string; citation: string | null; sectionId: string }>();
  for (const s of sections ?? []) {
    if (s.provenance === "owner_sourced") continue;
    const key = `${s.provenance}:${s.citation ?? ""}`;
    if (!distinctProvenance.has(key)) distinctProvenance.set(key, { provenance: s.provenance, citation: s.citation, sectionId: s.id });
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-parchment px-6 py-10">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <Link href={`/${venueSlug}/owner/sops`} className="font-mono text-xs uppercase tracking-wide text-clay-brown">
            Back to SOPs
          </Link>
          <p className="font-sans text-ink">No curated SOP document exists for this module yet.</p>
          <GenerateSopButton moduleId={moduleId} hasExisting={false} />
          {/* Fixed 14 Sep 2026: provenance was previously only shown below,
              inside the "has a curated document" branch -- a module whose
              document generation never ran or failed (a real, best-effort
              step on go-live) lost this entirely, even though its sections'
              provenance is already known here. */}
          {distinctProvenance.size > 0 && (
            <div className="space-y-2 rounded-2xl border-2 border-clay-brown/20 bg-parchment/60 px-4 py-3">
              <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">This module includes content added by Larder</p>
              {Array.from(distinctProvenance.values()).map((p) => (
                <ProvenanceBadge
                  key={p.sectionId}
                  provenance={p.provenance as Provenance}
                  citation={p.citation}
                  manufacturer={manufacturer}
                  confirmUrl={`/api/owner/module-sections/${p.sectionId}/confirm-recommendation`}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-parchment px-6 py-10 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/${venueSlug}/owner/sops`} className="font-mono text-xs uppercase tracking-wide text-clay-brown">
            Back to SOPs
          </Link>
          <div className="flex flex-wrap gap-3">
            <PrintButton />
            <GenerateSopButton moduleId={moduleId} hasExisting />
            <RequestEditForm moduleId={moduleId} />
          </div>
        </div>

        {distinctProvenance.size > 0 && (
          <div className="space-y-2 rounded-2xl border-2 border-clay-brown/20 bg-parchment/60 px-4 py-3 print:hidden">
            <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">This document includes content added by Larder</p>
            {Array.from(distinctProvenance.values()).map((p) => (
              <ProvenanceBadge
                key={p.sectionId}
                provenance={p.provenance as Provenance}
                citation={p.citation}
                manufacturer={manufacturer}
                confirmUrl={`/api/owner/module-sections/${p.sectionId}/confirm-recommendation`}
              />
            ))}
          </div>
        )}

        <SopDocumentView {...data} />
      </div>
    </main>
  );
}
