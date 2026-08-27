"use client";

import { useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";

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
        <BubbleIcon className="mx-auto animate-bubble-idle" />
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
      <path
        d="M12 14a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H30l-12 12V48h-6a6 6 0 0 1-6-6z"
        className={className}
        fill="var(--color-preserve-red)"
      />
    </svg>
  );
}

function reducer(state: number, action: "NEXT"): number {
  if (action === "NEXT") return Math.min(state + 1, BEATS.length - 1);
  return state;
}

export function AskLarderExplainer({
  venueSlug,
  venueName,
}: {
  venueSlug: string;
  venueName: string;
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
    router.push(`/${venueSlug}/modules`);
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
