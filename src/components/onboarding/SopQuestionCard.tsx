"use client";

import { useState } from "react";
import type { SopQuestionDef } from "@/lib/onboarding/sopQuestions";
import { inputClass, primaryButtonClass, secondaryButtonClass, labelClass, errorClass } from "./fieldStyles";

// Block T4 -- the entire specialist-facing authoring surface for one
// question: read the prompt, type the answer or attach a photo/document,
// move on. Every topic (7 to 9 questions, depending on its layers) renders
// through this exact same component -- no per-topic bespoke UI.
export function SopQuestionCard({
  question,
  initialAnswer,
  initialAttachmentText,
  busy,
  onUpload,
  onSubmit,
  onBack,
  canGoBack,
}: {
  question: SopQuestionDef;
  initialAnswer: string;
  initialAttachmentText: string | null;
  busy: boolean;
  onUpload: (file: File) => Promise<{ storagePath: string; rawContent: string } | null>;
  onSubmit: (answerText: string, attachment: { storagePath: string; rawContent: string } | null) => void;
  onBack: (() => void) | null;
  canGoBack: boolean;
}) {
  const [answerText, setAnswerText] = useState(initialAnswer);
  const [attachment, setAttachment] = useState<{ storagePath: string; rawContent: string } | null>(
    initialAttachmentText ? { storagePath: "", rawContent: initialAttachmentText } : null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    const result = await onUpload(file);
    if (result) {
      setAttachment(result);
    } else {
      setUploadError("Couldn't read that file.");
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-clay-brown/40 px-5 py-6 md:px-8 md:py-8">
      <div className="space-y-1">
        <p className={labelClass}>
          {question.type === "universal" ? "Standard question" : question.type === "behavioral_read" ? "Tell us about a real time this happened" : question.type === "safety_honesty" ? "Be honest with us" : "Troubleshooting"}
        </p>
        <p className="font-display text-xl font-bold text-ink">{question.prompt}</p>
        {question.helperText && <p className="font-sans text-sm text-ink/70">{question.helperText}</p>}
      </div>

      <textarea
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        rows={5}
        placeholder="Type the answer here, in your own words"
        className={inputClass}
        autoFocus
      />

      {question.allowsAttachment && (
        <div className="space-y-2">
          <label className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-sm text-ink hover:border-preserve-red">
            <span>{attachment ? "Replace attached photo/document" : "Attach a photo or document instead (or as well)"}</span>
            <span className="font-mono text-xs text-clay-brown">Browse</span>
            <input
              type="file"
              accept="image/*,.pdf,.txt,.md"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="sr-only"
            />
          </label>
          {attachment && (
            <div className="max-h-32 overflow-y-auto rounded-xl bg-clay-brown/10 px-3 py-2">
              <p className="whitespace-pre-wrap font-mono text-xs text-ink/80">{attachment.rawContent}</p>
            </div>
          )}
          {uploadError && <p className={errorClass}>{uploadError}</p>}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {canGoBack ? (
          <button type="button" onClick={() => onBack?.()} disabled={busy} className={secondaryButtonClass}>
            Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => onSubmit(answerText, attachment)}
          disabled={busy || (!answerText.trim() && !attachment)}
          className={primaryButtonClass}
        >
          Next
        </button>
      </div>
    </div>
  );
}
