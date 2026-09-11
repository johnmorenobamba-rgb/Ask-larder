"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PART_B_TOPICS } from "@/lib/onboarding/constants";
import { getNextStep, stepHref, type VenueTypeFlags } from "@/lib/onboarding/steps";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { inputClass, cardClass, primaryButtonClass, secondaryButtonClass, errorClass, labelClass } from "./fieldStyles";

type CheckRow = { id: string; topic_key: string | null; test_question: string | null; answer: string | null; could_answer: boolean | null };
type DraftSection = { content: string; isRestricted: boolean };
// options/correctOptionIndex/correctiveText added in the fix round, 11 Sep
// 2026 -- this route previously only ever collected the question text
// itself, which the staff-facing CheckQuestion component can't do anything
// with (it renders one button per option; zero options means zero buttons
// means the Continue button that finishes a module can never appear). A
// real staff walkthrough of a wizard-authored venue confirmed this
// permanently blocked module completion for every check question ever
// saved through this hub. See module-sections/route.ts for the matching
// server-side validation.
type DraftQuestion = { question: string; sectionIndex: number; options: string[]; correctOptionIndex: number; correctiveText: string };
type ExistingModule = {
  moduleId: string;
  sections: DraftSection[];
  checkQuestions: DraftQuestion[];
};

/**
 * Q2 Page 12 — SOP/content intake hub. Q4 owns this shell/loop UI; Q5 owns
 * the parse-sop, module-sections, and test-question route implementations
 * this calls. Q5's module-sections route does not generate content itself
 * ("no automated module generator exists anywhere in this codebase" — see
 * that route's own doc comment) — it persists section text and check
 * questions the onboarding specialist drafts here, using the uploaded
 * source material as reference, and re-embeds immediately so the
 * self-consistency test-question step actually has something to retrieve.
 */
