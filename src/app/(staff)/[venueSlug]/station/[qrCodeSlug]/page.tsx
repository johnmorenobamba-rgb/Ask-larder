import { requireStationContext } from "@/lib/stations/requireStationContext";
import { createClient } from "@/lib/supabase/server";
import { PressableLink } from "@/components/shared/PressableLink";
import { NearMissReportButton } from "@/components/staff/NearMissReportButton";
import { AskLarderChat } from "@/components/staff/AskLarderChat";
import { logQueryError } from "@/lib/supabase/logQueryError";

// Station entry point -- scanning a station's QR code always lands here
// first, never straight into a module. A printed QR label can't know in
// advance what a staff member actually needs (learn it for the first
// time, look something up mid shift, or work through a problem), so this
// is a genuine three-way choice, not a step in a sequence.
export default async function StationPage({
  params,
}: {
  params: Promise<{ venueSlug: string; qrCodeSlug: string }>;
}) {
  const { venueSlug, qrCodeSlug } = await params;
  const currentPath = `/${venueSlug}/station/${qrCodeSlug}`;
  const { staff, station } = await requireStationContext(venueSlug, qrCodeSlug, currentPath);

  const supabase = await createClient();

  let hasModule = false;
  if (station.primary_module_id) {
    const { data, error: moduleError } = await supabase
      .from("modules")
      .select("status")
      .eq("id", station.primary_module_id)
      .maybeSingle();
    logQueryError(`[${venueSlug}/${qrCodeSlug}] hub module status`, moduleError);
    hasModule = !!data && ["approved", "live"].includes(data.status ?? "");
  }

  const [{ count: faqCount, error: faqCountError }, { count: issueCount, error: issueCountError }] = await Promise.all([
    supabase
      .from("station_faqs")
      .select("id", { count: "exact", head: true })
      .eq("station_id", station.id)
      .eq("status", "approved"),
    supabase
      .from("station_troubleshooting_issues")
      .select("id", { count: "exact", head: true })
      .eq("station_id", station.id)
      .eq("status", "approved"),
  ]);
  logQueryError(`[${venueSlug}/${qrCodeSlug}] hub faqCount`, faqCountError);
  logQueryError(`[${venueSlug}/${qrCodeSlug}] hub issueCount`, issueCountError);

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">{station.name}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">What do you need?</h1>
        </div>

        <div className="space-y-4">
          <StationChoiceCard
            href={`${currentPath}/training`}
            label="Training"
            description={hasModule ? "Work through your training for this station." : "No training linked here yet."}
          />
          <StationChoiceCard
            href={`${currentPath}/faqs`}
            label="FAQs"
            description={
              faqCount && faqCount > 0
                ? `${faqCount} quick answer${faqCount === 1 ? "" : "s"} for this station.`
                : "No FAQs added for this station yet."
            }
          />
          <StationChoiceCard
            href={`${currentPath}/troubleshooting`}
            label="Troubleshooting"
            description={
              issueCount && issueCount > 0
                ? `${issueCount} known issue${issueCount === 1 ? "" : "s"} and how to fix them.`
                : "No troubleshooting steps added yet."
            }
          />
        </div>
      </div>
      <NearMissReportButton venueSlug={venueSlug} venueId={staff.venue_id!} stationId={station.id} />
      <AskLarderChat venueSlug={venueSlug} stationId={station.id} />
    </main>
  );
}

function StationChoiceCard({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <PressableLink
      href={href}
      className="block rounded-2xl border-2 border-clay-brown/40 px-5 py-6 hover:border-preserve-red"
    >
      <span className="block font-display text-xl font-bold text-ink">{label}</span>
      <span className="mt-1 block font-sans text-sm text-ink/70">{description}</span>
    </PressableLink>
  );
}
