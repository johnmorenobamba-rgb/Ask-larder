"use client";

import { useEffect, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { AskLarderTriggerIcon, type AskLarderIconState } from "@/components/staff/AskLarderTriggerIcon";
import { LARDER_MARK_PATH } from "@/components/shared/LarderMark";

type Beat = {
  durationMs: number | null; // null = waits for the final button, no auto-advance
  ink: boolean;
  render: (venueName: string) => React.ReactNode;
};

const BEATS: Beat[] = [
  {
    durationMs: 6000,
    ink: true,
    render: () => (
      <div className="text-center space-y-4">
        <BubbleIcon className="mx-auto animate-bubble-idle" />
        <h2 className="font-display text-4xl font-bold text-parchment">One more thing.</h2>
      </div>
    ),
  },
  {
    durationMs: 8000,
    ink: false,
    render: () => (
      <div className="text-center space-y-4">
        <BubbleIcon className="mx-auto" />
        <h2 className="font-display text-3xl font-bold text-ink">
          Ask Larder answers questions from your training.
        </h2>
      </div>
    ),
  },
  {
    durationMs: 10000,
    ink: false,
    render: () => (
      <div className="text-center space-y-4">
        <TapHoldDemo />
        <h2 className="font-display text-3xl font-bold text-ink">Type, or hold to talk.</h2>
      </div>
    ),
  },
  {
    durationMs: 8000,
    ink: false,
    render: () => (
      <div className="text-center space-y-4 max-w-sm mx-auto">
        <p className="font-sans text-ink italic">
          &ldquo;It&apos;s my first time closing alone, what do I do?&rdquo;
        </p>
        <div className="rounded-2xl bg-parchment border-2 border-bay-green px-4 py-4">
          <p className="font-sans text-ink text-sm">
            Answer drawn from your venue&apos;s approved closing procedure — walk through it
            step by step, right from your training.
          </p>
        </div>
      </div>
    ),
  },
  {
    durationMs: 8000,
    ink: false,
    render: () => (
      <div className="text-center space-y-4 max-w-sm mx-auto">
        <p className="font-sans text-ink italic">&ldquo;Where are the keys to the safe?&rdquo;</p>
        <div className="rounded-2xl bg-parchment border-2 border-preserve-red px-4 py-4">
          <p className="font-sans text-ink text-sm">
            Ask your supervisor for assistance, as they have access to the safe.
          </p>
        </div>
      </div>
    ),
  },
  {
    durationMs: null,
    ink: false,
    render: (venueName: string) => (
      <div className="text-center space-y-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          Larder only knows what&apos;s approved for {venueName}.
        </h2>
      </div>
    ),
  },
];

function BubbleIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" role="img" aria-label="Ask Larder">
      <path d={LARDER_MARK_PATH} className={className} fill="var(--color-preserve-red)" />
    </svg>
  );
}

// Beat 3 demo: cycles through the real Ask Larder icon states (Ask Larder
// spec's table) so the explainer shows the actual bubble a new hire will
// see later, not a one-off animation that only looks similar.
const TAP_HOLD_SEQUENCE: { state: AskLarderIconState; ms: number }[] = [
  { state: "idle", ms: 1200 },
  { state: "listening", ms: 2000 },
  { state: "thinking", ms: 700 },
  { state: "answer-ready", ms: 1500 },
];

function TapHoldDemo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIndex((i) => (i + 1) % TAP_HOLD_SEQUENCE.length);
    }, TAP_HOLD_SEQUENCE[index].ms);
    return () => window.clearTimeout(timer);
  }, [index]);

  return (
    <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center">
      <AskLarderTriggerIcon state={TAP_HOLD_SEQUENCE[index].state} size={72} />
    </div>
  );
}

function reducer(state: number, action: "NEXT"): number {
  if (action === "NEXT") return Math.min(state + 1, BEATS.length - 1);
  return state;
}

export function AskLarderExplainer({
  venueSlug,
  venueName,
  redirectTo,
}: {
  venueSlug: string;
  venueName: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [beatIndex, dispatch] = useReducer(reducer, 0);
  const beat = BEATS[beatIndex];
  const isLastBeat = beatIndex === BEATS.length - 1;

  useEffect(() => {
    if (beat.durationMs === null) return;
    const timer = setTimeout(() => dispatch("NEXT"), beat.durationMs);
    return () => clearTimeout(timer);
  }, [beat]);

  async function finish() {
    await fetch("/api/staff/mark-intro-seen", { method: "POST" });
    router.push(redirectTo ?? `/${venueSlug}/home`);
  }

  return (
    <main
      className={`min-h-screen flex items-center justify-center px-6 transition-colors duration-300 ${
        beat.ink ? "bg-ink" : "bg-parchment"
      }`}
    >
      <div className="w-full max-w-lg space-y-10">
        {beat.render(venueName)}

        <div className="flex items-center justify-center gap-2">
          {BEATS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full font-mono ${
                i === beatIndex
                  ? beat.ink
                    ? "bg-parchment"
                    : "bg-preserve-red"
                  : beat.ink
                    ? "bg-parchment/30"
                    : "bg-clay-brown/30"
              }`}
            />
          ))}
        </div>

        {isLastBeat && (
          <button
            type="button"
            onClick={finish}
            className="block mx-auto rounded-full bg-preserve-red px-8 py-3 font-sans font-medium text-parchment"
          >
            Got it
          </button>
        )}
      </div>
    </main>
  );
}
