import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { ingestModule } from "@/lib/ai/ingestModule";

// Block Q5 -- wizard Page 12, the SOP/content-authoring gap-detection loop's
// authoring step (docs/block-q/q2-wizard-flow-and-schema.md §3 Page 12
// step 2). No automated module generator exists anywhere in this codebase
// (confirmed by Q2's research) -- content drafting stays a guided, reviewed
// step: the onboarding specialist (owner/manager) supplies the actual
// section text and check questions (drafted with Q4's UI, possibly assisted
// by a separate Content Author Agent outside this route's scope), and this
// route's job is only to persist them correctly and re-embed immediately.

interface SectionInput {
  content: string;
  isRestricted: boolean;
}

interface CheckQuestionInput {
  question: string;
  sectionIndex: number;
}

interface RequestBody {
  venueId?: string;
  moduleId?: string;
  topicKey?: string;
  title?: string;
  sections?: SectionInput[];
  checkQuestions?: CheckQuestionInput[];
}

function isSectionInput(value: unknown): value is SectionInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.content === "string" && typeof v.isRestricted === "boolean";
}

function isCheckQuestionInput(value: unknown): value is CheckQuestionInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.question === "string" && typeof v.sectionIndex === "number";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const venueId = typeof body?.venueId === "string" ? body.venueId : "";
  const moduleId = typeof body?.moduleId === "string" ? body.moduleId : undefined;
  const topicKey = typeof body?.topicKey === "string" ? body.topicKey : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const sections = Array.isArray(body?.sections) ? body!.sections : null;
  const checkQuestions = Array.isArray(body?.checkQuestions) ? body!.checkQuestions : [];

  if (!venueId || !topicKey || !title || !sections || sections.length === 0) {
    return NextResponse.json(
      { error: "venueId, topicKey, title, and at least one section are required." },
      { status: 400 },
    );
  }
  if (!sections.every(isSectionInput)) {
    return NextResponse.json({ error: "Each section needs content (string) and isRestricted (boolean)." }, { status: 400 });
  }
  if (!checkQuestions.every(isCheckQuestionInput)) {
    return NextResponse.json(
      { error: "Each check question needs question (string) and sectionIndex (number)." },
      { status: 400 },
    );
  }

  const staff = await getCurrentStaff();
  if (!staff || !staff.venue_id || !["owner", "manager"].includes(staff.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (staff.venue_id !== venueId) {
    return NextResponse.json({ error: "venueId does not match the signed-in venue." }, { status: 403 });
  }

  // Q1 row 54's residual gap, closed server-side here (per this task's
  // instructions, not trusting the client alone): a restricted section must
  // never get an attached check_questions row, because a multiple-choice
  // question about a secret would have to embed the code (or a plausible
  // near-match), and check_questions has no is_restricted column of its own
  // to fall back on.
  for (const q of checkQuestions) {
    if (q.sectionIndex < 0 || q.sectionIndex >= sections.length) {
      return NextResponse.json({ error: `checkQuestion.sectionIndex ${q.sectionIndex} is out of range.` }, { status: 400 });
    }
    if (sections[q.sectionIndex].isRestricted) {
      return NextResponse.json(
        { error: "A check question cannot be attached to a restricted (is_restricted=true) section." },
        { status: 400 },
      );
    }
  }

  const supabase = await createClient();

  let resolvedModuleId = moduleId;
  if (resolvedModuleId) {
    const { data: existing, error: existingError } = await supabase
      .from("modules")
      .select("id")
      .eq("id", resolvedModuleId)
      .eq("venue_id", venueId)
      .maybeSingle();
    if (existingError) {
      console.error("module-sections lookup error:", existingError.message);
      return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Module not found for this venue." }, { status: 404 });
    }

    // Also backfills topic_key on every update, not just create -- a module
    // saved before this fix landed has no topic_key yet, and this is the
    // one place that reliably knows which topic it belongs to (the request
    // always carries topicKey, since SopIntakeHub always sends it).
    const { error: titleError } = await supabase.from("modules").update({ title, topic_key: topicKey }).eq("id", resolvedModuleId);
    if (titleError) {
      console.error("module-sections title update error:", titleError.message);
      return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
    }

    // Full replace of this topic's sections/questions, matching
    // ingestModule's own delete-then-reinsert convention for
    // knowledge_chunks -- the request always carries the complete desired
    // set for this module, not a delta.
    const [{ error: deleteSectionsError }, { error: deleteQuestionsError }] = await Promise.all([
      supabase.from("module_sections").delete().eq("module_id", resolvedModuleId),
      supabase.from("check_questions").delete().eq("module_id", resolvedModuleId),
    ]);
    if (deleteSectionsError || deleteQuestionsError) {
      console.error(
        "module-sections delete error:",
        deleteSectionsError?.message,
        deleteQuestionsError?.message,
      );
      return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
    }
  } else {
    // status intentionally omitted -- defaults to 'draft' at the DB layer.
    // Never set here, and never advanced automatically: the owner-approval
    // gate (draft -> pending_approval -> approved -> live) only moves via
    // Page 14's explicit approve/go-live flow, which this route never calls.
    const { data: created, error: createError } = await supabase
      .from("modules")
      .insert({ venue_id: venueId, title, topic_key: topicKey })
      .select("id")
      .single();
    if (createError || !created) {
      console.error("module-sections create error:", createError?.message);
      return NextResponse.json({ error: "Couldn't create the module." }, { status: 500 });
    }
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
  if (sectionsInsertError) {
    console.error("module-sections sections insert error:", sectionsInsertError.message);
    return NextResponse.json({ error: "Couldn't save module sections." }, { status: 500 });
  }

  if (checkQuestions.length > 0) {
    const { error: questionsInsertError } = await supabase.from("check_questions").insert(
      checkQuestions.map((q) => ({
        module_id: resolvedModuleId,
        question: q.question,
        section_order: q.sectionIndex,
      })),
    );
    if (questionsInsertError) {
      console.error("module-sections questions insert error:", questionsInsertError.message);
      return NextResponse.json({ error: "Couldn't save check questions." }, { status: 500 });
    }
  }

  // Embed immediately, even pre-approval -- this is what makes the
  // gap-detection loop's test-question step actually work, since retrieval
  // needs the embeddings to exist. ingestModule is callable at any module
  // status (see its own doc comment).
  let chunkCount = 0;
  try {
    const result = await ingestModule(resolvedModuleId!, supabase);
    chunkCount = result.chunkCount;
  } catch (ingestError) {
    console.error(
      "module-sections ingestion error:",
      ingestError instanceof Error ? ingestError.message : ingestError,
    );
    return NextResponse.json(
      { error: "Content was saved, but couldn't be embedded for testing yet. Try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ moduleId: resolvedModuleId, chunkCount });
}
