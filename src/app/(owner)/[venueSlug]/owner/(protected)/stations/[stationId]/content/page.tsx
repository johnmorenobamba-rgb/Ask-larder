import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProvenanceBadge, type Provenance } from "@/components/owner/ProvenanceBadge";
import { ApproveFaqButton } from "@/components/owner/ApproveFaqButton";
import { ApproveTroubleshootingButton } from "@/components/owner/ApproveTroubleshootingButton";
import { logQueryError } from "@/lib/supabase/logQueryError";

// Provenance-aware approval UI, third surface (Modules list and the SOP
// view are the other two): station_faqs and station_troubleshooting_issues
// never had ANY owner-facing review surface before this -- the equipment-
// sourced content pipeline could generate them, but nothing let an owner
// actually see or approve them. Each row already carries its own clean
// provenance/citation (no resynthesis step in between, unlike the SOP
// view), so per-item badges here are exact, not an approximation.
export default async function StationContentPage({
  params,
}: {
  params: Promise<{ venueSlug: string; stationId: string }>;
}) {
  const { venueSlug, stationId } = await params;
  const supabase = await createClient();

  const [{ data: station, error: stationError }, { data: faqs, error: faqsError }, { data: issues, error: issuesError }] =
    await Promise.all([
      supabase.from("stations").select("name, equipment_manufacturer, equipment_model").eq("id", stationId).maybeSingle(),
      supabase.from("station_faqs").select("*").eq("station_id", stationId).order("created_at"),
      supabase.from("station_troubleshooting_issues").select("*").eq("station_id", stationId).order("created_at"),
    ]);
  logQueryError(`[${venueSlug}] station content station`, stationError);
  logQueryError(`[${venueSlug}] station content faqs`, faqsError);
  logQueryError(`[${venueSlug}] station content issues`, issuesError);

  if (!station) {
    return (
      <main className="min-h-screen bg-parchment px-6 py-10">
        <p className="font-sans text-ink">Station not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-8">
        <div>
          <Link href={`/${venueSlug}/owner/stations`} className="font-mono text-xs uppercase tracking-wide text-clay-brown">
            Back to stations
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">{station.name} content</h1>
          <p className="font-sans text-sm text-clay-brown">FAQs and troubleshooting entries staff will see when they scan this station.</p>
        </div>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold text-ink">FAQs</h2>
          {(faqs ?? []).length === 0 && <p className="font-sans text-sm text-clay-brown">None yet.</p>}
          {(faqs ?? []).map((f) => (
            <div key={f.id} className="space-y-2 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
              <p className="font-display text-ink">{f.question}</p>
              <p className="font-sans text-sm text-ink/80">{f.answer}</p>
              <ProvenanceBadge
                provenance={f.provenance as Provenance}
                citation={f.citation}
                manufacturer={station.equipment_manufacturer}
                confirmUrl={`/api/owner/station-faqs/${f.id}/confirm-recommendation`}
              />
              {f.status === "approved" ? (
                <p className="font-mono text-xs uppercase tracking-wide text-bay-green">Approved</p>
              ) : (
                <ApproveFaqButton faqId={f.id} disabled={f.provenance === "ai_recommended_pending"} />
              )}
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold text-ink">Troubleshooting</h2>
          {(issues ?? []).length === 0 && <p className="font-sans text-sm text-clay-brown">None yet.</p>}
          {(issues ?? []).map((t) => (
            <div key={t.id} className="space-y-2 rounded-2xl border-2 border-clay-brown/40 px-4 py-4">
              <p className="font-display text-ink">{t.issue_title}</p>
              <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Try this</p>
              <p className="font-sans text-sm text-ink/80">{t.diagnosis_steps}</p>
              <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">Then</p>
              <p className="font-sans text-sm text-ink/80">{t.resolution_text}</p>
              {t.escalation_required && (
                <p className="font-mono text-xs uppercase tracking-wide text-preserve-red">Always needs a technician or supervisor</p>
              )}
              <ProvenanceBadge
                provenance={t.provenance as Provenance}
                citation={t.citation}
                manufacturer={station.equipment_manufacturer}
                confirmUrl={`/api/owner/station-troubleshooting/${t.id}/confirm-recommendation`}
              />
              {t.status === "approved" ? (
                <p className="font-mono text-xs uppercase tracking-wide text-bay-green">Approved</p>
              ) : (
                <ApproveTroubleshootingButton issueId={t.id} disabled={t.provenance === "ai_recommended_pending"} />
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
