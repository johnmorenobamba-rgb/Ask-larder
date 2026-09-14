import Link from "next/link";
import { requireStationContext } from "@/lib/stations/requireStationContext";
import { createClient } from "@/lib/supabase/server";
import { NearMissReportButton } from "@/components/staff/NearMissReportButton";
import { AskLarderChat } from "@/components/staff/AskLarderChat";
import { logQueryError } from "@/lib/supabase/logQueryError";

export default async function StationTroubleshootingPage({
  params,
}: {
  params: Promise<{ venueSlug: string; qrCodeSlug: string }>;
}) {
  const { venueSlug, qrCodeSlug } = await params;
  const hubPath = `/${venueSlug}/station/${qrCodeSlug}`;
  const { staff, station } = await requireStationContext(venueSlug, qrCodeSlug, `${hubPath}/troubleshooting`);

  const supabase = await createClient();
  const { data: issues, error: issuesError } = await supabase
    .from("station_troubleshooting_issues")
    .select("id, issue_title, diagnosis_steps, resolution_text, escalation_required")
    .eq("station_id", station.id)
    .eq("status", "approved")
    .order("created_at");
  logQueryError(`[${venueSlug}/${qrCodeSlug}] troubleshooting`, issuesError);

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-8">
        <div>
          <Link href={hubPath} className="mb-3 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-clay-brown hover:text-ink">
            ← Back to station
          </Link>
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">{station.name}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">Troubleshooting</h1>
        </div>

        {(issues ?? []).length === 0 ? (
          <p className="font-sans text-ink/70">No troubleshooting steps have been added for this station yet.</p>
        ) : (
          <div className="space-y-4">
            {(issues ?? []).map((issue) => (
              <div key={issue.id} className="space-y-2 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
                <p className="font-display text-lg font-bold text-ink">{issue.issue_title}</p>
                <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Try this</p>
                <p className="font-sans text-sm text-ink/80">{issue.diagnosis_steps}</p>
                <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Then</p>
                <p className="font-sans text-sm text-ink/80">{issue.resolution_text}</p>
                {issue.escalation_required && (
                  <div className="rounded-r-lg border-l-4 border-preserve-red bg-preserve-red/5 py-3 pl-4 pr-3">
                    <p className="font-sans text-sm text-ink">
                      If this doesn&apos;t fix it, stop and ask your supervisor for help.
                    </p>
                  </div>
                )}
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
