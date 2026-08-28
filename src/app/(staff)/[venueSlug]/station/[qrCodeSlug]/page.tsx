import { redirect, notFound } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOutstandingAcknowledgements } from "@/lib/staff/outstandingAcknowledgements";
import { ModuleRunner } from "@/components/staff/ModuleRunner";
import { NearMissReportButton } from "@/components/staff/NearMissReportButton";

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
  if (!station?.primary_module_id) notFound();

  const { data: module } = await supabase
    .from("modules")
    .select("id, title, status")
    .eq("id", station.primary_module_id)
    .single();
  if (!module || !["approved", "live"].includes(module.status ?? "")) notFound();

  const { data: sections } = await supabase
    .from("module_sections")
    .select("id, section_order, content")
    .eq("module_id", module.id)
    .order("section_order");

  const { data: questions } = await supabase
    .from("check_questions")
    .select("id, question, options, correct_option_index, expected_answer_context")
    .eq("module_id", module.id);

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-4 pb-4">
        <p className="font-mono text-xs text-clay-brown">{station.name}</p>
      </div>
      <ModuleRunner
        venueSlug={venueSlug}
        moduleId={module.id}
        moduleTitle={module.title}
        sections={sections ?? []}
        questions={(questions ?? []).map((q) => ({
          id: q.id,
          question: q.question,
          options: (q.options as string[]) ?? [],
          correct_option_index: q.correct_option_index,
          correctiveText: stripAnswerPrefix(q.expected_answer_context),
        }))}
        backHref={currentPath}
        backLabel="Back to station"
      />
      <div className="mx-auto w-full max-w-lg space-y-3 pt-6 text-center">
        <button
          type="button"
          disabled
          className="rounded-full border-2 border-clay-brown/40 px-6 py-2 font-sans text-sm text-clay-brown opacity-60"
        >
          Ask Larder — coming soon
        </button>
      </div>
      <NearMissReportButton venueSlug={venueSlug} venueId={staff.venue_id!} stationId={station.id} />
    </main>
  );
}
