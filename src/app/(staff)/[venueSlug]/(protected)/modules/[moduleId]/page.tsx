import { redirect, notFound } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
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
  if (!staff.staff_role_id) redirect(`/${venueSlug}/roles`);

  const supabase = await createClient();

  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select("id, title")
    .eq("id", moduleId)
    .single();
  logQueryError(`[${venueSlug}] module ${moduleId}`, moduleError);
  if (!module) notFound();

  // Same role-visibility filter as the checklist (modules/page.tsx) — needed
  // here only to compute this module's "X of Y" position, per the New-Hire
  // Flow spec's global-chrome progress chit.
  const { data: allModules, error: allModulesError } = await supabase
    .from("modules")
    .select("id, module_roles(role_id)")
    .eq("venue_id", staff.venue_id!)
    .in("status", ["approved", "live"]);
  logQueryError(`[${venueSlug}] module ${moduleId} allModules`, allModulesError);
  const visibleModuleIds = (allModules ?? [])
    .filter(
      (m) =>
        m.module_roles.length === 0 || m.module_roles.some((mr) => mr.role_id === staff.staff_role_id),
    )
    .map((m) => m.id);
  const moduleIndex = visibleModuleIds.indexOf(moduleId);

  const { data: sections, error: sectionsError } = await supabase
    .from("module_sections")
    .select("id, section_order, content")
    .eq("module_id", moduleId)
    .order("section_order");
  logQueryError(`[${venueSlug}] module ${moduleId} sections`, sectionsError);

  const { data: questions, error: questionsError } = await supabase
    .from("check_questions")
    .select("id, question, options, correct_option_index, expected_answer_context, section_order")
    .eq("module_id", moduleId);
  logQueryError(`[${venueSlug}] module ${moduleId} questions`, questionsError);

  const stationPhoto = await getModuleStationPhoto(supabase, moduleId);

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
