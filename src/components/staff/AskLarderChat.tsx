"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AskLarderTriggerIcon, type AskLarderIconState } from "@/components/staff/AskLarderTriggerIcon";
import type { ChitMarkHandle } from "@/components/shared/ChitMark";
import { useMagneticPull } from "@/lib/hooks/useMagneticPull";
import { track } from "@/lib/analytics/track";
import { onAskLarderOpenRequest, broadcastAskLarderOverlayState } from "@/lib/askLarderBus";

type IconState = AskLarderIconState;
type OverlayView = "text" | "voice-coming-soon";

const TAP_HOLD_THRESHOLD_MS = 250;
const RECORDING_MAX_MS = 20_000;
const RECORDING_WARNING_MS = 5_000;
const IDLE_PULSE_MIN_MS = 8 * 60 * 1000;
const IDLE_PULSE_MAX_MS = 12 * 60 * 1000;
const SHEET_CLOSE_MS = 220;
const SHORT_ANSWER_CHARS = 60;

/**
 * Ask Larder trigger + answer overlay — Ask Larder Full Design Spec. Fixed
 * bottom-left (see the module doc comment below for the placement
 * rationale), five icon states, tap opens text input directly, hold
 * (>=250ms) starts voice capture. Mounted both floating in the protected
 * layout (no stationId) and on a station page (with stationId).
 *
 * Voice transcription needs a server-side speech-to-text provider that
 * doesn't exist in this project yet (no API key configured) — recording
 * itself is real (MediaRecorder, waveform, 20s auto-stop), but on release
 * this surfaces a plain "coming soon" message and opens the text-input
 * overlay rather than pretending to transcribe. Confirmed scope decision,
 * not an oversight.
 *
 * Each question is a fresh, self-contained exchange per spec — no
 * persistent thread history in the overlay. Reopening always starts clean.
 */
