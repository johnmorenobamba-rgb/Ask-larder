"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckQuestion } from "./CheckQuestion";
import { ModuleContentBlock } from "./ModuleContentBlock";
import { Stamp } from "./Stamp";
import { PassSlide } from "./PassSlide";

type Section = { id: string; section_order: number; content: string | null };
type Question = {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number | null;
  correctiveText: string | null;
  section_order: number | null;
};

type Step = { type: "section"; section: Section } | { type: "question"; question: Question };

/**
 * Reads through a module's sections, with each section's own check-question
 * (or questions) shown immediately after it -- per the Module Content &
 * Assessment Standard's "inline after each section" rule. Questions carry
 * a `section_order` that says which section they follow; a question with
 * no section_order (older content authored before this existed) falls back
 * to the end of the module, so nothing breaks for content that hasn't been
 * migrated to the per-section mapping yet.
 */
export function ModuleRunner({
  venueSlug,
  moduleId,
  moduleTitle,
  moduleIndex,
  totalModules,
  sections,
  questions,
  backHref,
  backLabel = "Back to modules",
}: {
  venueSlug: string;
  moduleId: string;
  moduleTitle: string;
  moduleIndex?: number;
  totalModules?: number;
  sections: Section[];
  questions: Question[];
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const resolvedBackHref = backHref ?? `/${venueSlug}/modules`;

  const steps = useMemo<Step[]>(() => {
    const sorted = [...sections].sort((a, b) => a.section_order - b.section_order);
    const unattached = questions.filter((q) => q.section_order == null);
    const out: Step[] = [];
    for (const section of sorted) {
      out.push({ type: "section", section });
      for (const q of questions.filter((q) => q.section_order === section.section_order)) {
        out.push({ type: "question", question: q });
      }
    }
    for (const q of unattached) {
      out.push({ type: "question", question: q });
    }
    return out;
  }, [sections, questions]);

  async function finish() {
    await fetch("/api/staff/complete-module", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId }),
    });
    setDone(true);
  }

  function advance() {
    if (step + 1 >= steps.length) {
      finish();
    } else {
      setStep(step + 1);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-parchment flex items-center justify-center px-6">
        <div className="text-center space-y-6">
          <Stamp label={`${moduleTitle} completed`} />
          <button
            type="button"
            onClick={() => router.push(resolvedBackHref)}
            className="rounded-full bg-preserve-red px-8 py-3 font-sans font-medium text-parchment"
          >
            {backLabel}
          </button>
        </div>
      </main>
    );
  }

  const current = steps[step];

  return (
    <main className="min-h-screen bg-parchment px-6 pb-10 pt-24">
      <div className="mx-auto w-full max-w-lg space-y-6">
        {moduleIndex !== undefined && totalModules !== undefined && (
          <p className="text-right font-mono text-xs text-clay-brown">
            Module {moduleIndex} of {totalModules}
          </p>
        )}
        <div className="h-1.5 w-full rounded-full bg-clay-brown/20">
          <div
            className="h-1.5 rounded-full bg-bay-green transition-[width] duration-250 ease-out"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <PassSlide light key={step}>
          {current?.type === "section" ? (
            <div className="space-y-6">
              <ModuleContentBlock content={current.section.content ?? ""} />
              <button
                type="button"
                onClick={advance}
                className="rounded-full bg-preserve-red px-8 py-3 font-sans font-medium text-parchment"
              >
                Continue
              </button>
            </div>
          ) : current?.type === "question" ? (
            <CheckQuestion
              key={current.question.id}
              question={current.question.question}
              options={current.question.options}
              correctOptionIndex={current.question.correct_option_index ?? 0}
              correctiveText={current.question.correctiveText}
              onContinue={advance}
            />
          ) : null}
        </PassSlide>
      </div>
    </main>
  );
}
