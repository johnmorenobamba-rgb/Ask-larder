import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { SopIntakeHub } from "@/components/onboarding/SopIntakeHub";
import { WizardBackLink } from "@/components/onboarding/WizardBackLink";
import { PART_B_TOPICS } from "@/lib/onboarding/constants";
import { getPreviousStep, type VenueTypeFlags } from "@/lib/onboarding/steps";

export default async function ContentIntakePage({ params }: { params: Promise<{ venueSlug: string }> }) {
  const { venueSlug } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: session }, { data: checks }, { data: modules }] = await Promise.all([
    supabase.from("wizard_sessions").select("venue_type_flags").eq("venue_id", staff!.venue_id!).maybeSingle(),
    supabase
      .from("onboarding_content_checks")
      .select("id, topic_key, test_question, answer, could_answer")
      .eq("venue_id", staff!.venue_id!)
      .order("created_at", { ascending: false }),
    supabase
      .from("modules")
      .select(
        "id, title, topic_key, module_sections(content, is_restricted, section_order), check_questions(question, section_order, options, correct_option_index, expected_answer_context)",
      )
      .eq("venue_id", staff!.venue_id!),
  ]);

  const flags = (session?.venue_type_flags as VenueTypeFlags | null) ?? {};

  // Match by topic_key first — a module saved through this hub always
  // carries it (module-sections/route.ts sets it on every create and
  // update). Falls back to exact title match only for legacy rows saved
  // before topic_key existed and never revisited since; matching by title
  // alone was the original design and is fragile (confirmed live: 13 of
  // 14 modules on a real venue used stylistic title variants like "RSA and
  // responsible service" vs the canonical "RSA & responsible service" and
  // were invisible to this exact match, which would have caused a revisit
  // to silently create a duplicate module instead of updating the
  // existing one).
  const existingModulesByTopic: Record<
    string,
    {
      moduleId: string;
      sections: { content: string; isRestricted: boolean }[];
      checkQuestions: { question: string; sectionIndex: number; options: string[]; correctOptionIndex: number; correctiveText: string }[];
    }
  > = {};
  for (const topic of PART_B_TOPICS) {
    const match = (modules ?? []).find((m) => m.topic_key === topic.key) ?? (modules ?? []).find((m) => !m.topic_key && m.title === topic.label);
    if (!match) continue;
    const sortedSections = [...(match.module_sections ?? [])].sort((a, b) => a.section_order - b.section_order);
    existingModulesByTopic[topic.key] = {
      moduleId: match.id,
      sections: sortedSections.map((s) => ({ content: s.content ?? "", isRestricted: s.is_restricted ?? false })),
      checkQuestions: (match.check_questions ?? []).map((q) => ({
        question: q.question,
        sectionIndex: q.section_order ?? 0,
        // Options/correct_option_index didn't exist in this route's request
        // shape until the fix round (11 Sep 2026) -- a question saved before
        // that resumes here with an empty options array, same as any other
        // pre-fix row, so the specialist is prompted to fill them in rather
        // than the page silently pretending they're already set.
        options: (q.options as string[] | null) ?? [],
        correctOptionIndex: q.correct_option_index ?? 0,
        correctiveText: q.expected_answer_context ?? "",
      })),
    };
  }

  return (
    <>
      <WizardBackLink venueSlug={venueSlug} previousStep={getPreviousStep("content-intake", {})} />
      <SopIntakeHub
        venueSlug={venueSlug}
        venueId={staff!.venue_id!}
        flags={flags}
        checks={checks ?? []}
        existingModulesByTopic={existingModulesByTopic}
      />
    </>
  );
}