export function AskLarderChat({ stationId }: { venueSlug: string; stationId?: string }) {
  const [iconState, setIconState] = useState<IconState>("idle");
  const [idlePulseKey, setIdlePulseKey] = useState(0);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [overlayView, setOverlayView] = useState<OverlayView>("text");

  // Lets other floating chrome (the near-miss report button) hide itself
  // while this overlay is open -- see askLarderBus.ts.
  useEffect(() => {
    broadcastAskLarderOverlayState(overlayOpen);
  }, [overlayOpen]);

  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [isEscalation, setIsEscalation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);

  const pressStartRef = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chitMarkRef = useRef<ChitMarkHandle>(null);
  const magneticRef = useMagneticPull<HTMLButtonElement>();
  const micLevelWrapperRef = useRef<HTMLSpanElement>(null);
  const audioAnalysisRef = useRef<{ audioCtx: AudioContext; raf: number } | null>(null);

  // Idle jittered pulse (every 8-12 min, jittered), only while genuinely
  // idle: no overlay open, and reset on any real interaction anywhere on
  // the page (not just this component) — a person reading a module isn't
  // "idle" just because they haven't touched the bubble.
  useEffect(() => {
    if (overlayOpen) return;
    let timer: number;
    function schedule() {
      const delay = IDLE_PULSE_MIN_MS + Math.random() * (IDLE_PULSE_MAX_MS - IDLE_PULSE_MIN_MS);
      timer = window.setTimeout(() => {
        setIdlePulseKey((k) => k + 1);
        schedule();
      }, delay);
    }
    function reset() {
      window.clearTimeout(timer);
      schedule();
    }
    schedule();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [overlayOpen]);

  function resetExchange() {
    setAskedQuestion(null);
    setAnswer(null);
    setError(null);
    setIsEscalation(false);
    setQuestion("");
  }

  const openTextOverlay = useCallback(() => {
    track("ask_larder_open_tap");
    chitMarkRef.current?.playActivationBeat();
    resetExchange();
    setOverlayView("text");
    setClosing(false);
    setOverlayOpen(true);
  }, []);

  function closeOverlay() {
    setClosing(true);
    window.setTimeout(() => {
      setOverlayOpen(false);
      setClosing(false);
    }, SHEET_CLOSE_MS);
  }

  // Lets the bento dashboard's Ask Larder tile open this exact overlay
  // (in text-input mode) instead of mounting a second one — see
  // src/lib/askLarderBus.ts.
  useEffect(() => onAskLarderOpenRequest(openTextOverlay), [openTextOverlay]);

  // Guards against the AudioContext (Block L9's mic-level analysis)
  // outliving an unmount mid-recording -- everything else here is torn
  // down by stopListening() on the normal path, but a route change while
  // actively listening wouldn't otherwise call it.
  useEffect(() => {
    return () => {
      if (audioAnalysisRef.current) {
        cancelAnimationFrame(audioAnalysisRef.current.raf);
        audioAnalysisRef.current.audioCtx.close();
      }
    };
  }, []);

  async function startListening() {
    setIconState("listening");
    setRecordingElapsedMs(0);
    track("ask_larder_hold_start");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.start();
      const startedAt = Date.now();
      recordingIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setRecordingElapsedMs(elapsed);
        if (elapsed >= RECORDING_MAX_MS) stopListening();
      }, 100);

      // Block L9 -- a real Web Audio AnalyserNode reading the live mic
      // stream, driving the ripple's --mic-level CSS var directly (no
      // React state -- this ticks far too fast for that) so the "listening"
      // indicator reflects actual voice loudness instead of a fixed
      // decorative rhythm. Torn down in stopListening(); a getUserMedia
      // failure below skips this block entirely, same as before.
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      function tick() {
        analyser.getByteFrequencyData(freqData);
        const avg = freqData.reduce((sum, v) => sum + v, 0) / freqData.length;
        const level = 1 + Math.min(1, avg / 60) * 0.6; // 1 (quiet) .. 1.6 (loud)
        micLevelWrapperRef.current?.style.setProperty("--mic-level", String(level));
        audioAnalysisRef.current!.raf = requestAnimationFrame(tick);
      }
      audioAnalysisRef.current = { audioCtx, raf: requestAnimationFrame(tick) };
    } catch {
      // Mic denied/unavailable — fall straight to text input, no drama.
      setIconState("idle");
      openTextOverlay();
    }
  }

  function stopListening() {
    if (recordingIntervalRef.current) {
      window.clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.stream.getTracks().forEach((t) => t.stop());
      if (recorder.state !== "inactive") recorder.stop();
      mediaRecorderRef.current = null;
    }
    if (audioAnalysisRef.current) {
      cancelAnimationFrame(audioAnalysisRef.current.raf);
      audioAnalysisRef.current.audioCtx.close();
      audioAnalysisRef.current = null;
    }
    track("ask_larder_hold_end");
    setIconState("thinking");
    window.setTimeout(() => {
      setIconState("idle");
      resetExchange();
      setOverlayView("voice-coming-soon");
      setClosing(false);
      setOverlayOpen(true);
    }, 400);
  }

  function handlePointerDown() {
    pressStartRef.current = Date.now();
    holdTimerRef.current = window.setTimeout(startListening, TAP_HOLD_THRESHOLD_MS);
  }

  function handlePointerUp() {
    const heldMs = pressStartRef.current ? Date.now() - pressStartRef.current : 0;
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (iconState === "listening") {
      stopListening();
    } else if (heldMs < TAP_HOLD_THRESHOLD_MS) {
      openTextOverlay();
    }
    pressStartRef.current = null;
  }

  async function submit(retryText?: string) {
    const trimmed = (retryText ?? question).trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setIconState("thinking");
    setAskedQuestion(trimmed);
    setAnswer(null);
    track("ask_larder_question_submitted");

    try {
      const res = await fetch("/api/staff/ask-larder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, stationId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't reach Larder. Check your connection and try again.");

      setAnswer(body.answer);
      setIsEscalation(!!body.isEscalation);
      setIconState(body.isEscalation ? "fallback-given" : "answer-ready");
      track(body.isEscalation ? "ask_larder_fallback_shown" : "ask_larder_answer_shown");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach Larder. Check your connection and try again.");
      setIconState("idle");
      track("ask_larder_error_shown");
    } finally {
      setLoading(false);
    }
  }

  const remainingRecordMs = Math.max(0, RECORDING_MAX_MS - recordingElapsedMs);
  const inCountdown = iconState === "listening" && remainingRecordMs <= RECORDING_WARNING_MS;
  const countdownFraction = inCountdown ? remainingRecordMs / RECORDING_WARNING_MS : 1;

  return (
    <>
      <button
        ref={magneticRef}
        type="button"
        aria-label="Ask Larder"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => iconState === "listening" && stopListening()}
        className="fixed bottom-6 left-6 z-40 flex h-16 w-16 items-center justify-center rounded-full shadow-lg"
      >
        <AskLarderTriggerIcon
          key={idlePulseKey}
          chitMarkRef={chitMarkRef}
          micLevelRef={micLevelWrapperRef}
          state={iconState}
          countdownFraction={inCountdown ? countdownFraction : null}
        />
      </button>

      {overlayOpen && (
        <>
          {/* Scrim and sheet are separate layers, deliberately -- CSS
              `opacity` on a parent cascades to every descendant as one
              compositing unit, so a single div carrying both the dark
              scrim tint AND the parchment sheet made the sheet itself
              45% translucent too (bleeding whatever was behind it, and
              anything else at a lower z-index, straight through). The
              scrim uses `bg-ink/45` (an alpha background color, not an
              opacity) so only IT is translucent; the sheet stays a fully
              solid, fully legible parchment surface. */}
          <div
            className={`fixed inset-0 z-50 bg-ink/45 transition-opacity duration-220 ${
              closing ? "opacity-0" : "opacity-100"
            }`}
            onClick={closeOverlay}
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
            <div
              onClick={(e) => e.stopPropagation()}
              className={`pointer-events-auto w-full max-w-md rounded-t-3xl bg-parchment p-6 pb-8 ${
                closing ? "animate-ask-larder-sheet-down" : "animate-ask-larder-sheet-up"
              }`}
            >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">Ask Larder</h2>
              <button type="button" onClick={closeOverlay} className="font-mono text-xs text-clay-brown">
                Close
              </button>
            </div>

            {overlayView === "voice-coming-soon" && !askedQuestion && (
              <p className="mb-4 font-sans text-sm text-clay-brown">
                Voice questions are coming soon. Type your question instead.
              </p>
            )}

            {askedQuestion && (
              <div className="mb-4 space-y-3">
                <p className="font-sans text-sm italic text-clay-brown">{askedQuestion}</p>

                {loading && <p className="font-sans text-sm text-clay-brown">Thinking…</p>}

                {error && (
                  <div className="rounded-2xl border-2 border-preserve-red border-l-4 px-4 py-3">
                    <p className="font-sans text-sm text-ink">{error}</p>
                    <button
                      type="button"
                      onClick={() => submit(askedQuestion)}
                      className="mt-2 font-mono text-xs text-preserve-red underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {answer && !error && (
                  <div
                    data-testid="ask-larder-answer"
                    data-escalation={isEscalation ? "true" : "false"}
                    className={`rounded-2xl border-2 px-4 py-4 ${isEscalation ? "border-clay-brown" : "border-bay-green"}`}
                  >
                    <p
                      className={
                        answer.length <= SHORT_ANSWER_CHARS
                          ? "font-display text-lg text-ink"
                          : "font-sans text-ink"
                      }
                    >
                      {answer}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!answer && !error && (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Type your question"
                  autoFocus
                  disabled={loading}
                  className="flex-1 rounded-2xl border-2 border-clay-brown/40 px-4 py-3 font-sans text-ink outline-none focus:border-preserve-red"
                />
                <button
                  type="button"
                  onClick={() => submit()}
                  disabled={loading || !question.trim()}
                  className="rounded-full bg-preserve-red px-6 py-3 font-sans font-medium text-parchment disabled:opacity-50"
                >
                  Ask
                </button>
              </div>
            )}
          </div>
          </div>
        </>
      )}
    </>
  );
}
