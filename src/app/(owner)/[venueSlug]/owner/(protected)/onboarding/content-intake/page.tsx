import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { SopInterview, type TopicEntry } from "@/components/onboarding/SopInterview";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { PART_B_TOPICS } from "@/lib/onboarding/constants";
import { getQuestionsForTopic } from "@/lib/onboarding/sopQuestions";
import { determineSopTopics } from "@/lib/ai/sopTopicDetermination";
import { getPreviousStep } from "@/lib/onboarding/steps";

// Block T4 -- replaces SopIntakeHub's free-authoring hub with the guided
// intake flow. Ensures sop_topic_decisions exist for this venue (running
// T1's determination pass once, synchronously, the first time this page is
// visited with none yet -- a few seconds of load time on a founder-run,
// once-per-venue setup step is the right tradeoff against a separate
// client-side polling state machine), then builds the flattened
// topic+question queue SopInterview renders.
export default async function ContentIntakePage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const venueId = staff!.venue_id!;
  const supabase = await createClient();

  let { data: decisions } = await supabase
    .from("sop_topic_decisions")
    .select("topic_key, applicable, confidence, source, rationale")
    .eq("venue_id", venueId);

  if (!decisions || decisions.length === 0) {
    const fresh = await determineSopTopics(venueId, supabase);
    decisions = fresh.map((d) => ({
      topic_key: d.topicKey,
      applicable: d.applicable,
      confidence: d.confidence,
      source: d.source,
      rationale: d.rationale,
    }));
  }
  const decisionsByTopic = new Map(decisions.map((d) => [d.topic_key, d]));

  const [{ data: answerRows }, { data: modules }] = await Promise.all([
    supabase
      .from("sop_intake_answers")
      .select("topic_key, question_key, answer_text, attachment_extracted_text, answer_source")
      .eq("venue_id", venueId),
    supabase.from("modules").select("id, topic_key").eq("venue_id", venueId),
  ]);

  const topics: TopicEntry[] = PART_B_TOPICS.map((topic) => {
    const decision = decisionsByTopic.get(topic.key);
    // A topic determination somehow never wrote (shouldn't happen once the
    // pass above has run) defaults to applicable/high so it's never
    // silently hidden.
    const resolvedDecision = decision
      ? {
          applicable: decision.applicable,
          confidence: decision.confidence as "high" | "low",
          source: decision.source as "rule" | "ai" | "specialist_confirmed",
          rationale: decision.rationale ?? "",
        }
      : { applicable: true, confidence: "high" as const, source: "rule" as const, rationale: "Applies to every venue regardless of type." };

    const answers: Record<string, { answerText: string; attachmentExtractedText: string | null; answerSource: "specialist" | "document" }> = {};
    for (const row of answerRows ?? []) {
      if (row.topic_key !== topic.key) continue;
      answers[row.question_key] = {
        answerText: row.answer_text ?? "",
        attachmentExtractedText: row.attachment_extracted_text,
        answerSource: (row.answer_source as "specialist" | "document" | null) ?? "specialist",
      };
    }

    const existingModule = (modules ?? []).find((m) => m.topic_key === topic.key);

    return {
      topicKey: topic.key,
      label: topic.label,
      decision: resolvedDecision,
      questions: getQuestionsForTopic(topic.key),
      answers,
      moduleId: existingModule?.id ?? null,
    };
  }).filter((t) => t.decision.applicable || t.decision.confidence === "low");

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("content-intake", {})} />
      <SopInterview venueSlug={venueSlug} venueId={venueId} topics={topics} />
    </>
  );
}
