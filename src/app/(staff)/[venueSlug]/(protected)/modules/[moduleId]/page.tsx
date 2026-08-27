import { redirect, notFound } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ModuleRunner } from "@/components/staff/ModuleRunner";

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

  const { data: module } = await supabase
    .from("modules")
    .select("id, title")
    .eq("id", moduleId)
    .single();
  if (!module) notFound();

  const { data: sections } = await supabase
    .from("module_sections")
    .select("id, section_order, content")
    .eq("module_id", moduleId)
    .order("section_order");

  const { data: questions } = await supabase
    .from("check_questions")
    .select("id, question, options, correct_option_index, expected_answer_context")
    .eq("module_id", moduleId);

  return (
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
    />
  );
}
