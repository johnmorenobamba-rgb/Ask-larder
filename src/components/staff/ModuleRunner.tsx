"use client";

import { useMemo, useState } from "react";
import { useBusyNavigation } from "@/lib/hooks/useBusyNavigation";
import { BusyLabel } from "@/components/shared/BusyLabel";
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
  stationPhoto,
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
  /** Block S4 -- a real uploaded photo for the station this module is
   * taught at, shown inline on the module's first section. Undefined/null
   * when no station has uploaded one yet; nothing renders in that case. */
  stationPhoto?: { url: string; stationName: string } | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  // Last Continue posts the completion: locked and labelled while it runs,
  // so a double tap can't record it twice and the tap visibly registers.
  const completing = useBusyNavigation();
  // Completion screen's back button: busy until the next screen renders.
  const back = useBusyNavigation();
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
    if (!completing.begin()) return;
    // Same as before: the Stamp screen follows whether or not the request
    // succeeded (it never checked res.ok); a network throw no longer
    // leaves the button stuck.
    await fetch("/api/staff/complete-module", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId }),
    }).catch(() => null);
    completing.end();
    setDone(true);
  }

  const isLastStep = step + 1 >= steps.length;

  function advance() {
    if (completing.busy) return;
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
            onClick={() => {
              // router.push() alone is a no-op when resolvedBackHref is the
              // exact current pathname (the station entry point: it renders
              // ModuleRunner directly at /venueSlug/station/slug, not at a
              // separate module URL, so "back to station" pushes to the same
              // URL the browser is already on -- Next's router treats that
              // as nothing to navigate and never re-runs the server
              // component to drop back out of this completion screen).
              // router.refresh() forces that re-fetch regardless of whether
              // the pathname actually changed; push() still does the real
              // navigation for the modules-list case where the two differ.
              if (!back.begin()) return;
              back.navigate(() => {
                router.push(resolvedBackHref);
                router.refresh();
              });
            }}
            disabled={back.busy}
            aria-busy={back.busy}
            className="rounded-full bg-preserve-red px-8 py-3 font-sans font-medium text-parchment disabled:opacity-60"
          >
            <BusyLabel busy={back.busy} idle={backLabel} busyText={backLabel} />
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
              {step === 0 && stationPhoto && (
                <figure className="overflow-hidden rounded-2xl border-2 border-clay-brown/20">
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not worth next/image's optimization pipeline */}
                  <img src={stationPhoto.url} alt={stationPhoto.stationName} className="aspect-video w-full object-cover" />
                  <figcaption className="bg-clay-brown/10 px-3 py-2 font-mono text-xs uppercase tracking-wide text-clay-brown">
                    {stationPhoto.stationName}, your venue
                  </figcaption>
                </figure>
              )}
              <ModuleContentBlock content={current.section.content ?? ""} />
              <button
                type="button"
                onClick={advance}
                disabled={completing.busy}
                aria-busy={completing.busy}
                className="rounded-full bg-preserve-red px-8 py-3 font-sans font-medium text-parchment disabled:opacity-60"
              >
                <BusyLabel busy={completing.busy && isLastStep} idle="Continue" busyText="Completing module" />
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
              busy={completing.busy && isLastStep}
            />
          ) : null}
        </PassSlide>
      </div>
    </main>
  );
}
