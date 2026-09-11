import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { fetchSopDocumentData } from "@/lib/sop/fetchSopDocumentData";
import { SopDocumentView } from "@/components/owner/SopDocumentView";
import { GenerateSopButton } from "@/components/owner/GenerateSopButton";
import { RequestEditForm } from "@/components/owner/RequestEditForm";
import { PrintButton } from "@/components/owner/PrintButton";

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

  const data = await fetchSopDocumentData(supabase, staff!.venue_id!, moduleId);

  if (!data) {
    return (
      <main className="min-h-screen bg-parchment px-6 py-10">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <Link href={`/${venueSlug}/owner/sops`} className="font-mono text-xs uppercase tracking-wide text-clay-brown">
            Back to SOPs
          </Link>
          <p className="font-sans text-ink">No curated SOP document exists for this module yet.</p>
          <GenerateSopButton moduleId={moduleId} hasExisting={false} />
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

        <SopDocumentView {...data} />
      </div>
    </main>
  );
}
