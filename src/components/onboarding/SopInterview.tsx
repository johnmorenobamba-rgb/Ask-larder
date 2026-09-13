"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SopQuestionDef } from "@/lib/onboarding/sopQuestions";
import { getNextStep, stepHref } from "@/lib/onboarding/steps";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { SopQuestionCard } from "./SopQuestionCard";
import { primaryButtonClass, secondaryButtonClass, errorClass, cardClass, labelClass, pageTitleClass, pageIntroClass } from "./fieldStyles";

export interface TopicDecisionInfo {
  applicable: boolean;
  confidence: "high" | "low";
  source: "rule" | "ai" | "specialist_confirmed";
  rationale: string;
}

export interface TopicEntry {
  topicKey: string;
  label: string;
  decision: TopicDecisionInfo;
  questions: SopQuestionDef[];
  answers: Record<string, { answerText: string; attachmentExtractedText: string | null; answerSource: "specialist" | "document" | "document_inferred" }>;
  moduleId: string | null;
}

interface ExtractedContact {
  name: string;
  phone: string | null;
  role: string | null;
}

type Step =
  | { kind: "confirm"; topicKey: string; label: string; decision: TopicDecisionInfo }
  | { kind: "upload_choice"; topicKey: string; label: string }
  | { kind: "upload_document"; topicKey: string; label: string }
  | { kind: "question"; topicKey: string; label: string; question: SopQuestionDef; questionIndexInTopic: number; questionsInTopic: number }
  | { kind: "generate"; topicKey: string; label: string }
  | { kind: "confirm_contact"; topicKey: string; label: string; contact: ExtractedContact };

interface TopicState {
  applicable: boolean;
  confirmedByTopic: boolean;
  // Block U2 -- 'pending' shows the upload_choice step; 'yes' with no
  // sourceDocument yet shows the upload_document step; 'yes' with a
  // sourceDocument, or 'no', both proceed straight to question steps
  // (filtered by coveredKeys when a document was uploaded).
  uploadChoice: "pending" | "yes" | "no";
  sourceDocument: { storagePath: string; rawContent: string } | null;
  coveredKeys: Set<string>;
  answers: Record<string, { text: string; attachmentText: string | null; source: "specialist" | "document" | "document_inferred" }>;
  moduleId: string | null;
  generated: boolean;
  pendingContact: ExtractedContact | null;
  contactResolved: boolean;
}

