import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SectionContentEditor } from "@/components/owner/SectionContentEditor";
import { CheckQuestionEditor } from "@/components/owner/CheckQuestionEditor";
import { PublishVersionForm } from "@/components/owner/PublishVersionForm";

export default async function OwnerModuleEditPage({
  params,
}: {
  params: Promise<{ venueSlug: string; moduleId: string }>;
}) {
  const { moduleId } = await params;
  const supabase = await createClient();

  const { data: module } = await supabase.from("modules").select("id, title, status").eq("id", moduleId).maybeSingle();
  if (!module) notFound();

  const [{ data: sections }, { data: questions }] = await Promise.all([
    supabase.from("module_sections").select("id, section_order, content").eq("module_id", moduleId).order("section_order"),
    supabase.from("check_questions").select("id, question").eq("module_id", moduleId),
  ]);

  return (
    <main className="min-h-screen bg-parchment px-6 py-10">
      <div className="mx-auto w-full max-w-lg space-y-8">
        <h1 className="font-display text-3xl font-bold text-ink">{module.title}</h1>

        <div className="space-y-4">
          <p className="font-mono text-xs text-clay-brown">Sections</p>
          {(sections ?? []).map((s) => (
            <SectionContentEditor key={s.id} sectionId={s.id} initialContent={s.content ?? ""} />
          ))}
        </div>

        <div className="space-y-4">
          <p className="font-mono text-xs text-clay-brown">Check questions</p>
          {(questions ?? []).map((q) => (
            <CheckQuestionEditor key={q.id} questionId={q.id} initialQuestion={q.question} />
          ))}
        </div>

        {module.status === "live" && <PublishVersionForm moduleId={module.id} />}
      </div>
    </main>
  );
}
