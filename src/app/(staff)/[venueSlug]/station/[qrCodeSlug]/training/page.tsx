import { requireStationContext } from "@/lib/stations/requireStationContext";
import { createClient } from "@/lib/supabase/server";
import { ModuleRunner } from "@/components/staff/ModuleRunner";
import { NearMissReportButton } from "@/components/staff/NearMissReportButton";
import { AskLarderChat } from "@/components/staff/AskLarderChat";
import { getModuleStationPhoto } from "@/lib/stations/getModuleStationPhoto";
import { logQueryError } from "@/lib/supabase/logQueryError";

function stripAnswerPrefix(context: string | null): string | null {
  if (!context) return null;
  return context.replace(/^Correct:\s*[A-Za-z]\s*—\s*/, "");
}

export default async function StationTrainingPage({
  params,
}: {
  params: Promise<{ venueSlug: string; qrCodeSlug: string }>;
}) {
  const { venueSlug, qrCodeSlug } = await params;
  const hubPath = `/${venueSlug}/station/${qrCodeSlug}`;
  const { staff, station } = await requireStationContext(venueSlug, qrCodeSlug, `${hubPath}/training`);

  const supabase = await createClient();

  let module: { id: string; title: string; status: string | null } | null = null;
  if (station.primary_module_id) {
    const { data, error: moduleError } = await supabase
      .from("modules")
      .select("id, title, status")
      .eq("id", station.primary_module_id)
      .maybeSingle();
    logQueryError(`[${venueSlug}/${qrCodeSlug}] training module`, moduleError);
    if (data && ["approved", "live"].includes(data.status ?? "")) module = data;
  }

  // A station can exist and be reachable from the hub without training
  // linked yet (a QR label can be printed before its module is ready) --
  // shown instead of notFound() so this always tells a real staff member
  // something true.
  if (!module) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-parchment px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">{station.name}</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">No training linked yet</h1>
        <p className="mt-3 max-w-sm font-sans text-ink/70">
          This station doesn&apos;t have a module assigned yet. Ask your manager to link one from the Stations page.
        </p>
      </main>
    );
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("module_sections")
    .select("id, section_order, content")
    .eq("module_id", module.id)
    .order("section_order");
  logQueryError(`[${venueSlug}/${qrCodeSlug}] training sections`, sectionsError);

  const { data: questions, error: questionsError } = await supabase
    .from("check_questions")
    .select("id, question, options, correct_option_index, expected_answer_context, section_order")
    .eq("module_id", module.id);
  logQueryError(`[${venueSlug}/${qrCodeSlug}] training questions`, questionsError);

  const stationPhoto = await getModuleStationPhoto(supabase, module.id);

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-4 pb-4">
        <p className="font-mono text-xs text-clay-brown">{station.name}</p>
      </div>
      <ModuleRunner
        venueSlug={venueSlug}
        moduleId={module.id}
        moduleTitle={module.title}
        stationPhoto={stationPhoto}
        sections={sections ?? []}
        questions={(questions ?? []).map((q) => ({
          id: q.id,
          question: q.question,
          options: (q.options as string[]) ?? [],
          correct_option_index: q.correct_option_index,
          correctiveText: stripAnswerPrefix(q.expected_answer_context),
          section_order: q.section_order,
        }))}
        backHref={hubPath}
        backLabel="Back to station"
      />
      <NearMissReportButton venueSlug={venueSlug} venueId={staff.venue_id!} stationId={station.id} />
      <AskLarderChat venueSlug={venueSlug} stationId={station.id} />
    </main>
  );
}
