import { redirect, notFound } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOutstandingAcknowledgements } from "@/lib/staff/outstandingAcknowledgements";
import { ModuleRunner } from "@/components/staff/ModuleRunner";
import { NearMissReportButton } from "@/components/staff/NearMissReportButton";
import { AskLarderChat } from "@/components/staff/AskLarderChat";
import { getModuleStationPhoto } from "@/lib/stations/getModuleStationPhoto";

function stripAnswerPrefix(context: string | null): string | null {
  if (!context) return null;
  return context.replace(/^Correct:\s*[A-Za-z]\s*—\s*/, "");
}

// Sibling of (protected), like login — owns its own session check so it can
// construct its own redirectTo and land the staff member straight back here
// after logging in (per the locked decision: no anonymous QR read path).
export default async function StationPage({
  params,
}: {
  params: Promise<{ venueSlug: string; qrCodeSlug: string }>;
}) {
  const { venueSlug, qrCodeSlug } = await params;
  const staff = await getCurrentStaff();
  const currentPath = `/${venueSlug}/station/${qrCodeSlug}`;

  if (!staff) {
    redirect(`/${venueSlug}/login?redirectTo=${encodeURIComponent(currentPath)}`);
  }
  // Known gap accepted for v1: a staff member with no role yet loses this
  // return-to after selecting a role (bounces to /modules instead).
  if (!staff.staff_role_id) redirect(`/${venueSlug}/roles`);

  // Station entry is a sibling of (protected), so it doesn't inherit that
  // layout's re-acknowledgement gate — check it directly, otherwise a
  // staff member who only ever enters via QR scan would never see it.
  const outstanding = await getOutstandingAcknowledgements(staff.id);
  if (outstanding.length > 0) redirect(`/${venueSlug}/module-updates`);

  const supabase = await createClient();

  const { data: station } = await supabase
    .from("stations")
    .select("id, name, primary_module_id")
    .eq("qr_code_slug", qrCodeSlug)
    .eq("venue_id", staff.venue_id!)
    .maybeSingle();
  // Station truly doesn't exist for this venue/slug (wrong QR, deleted
  // station) -- a genuine 404, not the "no content" state below.
  if (!station) notFound();

  let module: { id: string; title: string; status: string | null } | null = null;
  if (station.primary_module_id) {
    const { data } = await supabase
      .from("modules")
      .select("id, title, status")
      .eq("id", station.primary_module_id)
      .maybeSingle();
    if (data && ["approved", "live"].includes(data.status ?? "")) module = data;
  }

  // Block S2 -- a station that exists but has nothing (yet) to show is a
  // real, expected state (a QR label can be printed before its module is
  // ready), never a bare 404. Shown instead of notFound() so scanning a
  // freshly-printed label always tells a real staff member something true.
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

  const { data: sections } = await supabase
    .from("module_sections")
    .select("id, section_order, content")
    .eq("module_id", module.id)
    .order("section_order");

  const { data: questions } = await supabase
    .from("check_questions")
    .select("id, question, options, correct_option_index, expected_answer_context, section_order")
    .eq("module_id", module.id);

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
        backHref={currentPath}
        backLabel="Back to station"
      />
      <NearMissReportButton venueSlug={venueSlug} venueId={staff.venue_id!} stationId={station.id} />
      <AskLarderChat venueSlug={venueSlug} stationId={station.id} />
    </main>
  );
}
