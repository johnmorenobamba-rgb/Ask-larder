import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { ingestModule } from "@/lib/ai/ingestModule";

// Block T -- extracted out of the old Q5 module-sections/route.ts (retired
// along with SopIntakeHub.tsx once the guided intake flow replaced it) so
// the create-or-update/full-replace/backfill-topic_key/embed logic has one
// home, now called only by the curate route (T5), which persists
// AI-generated sections/questions instead of specialist-typed ones. No
// behavior changed from the original route -- same validation, same
// full-replace convention, same immediate re-embed.

export interface PersistSection {
  content: string;
  isRestricted: boolean;
}

export interface PersistCheckQuestion {
  question: string;
  sectionIndex: number;
  options: string[];
  correctOptionIndex: number;
  correctiveText?: string;
}

export interface PersistModuleContentInput {
  venueId: string;
  moduleId?: string;
  topicKey: string;
  title: string;
  sections: PersistSection[];
  checkQuestions: PersistCheckQuestion[];
}

export class PersistModuleContentError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function persistModuleContent(
  supabase: SupabaseClient<Database>,
  input: PersistModuleContentInput,
): Promise<{ moduleId: string; chunkCount: number }> {
  const { venueId, moduleId, topicKey, title, sections, checkQuestions } = input;

  if (!venueId || !topicKey || !title || sections.length === 0) {
    throw new PersistModuleContentError("venueId, topicKey, title, and at least one section are required.", 400);
  }
  // Module Content & Assessment Standard: multiple choice, occasionally
  // true/false -- 2 options is the floor (true/false), not 1.
  for (const q of checkQuestions) {
    if (q.options.length < 2) {
      throw new PersistModuleContentError(`"${q.question}" needs at least 2 options.`, 400);
    }
    if (q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
      throw new PersistModuleContentError(`"${q.question}"'s correct answer must be one of its own options.`, 400);
    }
    if (q.sectionIndex < 0 || q.sectionIndex >= sections.length) {
      throw new PersistModuleContentError(`checkQuestion.sectionIndex ${q.sectionIndex} is out of range.`, 400);
    }
    // A restricted section never gets an attached check_questions row -- a
    // multiple-choice question about a secret would have to embed the code
    // (or a plausible near-match), and check_questions has no is_restricted
    // column of its own to fall back on.
    if (sections[q.sectionIndex].isRestricted) {
      throw new PersistModuleContentError("A check question cannot be attached to a restricted (is_restricted=true) section.", 400);
    }
  }

  let resolvedModuleId = moduleId;
  if (resolvedModuleId) {
    const { data: existing, error: existingError } = await supabase
      .from("modules")
      .select("id")
      .eq("id", resolvedModuleId)
      .eq("venue_id", venueId)
      .maybeSingle();
    if (existingError) throw new PersistModuleContentError("Unexpected error.", 500);
    if (!existing) throw new PersistModuleContentError("Module not found for this venue.", 404);

    const { error: titleError } = await supabase.from("modules").update({ title, topic_key: topicKey }).eq("id", resolvedModuleId);
    if (titleError) throw new PersistModuleContentError("Unexpected error.", 500);

    const [{ error: deleteSectionsError }, { error: deleteQuestionsError }] = await Promise.all([
      supabase.from("module_sections").delete().eq("module_id", resolvedModuleId),
      supabase.from("check_questions").delete().eq("module_id", resolvedModuleId),
    ]);
    if (deleteSectionsError || deleteQuestionsError) throw new PersistModuleContentError("Unexpected error.", 500);
  } else {
    // status intentionally omitted -- defaults to 'draft' at the DB layer.
    // The owner-approval gate (draft -> pending_approval -> approved ->
    // live) only moves via the explicit approve/go-live flow.
    const { data: created, error: createError } = await supabase
      .from("modules")
      .insert({ venue_id: venueId, title, topic_key: topicKey })
      .select("id")
      .single();
    if (createError || !created) throw new PersistModuleContentError("Couldn't create the module.", 500);
    resolvedModuleId = created.id;
  }

  const { error: sectionsInsertError } = await supabase.from("module_sections").insert(
    sections.map((s, i) => ({
      module_id: resolvedModuleId,
      section_order: i,
      content: s.content,
      is_restricted: s.isRestricted,
    })),
  );
  if (sectionsInsertError) throw new PersistModuleContentError("Couldn't save module sections.", 500);

  if (checkQuestions.length > 0) {
    const { error: questionsInsertError } = await supabase.from("check_questions").insert(
      checkQuestions.map((q) => ({
        module_id: resolvedModuleId,
        question: q.question,
        section_order: q.sectionIndex,
        options: q.options,
        correct_option_index: q.correctOptionIndex,
        expected_answer_context: q.correctiveText?.trim() || null,
      })),
    );
    if (questionsInsertError) throw new PersistModuleContentError("Couldn't save check questions.", 500);
  }

  // Embed immediately, even pre-approval -- this is what makes the
  // gap-detection loop's test-question step actually work.
  try {
    const result = await ingestModule(resolvedModuleId!, supabase);
    return { moduleId: resolvedModuleId!, chunkCount: result.chunkCount };
  } catch {
    throw new PersistModuleContentError("Content was saved, but couldn't be embedded for testing yet. Try again shortly.", 502);
  }
}
