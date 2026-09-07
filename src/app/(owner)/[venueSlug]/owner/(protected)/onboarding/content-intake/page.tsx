import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { SopIntakeHub } from "@/components/onboarding/SopIntakeHub";
import { PART_B_TOPICS } from "@/lib/onboarding/constants";
import type { VenueTypeFlags } from "@/lib/onboarding/steps";

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
      .select("id, title, module_sections(content, is_restricted, section_order), check_questions(question, section_order)")
      .eq("venue_id", staff!.venue_id!),
  ]);

  const flags = (session?.venue_type_flags as VenueTypeFlags | null) ?? {};

  // modules has no topic_key column (Q5's test-question route comment
  // explains why: no FK-able label exists) — the module's title, which
  // SopIntakeHub defaults to the topic's own label, is the best available
  // match so a re-visit resumes editing rather than always starting fresh.
  const existingModulesByTopic: Record<string, { moduleId: string; sections: { content: string; isRestricted: boolean }[]; checkQuestions: { question: string; sectionIndex: number }[] }> = {};
  for (const topic of PART_B_TOPICS) {
    const match = (modules ?? []).find((m) => m.title === topic.label);
    if (!match) continue;
    const sortedSections = [...(match.module_sections ?? [])].sort((a, b) => a.section_order - b.section_order);
    existingModulesByTopic[topic.key] = {
      moduleId: match.id,
      sections: sortedSections.map((s) => ({ content: s.content ?? "", isRestricted: s.is_restricted ?? false })),
      checkQuestions: (match.check_questions ?? []).map((q) => ({ question: q.question, sectionIndex: q.section_order ?? 0 })),
    };
  }

  return (
    <SopIntakeHub
      venueSlug={venueSlug}
      venueId={staff!.venue_id!}
      flags={flags}
      checks={checks ?? []}
      existingModulesByTopic={existingModulesByTopic}
    />
  );
}