// Block T4 -- the entire guided-intake flow. One flattened queue: every
// applicable topic's questions, in PART_B_TOPICS order, with a low-
// confidence sop_topic_decisions row surfaced as a one-tap confirm card at
// the point its topic begins, and a "generate this module" step once a
// topic's questions are all answered. No topic accordion, no free "Section
// content" textarea -- read a question, answer or attach a file, move on.
export function SopInterview({ venueSlug, venueId, topics }: { venueSlug: string; venueId: string; topics: TopicEntry[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [topicState, setTopicState] = useState<Record<string, TopicState>>(() =>
    Object.fromEntries(
      topics.map((t) => {
        const answers = Object.fromEntries(
          Object.entries(t.answers).map(([k, v]) => [k, { text: v.answerText, attachmentText: v.attachmentExtractedText, source: v.answerSource }]),
        );
        // Resuming a topic that already has document-sourced answers from a
        // prior visit -- treat the upload choice as already made, and its
        // covered keys as already known, rather than asking again.
        const documentKeys = Object.entries(answers)
          .filter(([, v]) => v.source === "document" || v.source === "document_inferred")
          .map(([k]) => k);
        return [
          t.topicKey,
          {
            applicable: t.decision.applicable,
            confirmedByTopic: t.decision.confidence === "high",
            uploadChoice: documentKeys.length > 0 ? "yes" : Object.keys(answers).length > 0 ? "no" : "pending",
            sourceDocument: null,
            coveredKeys: new Set(documentKeys),
            answers,
            moduleId: t.moduleId,
            generated: Boolean(t.moduleId),
            pendingContact: null,
            contactResolved: true,
          } satisfies TopicState,
        ];
      }),
    ),
  );

  const steps = useMemo<Step[]>(() => {
    const flat: Step[] = [];
    for (const topic of topics) {
      const state = topicState[topic.topicKey];
      if (!state) continue;
      if (!state.confirmedByTopic) {
        flat.push({ kind: "confirm", topicKey: topic.topicKey, label: topic.label, decision: topic.decision });
        continue;
      }
      if (!state.applicable) continue;

      if (state.uploadChoice === "pending") {
        flat.push({ kind: "upload_choice", topicKey: topic.topicKey, label: topic.label });
        continue;
      }
      if (state.uploadChoice === "yes" && !state.sourceDocument && state.coveredKeys.size === 0) {
        flat.push({ kind: "upload_document", topicKey: topic.topicKey, label: topic.label });
        continue;
      }

      // Only genuine gaps get asked once a document has already covered
      // some questions -- never the full scaffold redundantly.
      const questionsToAsk = topic.questions.filter((q) => !state.coveredKeys.has(q.key));
      questionsToAsk.forEach((question, i) => {
        flat.push({
          kind: "question",
          topicKey: topic.topicKey,
          label: topic.label,
          question,
          questionIndexInTopic: i,
          questionsInTopic: questionsToAsk.length,
        });
      });

      if (!state.generated) {
        flat.push({ kind: "generate", topicKey: topic.topicKey, label: topic.label });
      } else if (state.pendingContact && !state.contactResolved) {
        flat.push({ kind: "confirm_contact", topicKey: topic.topicKey, label: topic.label, contact: state.pendingContact });
      }
    }
    return flat;
  }, [topics, topicState]);

  const firstUnresolvedIndex = useMemo(() => {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.kind !== "question") return i;
      const state = topicState[step.topicKey];
      if (!state?.answers[step.question.key]?.text && !state?.answers[step.question.key]?.attachmentText) return i;
    }
    return steps.length;
  }, [steps, topicState]);

  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const currentIndex = stepIndex ?? firstUnresolvedIndex;
  const currentStep = steps[currentIndex];

  function patchTopic(topicKey: string, patch: Partial<TopicState>) {
    setTopicState((prev) => ({ ...prev, [topicKey]: { ...prev[topicKey], ...patch } }));
  }

  async function uploadAttachment(file: File): Promise<{ storagePath: string; rawContent: string } | null> {
    try {
      const supabase = createClient();
      const path = `${venueId}/sop/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("onboarding-uploads").upload(path, file);
      if (uploadError) throw new Error(uploadError.message);

      const res = await fetch("/api/owner/onboarding/parse-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: path, venueId }),
      });
      if (!res.ok) return null;
      const body = await res.json();
      return { storagePath: path, rawContent: body.rawContent ?? "" };
    } catch {
      return null;
    }
  }

  async function submitAnswer(
    step: Extract<Step, { kind: "question" }>,
    answerText: string,
    attachment: { storagePath: string; rawContent: string } | null,
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/onboarding/sop-intake/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicKey: step.topicKey,
          questionKey: step.question.key,
          questionType: step.question.type,
          answerText,
          attachmentStoragePath: attachment?.storagePath ?? null,
          attachmentExtractedText: attachment?.rawContent ?? null,
        }),
      });
      if (!res.ok) throw new Error("Couldn't save that answer.");

      patchTopic(step.topicKey, {
        answers: {
          ...topicState[step.topicKey].answers,
          [step.question.key]: { text: answerText, attachmentText: attachment?.rawContent ?? null, source: "specialist" },
        },
      });
      setStepIndex(currentIndex + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that answer.");
    } finally {
      setBusy(false);
    }
  }

  function chooseNoDocument(step: Extract<Step, { kind: "upload_choice" }>) {
    patchTopic(step.topicKey, { uploadChoice: "no" });
    setStepIndex(currentIndex);
  }

  function chooseHasDocument(step: Extract<Step, { kind: "upload_choice" }>) {
    patchTopic(step.topicKey, { uploadChoice: "yes" });
    setStepIndex(currentIndex);
  }

  async function uploadTopicDocument(step: Extract<Step, { kind: "upload_document" }>, file: File) {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const path = `${venueId}/sop/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("onboarding-uploads").upload(path, file);
      if (uploadError) throw new Error(uploadError.message);

      const parseRes = await fetch("/api/owner/onboarding/parse-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath: path, venueId }),
      });
      const parseBody = await parseRes.json().catch(() => null);
      if (!parseRes.ok) throw new Error(parseBody?.error ?? "Couldn't read that file.");
      const rawContent: string = parseBody.rawContent ?? "";

      const analyzeRes = await fetch("/api/owner/onboarding/sop-intake/analyze-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicKey: step.topicKey, storagePath: path, rawContent }),
      });
      const analyzeBody = await analyzeRes.json().catch(() => null);
      if (!analyzeRes.ok) throw new Error(analyzeBody?.error ?? "Couldn't analyze that document.");

      const covered: { questionKey: string; answerText: string; source?: "document" | "document_inferred" }[] = analyzeBody.covered ?? [];
      const mergedAnswers = { ...topicState[step.topicKey].answers };
      for (const c of covered) {
        mergedAnswers[c.questionKey] = { text: c.answerText, attachmentText: null, source: c.source ?? "document" };
      }

      patchTopic(step.topicKey, {
        sourceDocument: { storagePath: path, rawContent },
        coveredKeys: new Set(covered.map((c) => c.questionKey)),
        answers: mergedAnswers,
      });
      setStepIndex(currentIndex);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't process that document.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmTopic(step: Extract<Step, { kind: "confirm" }>, applicable: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/onboarding/sop-intake/confirm-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicKey: step.topicKey, applicable }),
      });
      if (!res.ok) throw new Error("Couldn't save that.");
      patchTopic(step.topicKey, { confirmedByTopic: true, applicable });
      setStepIndex(currentIndex);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  async function generateModule(step: Extract<Step, { kind: "generate" }>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/onboarding/sop-intake/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicKey: step.topicKey }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Couldn't generate this module.");
      patchTopic(step.topicKey, {
        generated: true,
        moduleId: body.moduleId,
        pendingContact: body.extractedContact ?? null,
        contactResolved: !body.extractedContact,
      });
      router.refresh();
      setStepIndex(currentIndex);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate this module.");
    } finally {
      setBusy(false);
    }
  }

  async function resolveContact(step: Extract<Step, { kind: "confirm_contact" }>, save: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (save) {
        const res = await fetch("/api/owner/onboarding/sop-intake/confirm-contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicKey: step.topicKey }),
        });
        if (!res.ok) throw new Error("Couldn't save this contact.");
      }
      patchTopic(step.topicKey, { contactResolved: true });
      setStepIndex(currentIndex);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this contact.");
    } finally {
      setBusy(false);
    }
  }

  function continueWizard() {
    router.push(stepHref(venueSlug, getNextStep("content-intake", {})));
  }

  if (!currentStep) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className={pageTitleClass}>SOPs & training content</h2>
          <p className={pageIntroClass}>Every topic this venue needs has been generated. You can continue.</p>
        </div>
        <button type="button" onClick={continueWizard} className={primaryButtonClass}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {busy && <LoadingOverlay />}
      <div>
        <h2 className={pageTitleClass}>SOPs & training content</h2>
        <p className={pageIntroClass}>
          Answer real questions about how this venue actually runs -- we generate the training module and the SOP
          document from your answers afterward.
        </p>
        <p className="font-mono text-xs uppercase tracking-wide text-clay-brown">
          {currentStep.label} · step {currentIndex + 1} of {steps.length}
        </p>
      </div>

      {currentStep.kind === "confirm" && (
        <div className={cardClass}>
          <p className={labelClass}>Quick check</p>
          <p className="font-sans text-ink">
            {currentStep.decision.applicable
              ? `We think "${currentStep.label}" applies to this venue.`
              : `We're not sure "${currentStep.label}" applies to this venue.`}
          </p>
          <p className="font-sans text-sm text-ink/70">{currentStep.decision.rationale}</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => confirmTopic(currentStep, true)} disabled={busy} className={primaryButtonClass}>
              Yes, this applies
            </button>
            <button type="button" onClick={() => confirmTopic(currentStep, false)} disabled={busy} className={secondaryButtonClass}>
              No, skip this topic
            </button>
          </div>
        </div>
      )}

      {currentStep.kind === "upload_choice" && (
        <div className={cardClass}>
          <p className={labelClass}>{currentStep.label}</p>
          <p className="font-sans text-ink">
            Do you already have something written for this, a document, a printed sheet, even a photo of a
            handwritten list?
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => chooseHasDocument(currentStep)} disabled={busy} className={primaryButtonClass}>
              Yes, I have something
            </button>
            <button type="button" onClick={() => chooseNoDocument(currentStep)} disabled={busy} className={secondaryButtonClass}>
              No, start from scratch
            </button>
          </div>
        </div>
      )}

      {currentStep.kind === "upload_document" && (
        <div className={cardClass}>
          <p className={labelClass}>Upload what you have</p>
          <p className="font-sans text-ink">
            A document, a printed sheet, or a photo. We&apos;ll read it and only ask about what it doesn&apos;t
            already cover.
          </p>
          <label className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-sm text-ink hover:border-preserve-red">
            <span>Upload document or photo</span>
            <span className="font-mono text-xs text-clay-brown">Browse</span>
            <input
              type="file"
              accept="image/*,.pdf,.txt,.md"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadTopicDocument(currentStep, file);
              }}
            />
          </label>
        </div>
      )}

      {currentStep.kind === "question" && (
        <div className="space-y-3">
          {topicState[currentStep.topicKey]?.sourceDocument && (
            <details className="rounded-2xl border-2 border-clay-brown/20 bg-clay-brown/5 px-4 py-3">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-wide text-clay-brown">
                What you uploaded for this topic
              </summary>
              <p className="mt-2 whitespace-pre-wrap font-mono text-xs text-ink/70">
                {topicState[currentStep.topicKey]!.sourceDocument!.rawContent}
              </p>
            </details>
          )}
          <SopQuestionCard
            key={`${currentStep.topicKey}:${currentStep.question.key}`}
            question={currentStep.question}
            initialAnswer={topicState[currentStep.topicKey]?.answers[currentStep.question.key]?.text ?? ""}
            initialAttachmentText={topicState[currentStep.topicKey]?.answers[currentStep.question.key]?.attachmentText ?? null}
            busy={busy}
            onUpload={uploadAttachment}
            onSubmit={(text, attachment) => submitAnswer(currentStep, text, attachment)}
            onBack={currentIndex > 0 ? () => setStepIndex(currentIndex - 1) : null}
            canGoBack={currentIndex > 0}
          />
        </div>
      )}

      {currentStep.kind === "generate" && (
        <div className={cardClass}>
          <p className={labelClass}>All questions answered</p>
          <p className="font-sans text-ink">
            Ready to generate the &ldquo;{currentStep.label}&rdquo; training module and SOP document from these answers.
          </p>
          <button type="button" onClick={() => generateModule(currentStep)} disabled={busy} className={primaryButtonClass}>
            Generate this module
          </button>
        </div>
      )}

      {currentStep.kind === "confirm_contact" && (
        <div className={cardClass}>
          <p className={labelClass}>Save this contact?</p>
          <p className="font-sans text-ink">
            You mentioned <strong>{currentStep.contact.name}</strong>
            {currentStep.contact.role ? ` (${currentStep.contact.role})` : ""}
            {currentStep.contact.phone ? `, on ${currentStep.contact.phone}` : ""}. Save them as a venue contact so
            this number doesn&apos;t just live in the SOP text?
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => resolveContact(currentStep, true)} disabled={busy} className={primaryButtonClass}>
              Save contact
            </button>
            <button type="button" onClick={() => resolveContact(currentStep, false)} disabled={busy} className={secondaryButtonClass}>
              Not now
            </button>
          </div>
        </div>
      )}

      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}
