"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckQuestion } from "./CheckQuestion";
import { Stamp } from "./Stamp";
import { PassSlide } from "./PassSlide";

type Section = { id: string; section_order: number; content: string | null };
type Question = {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number | null;
  correctiveText: string | null;
};

/**
 * Reads through a module's sections, then its check-questions, one at a
 * time. The spec describes a question after each section, but
 * check_questions has no section_id link in the schema — modules #1's real
 * content (Block B) also doesn't map 1:1 (e.g. 3 sections / 5 questions),
 * so sections-then-all-questions is the honest reading of what the data
 * actually supports, not an invented per-section mapping.
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
  const [step, setStep] = useState(0); // 0..sections.length-1: sections, then questions, then done
  const [done, setDone] = useState(false);
  const resolvedBackHref = backHref ?? `/${venueSlug}/modules`;

  const inSections = step < sections.length;
  const questionIndex = step - sections.length;

  async function finish() {
    await fetch("/api/staff/complete-module", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId }),
    });
    setDone(true);
  }

  function advance() {
    const totalSteps = sections.length + questions.length;
    if (step + 1 >= totalSteps) {
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
            style={{ width: `${((step + 1) / (sections.length + questions.length)) * 100}%` }}
          />
        </div>

        <PassSlide light key={step}>
          {inSections ? (
            <div className="space-y-6">
              <p className="whitespace-pre-wrap font-sans text-ink">
                {sections[step].content}
              </p>
              <button
                type="button"
                onClick={advance}
                className="rounded-full bg-preserve-red px-8 py-3 font-sans font-medium text-parchment"
              >
                Continue
              </button>
            </div>
          ) : (
            <CheckQuestion
              key={questions[questionIndex].id}
              question={questions[questionIndex].question}
              options={questions[questionIndex].options}
              correctOptionIndex={questions[questionIndex].correct_option_index ?? 0}
              correctiveText={questions[questionIndex].correctiveText}
              onAnswered={() => {
                window.setTimeout(advance, 900);
              }}
            />
          )}
        </PassSlide>
      </div>
    </main>
  );
}
