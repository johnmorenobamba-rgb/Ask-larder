import Link from "next/link";
import { requireStationContext } from "@/lib/stations/requireStationContext";
import { createClient } from "@/lib/supabase/server";
import { NearMissReportButton } from "@/components/staff/NearMissReportButton";
import { AskLarderChat } from "@/components/staff/AskLarderChat";

export default async function StationFaqsPage({
  params,
}: {
  params: Promise<{ venueSlug: string; qrCodeSlug: string }>;
}) {
  const { venueSlug, qrCodeSlug } = await params;
  const hubPath = `/${venueSlug}/station/${qrCodeSlug}`;
  const { staff, station } = await requireStationContext(venueSlug, qrCodeSlug, `${hubPath}/faqs`);

  const supabase = await createClient();
  const { data: faqs } = await supabase
    .from("station_faqs")
    .select("id, question, answer")
    .eq("station_id", station.id)
    .eq("status", "approved")
    .order("created_at");

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-8">
        <div>
          <Link href={hubPath} className="mb-3 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-clay-brown hover:text-ink">
            ← Back to station
          </Link>
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">{station.name}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">FAQs</h1>
        </div>

        {(faqs ?? []).length === 0 ? (
          <p className="font-sans text-ink/70">No FAQs have been added for this station yet.</p>
        ) : (
          <div className="space-y-4">
            {(faqs ?? []).map((faq) => (
              <div key={faq.id} className="space-y-2 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
                <p className="font-display text-lg font-bold text-ink">{faq.question}</p>
                <p className="font-sans text-sm text-ink/80">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <NearMissReportButton venueSlug={venueSlug} venueId={staff.venue_id!} stationId={station.id} />
      <AskLarderChat venueSlug={venueSlug} stationId={station.id} />
    </main>
  );
}