export function SopIntakeHub({
  venueSlug,
  venueId,
  flags,
  checks,
  existingModulesByTopic,
}: {
  venueSlug: string;
  venueId: string;
  flags: VenueTypeFlags;
  checks: CheckRow[];
  existingModulesByTopic: Record<string, ExistingModule>;
}) {
  const router = useRouter();
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [busyTopic, setBusyTopic] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawContentByTopic, setRawContentByTopic] = useState<Record<string, string>>({});
  const [titleByTopic, setTitleByTopic] = useState<Record<string, string>>({});
  const [sectionsByTopic, setSectionsByTopic] = useState<Record<string, DraftSection[]>>({});
  const [questionsByTopic, setQuestionsByTopic] = useState<Record<string, DraftQuestion[]>>({});
  const [moduleIdByTopic, setModuleIdByTopic] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(existingModulesByTopic).map(([k, v]) => [k, v.moduleId])),
  );
  const [testQuestion, setTestQuestion] = useState("");
  const [testResult, setTestResult] = useState<{ answer: string; couldAnswer: boolean } | null>(null);

  function sectionsFor(topicKey: string, defaultLabel: string): DraftSection[] {
    return sectionsByTopic[topicKey] ?? existingModulesByTopic[topicKey]?.sections ?? [];
  }
  function questionsFor(topicKey: string): DraftQuestion[] {
    return questionsByTopic[topicKey] ?? existingModulesByTopic[topicKey]?.checkQuestions ?? [];
  }
  function titleFor(topicKey: string, defaultLabel: string): string {
    return titleByTopic[topicKey] ?? defaultLabel;
  }

  async function openTopicPanel(key: string) {
    setOpenTopic(key === openTopic ? null : key);
    setTestResult(null);
    await fetch("/api/owner/onboarding/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStep: `sop_intake:${key}` }),
    });
  }

  async function uploadSource(topicKey: string, file: File) {
    setBusyTopic(topicKey);
    setError(null);
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
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't read that file.");
      }
      const body = await res.json();
      setRawContentByTopic((prev) => ({ ...prev, [topicKey]: body.rawContent ?? "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setBusyTopic(null);
    }
  }

  function addSection(topicKey: string, defaultLabel: string) {
    const current = sectionsFor(topicKey, defaultLabel);
    setSectionsByTopic((prev) => ({ ...prev, [topicKey]: [...current, { content: "", isRestricted: false }] }));
  }

  function updateSection(topicKey: string, defaultLabel: string, index: number, patch: Partial<DraftSection>) {
    const current = sectionsFor(topicKey, defaultLabel);
    setSectionsByTopic((prev) => ({ ...prev, [topicKey]: current.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));
  }

  function removeSection(topicKey: string, defaultLabel: string, index: number) {
    const current = sectionsFor(topicKey, defaultLabel);
    setSectionsByTopic((prev) => ({ ...prev, [topicKey]: current.filter((_, i) => i !== index) }));
    setQuestionsByTopic((prev) => ({
      ...prev,
      [topicKey]: questionsFor(topicKey).filter((q) => q.sectionIndex !== index),
    }));
  }

  function addQuestion(topicKey: string, sectionCount: number) {
    if (sectionCount === 0) return;
    const current = questionsFor(topicKey);
    // Two empty options is the floor (a true/false question), matching the
    // Module Content & Assessment Standard's "multiple choice, occasionally
    // true/false" -- never zero, which is what silently shipped before.
    setQuestionsByTopic((prev) => ({
      ...prev,
      [topicKey]: [...current, { question: "", sectionIndex: 0, options: ["", ""], correctOptionIndex: 0, correctiveText: "" }],
    }));
  }

  function updateQuestion(topicKey: string, index: number, patch: Partial<DraftQuestion>) {
    const current = questionsFor(topicKey);
    setQuestionsByTopic((prev) => ({ ...prev, [topicKey]: current.map((q, i) => (i === index ? { ...q, ...patch } : q)) }));
  }

  function removeQuestion(topicKey: string, index: number) {
    const current = questionsFor(topicKey);
    setQuestionsByTopic((prev) => ({ ...prev, [topicKey]: current.filter((_, i) => i !== index) }));
  }

  function addOption(topicKey: string, questionIndex: number) {
    const current = questionsFor(topicKey);
    const q = current[questionIndex];
    if (!q || q.options.length >= 6) return;
    updateQuestion(topicKey, questionIndex, { options: [...q.options, ""] });
  }

  function updateOption(topicKey: string, questionIndex: number, optionIndex: number, value: string) {
    const current = questionsFor(topicKey);
    const q = current[questionIndex];
    if (!q) return;
    updateQuestion(topicKey, questionIndex, { options: q.options.map((o, i) => (i === optionIndex ? value : o)) });
  }

  function removeOption(topicKey: string, questionIndex: number, optionIndex: number) {
    const current = questionsFor(topicKey);
    const q = current[questionIndex];
    if (!q || q.options.length <= 2) return;
    const nextOptions = q.options.filter((_, i) => i !== optionIndex);
    // Keep the "correct" marker pointing at the same option, shifting it
    // back one place if the removed option sat before it, and clamping to
    // 0 if the correct option itself was the one removed -- never leaving
    // it silently out of range.
    const nextCorrect =
      optionIndex === q.correctOptionIndex ? 0 : optionIndex < q.correctOptionIndex ? q.correctOptionIndex - 1 : q.correctOptionIndex;
    updateQuestion(topicKey, questionIndex, { options: nextOptions, correctOptionIndex: nextCorrect });
  }

  async function saveModule(topicKey: string, defaultLabel: string) {
    const sections = sectionsFor(topicKey, defaultLabel).filter((s) => s.content.trim());
    const questions = questionsFor(topicKey).filter((q) => q.question.trim());
    const title = titleFor(topicKey, defaultLabel);
    if (sections.length === 0) {
      setError("Add at least one section with content before saving.");
      return;
    }
    // Client-side mirror of module-sections/route.ts's own validation --
    // catches an incomplete question here, before the request, rather than
    // only after a 400 comes back.
    for (const q of questions) {
      const filledOptions = q.options.filter((o) => o.trim());
      if (filledOptions.length < 2) {
        setError(`"${q.question}" needs at least 2 answer options filled in.`);
        return;
      }
    }

    setBusyTopic(topicKey);
    setError(null);
    try {
      const res = await fetch("/api/owner/onboarding/module-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          moduleId: moduleIdByTopic[topicKey],
          topicKey,
          title,
          sections: sections.map((s) => ({ content: s.content, isRestricted: s.isRestricted })),
          checkQuestions: questions.map((q) => ({
            question: q.question,
            sectionIndex: q.sectionIndex,
            options: q.options.filter((o) => o.trim()),
            // If trimming blank options shifted indices, re-resolve which
            // option text was actually marked correct rather than trusting
            // a now-possibly-stale index.
            correctOptionIndex: Math.max(
              0,
              q.options.filter((o) => o.trim()).indexOf(q.options[q.correctOptionIndex] ?? ""),
            ),
            correctiveText: q.correctiveText.trim() || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't save this module.");
      }
      const body = await res.json();
      setModuleIdByTopic((prev) => ({ ...prev, [topicKey]: body.moduleId }));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this module.");
    } finally {
      setBusyTopic(null);
    }
  }

  async function runTestQuestion(topicKey: string) {
    const moduleId = moduleIdByTopic[topicKey];
    if (!moduleId || !testQuestion.trim()) return;
    setBusyTopic(topicKey);
    setError(null);
    try {
      const res = await fetch("/api/owner/onboarding/test-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, question: testQuestion }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't run that test question.");
      }
      const body = await res.json();
      setTestResult({ answer: body.answer, couldAnswer: body.couldAnswer });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't run that test question.");
    } finally {
      setBusyTopic(null);
    }
  }

  function continueWizard() {
    router.push(stepHref(venueSlug, getNextStep("content-intake", flags)));
  }

  return (
    <div className="space-y-6">
      {busyTopic && <LoadingOverlay />}
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">SOPs & training content</h2>
        <p className="font-sans text-sm text-ink/70">
          Upload source material per topic for reference, draft the module's sections from it, then test the
          result with a real question before moving on. Topics dimmed below look less relevant to this venue so
          far, but every one stays open to work on.
        </p>
      </div>

      <div className="space-y-3">
        {PART_B_TOPICS.map((topic) => {
          const applicable = topic.appliesWhen ? topic.appliesWhen(flags) : true;
          const topicChecks = checks.filter((c) => c.topic_key === topic.key || c.topic_key === titleFor(topic.key, topic.label));
          const isOpen = openTopic === topic.key;
          const sections = sectionsFor(topic.key, topic.label);
          const questions = questionsFor(topic.key);
          const moduleId = moduleIdByTopic[topic.key];

          return (
            <div key={topic.key} className={`rounded-2xl border-2 ${applicable ? "border-clay-brown/40" : "border-clay-brown/20"}`}>
              <button
                type="button"
                onClick={() => openTopicPanel(topic.key)}
                className={`flex w-full items-center justify-between px-4 py-3 font-sans text-left ${applicable ? "text-ink" : "text-clay-brown/70"}`}
              >
                <span>{topic.label}</span>
                <span className="font-mono text-xs text-clay-brown">
                  {moduleId ? "module saved" : "not started"}
                  {topicChecks.length > 0 ? ` · ${topicChecks.filter((c) => c.could_answer).length}/${topicChecks.length} checks pass` : ""}
                </span>
              </button>

              {isOpen && (
                <div className="space-y-4 border-t-2 border-clay-brown/20 px-4 py-4">
                  <label className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-sm text-ink hover:border-preserve-red">
                    <span>Upload source material for reference</span>
                    <span className="font-mono text-xs text-clay-brown">Browse</span>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadSource(topic.key, file);
                      }}
                      className="sr-only"
                    />
                  </label>
                  {rawContentByTopic[topic.key] && (
                    <div className="max-h-40 overflow-y-auto rounded-xl bg-clay-brown/10 px-3 py-2">
                      <p className="whitespace-pre-wrap font-mono text-xs text-ink/80">{rawContentByTopic[topic.key]}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className={labelClass}>Module title</label>
                    <input
                      value={titleFor(topic.key, topic.label)}
                      onChange={(e) => setTitleByTopic((prev) => ({ ...prev, [topic.key]: e.target.value }))}
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={labelClass}>Sections</label>
                    {sections.map((section, i) => (
                      <div key={i} className="space-y-1 rounded-xl bg-clay-brown/10 px-3 py-3">
                        <textarea
                          value={section.content}
                          onChange={(e) => updateSection(topic.key, topic.label, i, { content: e.target.value })}
                          rows={3}
                          placeholder="Section content"
                          className={inputClass}
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 font-sans text-xs text-ink">
                            <input
                              type="checkbox"
                              checked={section.isRestricted}
                              onChange={(e) => updateSection(topic.key, topic.label, i, { isRestricted: e.target.checked })}
                            />
                            This section is a secret that should be tier-gated (safe code, alarm code)
                          </label>
                          <button type="button" onClick={() => removeSection(topic.key, topic.label, i)} className="font-mono text-xs text-preserve-red underline">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => addSection(topic.key, topic.label)} className={secondaryButtonClass}>
                      Add section
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className={labelClass}>Check questions</label>
                    <p className="font-sans text-xs text-ink/60">
                      Multiple choice, per the Module Content &amp; Assessment Standard — pick which answer is correct
                      below. Staff can&apos;t continue past a question with no options filled in.
                    </p>
                    {questions.map((q, i) => (
                      <div key={i} className="space-y-2 rounded-xl bg-clay-brown/10 px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={q.question}
                            onChange={(e) => updateQuestion(topic.key, i, { question: e.target.value })}
                            placeholder="Check question"
                            className={inputClass}
                          />
                          <select
                            aria-label="Section this question checks"
                            value={q.sectionIndex}
                            onChange={(e) => updateQuestion(topic.key, i, { sectionIndex: Number(e.target.value) })}
                            className="rounded-xl border-2 border-clay-brown/40 px-2 py-1 font-mono text-xs text-ink"
                          >
                            {sections.map((_, si) => (
                              <option key={si} value={si} disabled={sections[si]?.isRestricted}>
                                Section {si + 1}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={() => removeQuestion(topic.key, i)} className="font-mono text-xs text-preserve-red underline">
                            Remove question
                          </button>
                        </div>

                        <div className="space-y-1 pl-2">
                          <p className="font-mono text-[10px] uppercase tracking-wide text-clay-brown">
                            Answer options — mark the correct one
                          </p>
                          {q.options.map((option, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${topic.key}-${i}`}
                                checked={q.correctOptionIndex === oi}
                                onChange={() => updateQuestion(topic.key, i, { correctOptionIndex: oi })}
                                aria-label={`Option ${oi + 1} is correct`}
                              />
                              <input
                                value={option}
                                onChange={(e) => updateOption(topic.key, i, oi, e.target.value)}
                                placeholder={`Option ${oi + 1}`}
                                className={inputClass}
                              />
                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(topic.key, i, oi)}
                                  className="font-mono text-xs text-preserve-red underline"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          {q.options.length < 6 && (
                            <button type="button" onClick={() => addOption(topic.key, i)} className="font-mono text-xs text-clay-brown underline">
                              Add another option
                            </button>
                          )}
                        </div>

                        <input
                          value={q.correctiveText}
                          onChange={(e) => updateQuestion(topic.key, i, { correctiveText: e.target.value })}
                          placeholder="If they pick a wrong answer, show this correction (optional)"
                          className={inputClass}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addQuestion(topic.key, sections.length)}
                      disabled={sections.length === 0}
                      className={secondaryButtonClass}
                    >
                      Add check question
                    </button>
                    <p className="font-sans text-xs text-ink/60">
                      A section marked restricted never gets a check question attached, since one would have to embed the secret itself.
                    </p>
                  </div>

                  <button type="button" onClick={() => saveModule(topic.key, topic.label)} className={primaryButtonClass}>
                    Save module content
                  </button>

                  {moduleId && (
                    <div className="space-y-2 rounded-xl bg-clay-brown/10 px-3 py-3">
                      <p className={labelClass}>Test a question against this module alone</p>
                      <input
                        value={testQuestion}
                        onChange={(e) => setTestQuestion(e.target.value)}
                        placeholder="e.g. Where do I check who's on shift?"
                        className={inputClass}
                      />
                      <button type="button" onClick={() => runTestQuestion(topic.key)} disabled={!testQuestion.trim()} className={secondaryButtonClass}>
                        Run test question
                      </button>
                      {testResult && (
                        <p className={`font-sans text-sm ${testResult.couldAnswer ? "text-bay-green" : "text-preserve-red"}`}>
                          {testResult.couldAnswer ? "Answerable from this module: " : "Gap found: "}
                          {testResult.answer}
                        </p>
                      )}
                    </div>
                  )}

                  {topicChecks.length > 0 && (
                    <div className="space-y-1">
                      <p className={labelClass}>Past checks</p>
                      {topicChecks.map((c) => (
                        <p key={c.id} className="flex items-center justify-between gap-3 font-sans text-sm text-ink">
                          <span>{c.test_question}</span>
                          <span className={`font-mono text-[10px] uppercase tracking-wide ${c.could_answer ? "text-bay-green" : "text-preserve-red"}`}>
                            {c.could_answer ? "Answered" : "Gap"}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className={errorClass}>{error}</p>}
      <button type="button" onClick={continueWizard} className={primaryButtonClass}>
        Continue
      </button>
    </div>
  );
}
