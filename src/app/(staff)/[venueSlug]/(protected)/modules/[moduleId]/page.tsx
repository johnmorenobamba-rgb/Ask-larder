import { redirect, notFound } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ReadOnlyModule } from "@/components/staff/ReadOnlyModule";
import { ModuleRunner } from "@/components/staff/ModuleRunner";
import { getModuleStationPhoto } from "@/lib/stations/getModuleStationPhoto";
import { logQueryError } from "@/lib/supabase/logQueryError";

function stripAnswerPrefix(context: string | null): string | null {
  if (!context) return null;
  return context.replace(/^Correct:\s*[A-Za-z]\s*—\s*/, "");
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ venueSlug: string; moduleId: string }>;
}) {
  const { venueSlug, moduleId } = await params;
  const staff = await getCurrentStaff();
  if (!staff) redirect(`/${venueSlug}/login`);
  if (!staff.staff_role_id && !staff.isDevice) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();

  // A staff member's module page needs five independent reads. They all start
  // now and are awaited together further down, so the page waits one round
  // instead of five. The shared iPad account takes its own read only branch
  // below, unchanged, so none of these start for it.
  const staffReads = staff.isDevice
    ? null
    : Promise.all([
        // Same role-visibility filter as the checklist (modules/page.tsx) — needed
        // here only to compute this module's "X of Y" position, per the New-Hire
        // Flow spec's global-chrome progress chit.
        supabase.from("modules").select("id, module_roles(role_id)").eq("venue_id", staff.venue_id!).in("status", ["approved", "live"]),
        supabase.from("module_sections").select("id, section_order, content").eq("module_id", moduleId).order("section_order"),
        supabase
          .from("check_questions")
          .select("id, question, options, correct_option_index, expected_answer_context, section_order")
          .eq("module_id", moduleId),
        getModuleStationPhoto(supabase, moduleId),
      ]);
  // If the page bails out early (notFound), a failure in these reads must not surface as an unhandled rejection.
  staffReads?.catch(() => {});

  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("id, title")
    .eq("id", moduleId)
    .single();
  logQueryError(`[${venueSlug}] module ${moduleId}`, moduleError);
  if (!module) notFound();

  // Shared venue iPad: read only. RLS and the status filter keep it to approved or live content; the device account
  // has no staff role, so a module restricted to specific roles is not shown to it.
  if (staff.isDevice) {
    const { data: mod } = await supabase
      .from("modules")
      .select("id, title, status, module_roles(role_id)")
      .eq("id", moduleId)
      .eq("venue_id", staff.venue_id!)
      .in("status", ["approved", "live"])
      .maybeSingle();
    if (!mod || mod.module_roles.length > 0) notFound();
    const { data: secs } = await supabase
      .from("module_sections")
      .select("id, section_order, content")
      .eq("module_id", moduleId)
      .order("section_order");
    return <ReadOnlyModule title={mod.title} sections={secs ?? []} backHref={`/${venueSlug}/modules`} backLabel="Back to training" />;
  }

  const [
    { data: allModules, error: allModulesError },
    { data: sections, error: sectionsError },
    { data: questions, error: questionsError },
    stationPhoto,
  ] = await staffReads!;
  logQueryError(`[${venueSlug}] module ${moduleId} allModules`, allModulesError);
  logQueryError(`[${venueSlug}] module ${moduleId} sections`, sectionsError);
  logQueryError(`[${venueSlug}] module ${moduleId} questions`, questionsError);
  const visibleModuleIds = (allModules ?? [])
    .filter(
      (m) =>
        m.module_roles.length === 0 || m.module_roles.some((mr) => mr.role_id === staff.staff_role_id),
    )
    .map((m) => m.id);
  const moduleIndex = visibleModuleIds.indexOf(moduleId);


  return (
    <ModuleRunner
      venueSlug={venueSlug}
      moduleId={module.id}
      moduleTitle={module.title}
      moduleIndex={moduleIndex >= 0 ? moduleIndex + 1 : undefined}
      totalModules={visibleModuleIds.length}
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
    />
  );
}
