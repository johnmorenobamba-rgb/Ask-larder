import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { PART_B_TOPICS } from "@/lib/onboarding/constants";
import { getQuestionsForTopic } from "@/lib/onboarding/sopQuestions";
import { persistModuleContent } from "@/lib/onboarding/persistModuleContent";
import { curateModuleContent, type IntakeAnswerForCuration } from "@/lib/ai/curateModuleContent";
import { curateSopDocumentFromIntake, type ExtractedContact } from "@/lib/ai/curateSopDocumentFromIntake";

export interface CurateTopicResult {
  moduleId: string;
  chunkCount: number;
  extractedContact: ExtractedContact | null;
}

// Block T5 orchestrator -- the single function both the `curate` API route
// and headless test scripts call. Loads this topic's answered questions,
// runs the two curation AI calls, persists the module (via the same shared
// persistModuleContent() the old specialist-typed authoring route uses),
// and writes sop_documents directly from the structured answers
// (generated_via='intake_curation') instead of leaving it for go-live's
// generateSopDocument() to extract from the resulting prose.
export async function curateTopic(
  supabase: SupabaseClient<Database>,
  venueId: string,
  topicKey: string,
  existingModuleId?: string,
): Promise<CurateTopicResult> {
  const topic = PART_B_TOPICS.find((t) => t.key === topicKey);
  if (!topic) throw new Error(`Unknown topic key: ${topicKey}`);

  const [{ data: venue }, { data: answerRows, error: answersError }] = await Promise.all([
    supabase.from("venues").select("name").eq("id", venueId).maybeSingle(),
    supabase
      .from("sop_intake_answers")
      .select("question_key, question_type, answer_text, attachment_extracted_text")
      .eq("venue_id", venueId)
      .eq("topic_key", topicKey),
  ]);
  if (answersError) throw new Error(answersError.message);
  if (!answerRows || answerRows.length === 0) {
    throw new Error(`No intake answers found for ${topicKey} -- nothing to curate.`);
  }

  const questionDefs = getQuestionsForTopic(topicKey);
  const answersByKey = new Map(answerRows.map((r) => [r.question_key, r]));
  const answers: IntakeAnswerForCuration[] = questionDefs
    .filter((q) => answersByKey.has(q.key))
    .map((q) => {
      const row = answersByKey.get(q.key)!;
      return {
        questionKey: q.key,
        prompt: q.prompt,
        questionType: row.question_type,
        answerText: row.answer_text,
        attachmentExtractedText: row.attachment_extracted_text,
      };
    });

  const venueName = venue?.name ?? "This venue";
  // The AI extraction pass can still occasionally mistake a named internal
  // staff member (a Duty Manager, a chef) for an external contact despite
  // the prompt telling it not to. Gating on whether this topic even asked a
  // contact-capturing question (troubleshoot_then_escalate, or Block V2's
  // access_control) is a second, deterministic guard -- a topic with none
  // of those in its scaffold (§ sopQuestions.ts) structurally has no real
  // "extracted external contact" to offer, so any candidate is dropped here
  // regardless of what the model returned.
  const contactCapturingKeys = questionDefs.filter((q) => q.capturesStructuredContact).map((q) => q.key);
  const hasContactCapturingLayer = answers.some((a) => contactCapturingKeys.includes(a.questionKey));

  const [moduleContent, sopDocument] = await Promise.all([
    curateModuleContent(topic.label, venueName, answers),
    curateSopDocumentFromIntake(topic.label, venueName, answers),
  ]);
  if (!hasContactCapturingLayer) {
    sopDocument.extractedContact = null;
  }

  const { moduleId, chunkCount } = await persistModuleContent(supabase, {
    venueId,
    moduleId: existingModuleId,
    topicKey,
    title: topic.label,
    sections: moduleContent.sections,
    checkQuestions: moduleContent.checkQuestions,
  });

  const generatedFromHash = crypto
    .createHash("sha256")
    .update(answers.map((a) => `${a.questionKey}:${a.answerText ?? ""}`).join("\n"))
    .digest("hex");

  const { error: sopDocError } = await supabase.from("sop_documents").upsert(
    {
      module_id: moduleId,
      content: sopDocument.content as unknown as Database["public"]["Tables"]["sop_documents"]["Insert"]["content"],
      generated_from_hash: generatedFromHash,
      generated_at: new Date().toISOString(),
      generated_via: "intake_curation",
    },
    { onConflict: "module_id" },
  );
  if (sopDocError) throw new Error(sopDocError.message);

  // Candidate only -- never written to venue_contacts until the specialist
  // explicitly confirms it (a separate action). Stored on whichever
  // contact-capturing answer row this topic actually has, so the UI can
  // surface a "Save this contact?" prompt without re-running curation.
  const answeredContactKey = answers.find((a) => contactCapturingKeys.includes(a.questionKey))?.questionKey;
  if (sopDocument.extractedContact && answeredContactKey) {
    await supabase
      .from("sop_intake_answers")
      .update({
        extracted_contact: sopDocument.extractedContact as unknown as Database["public"]["Tables"]["sop_intake_answers"]["Update"]["extracted_contact"],
      })
      .eq("venue_id", venueId)
      .eq("topic_key", topicKey)
      .eq("question_key", answeredContactKey);
  }

  return { moduleId, chunkCount, extractedContact: sopDocument.extractedContact };
}
