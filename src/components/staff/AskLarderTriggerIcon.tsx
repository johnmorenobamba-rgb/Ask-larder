import { LARDER_MARK_PATH } from "@/components/shared/LarderMark";
import { ChitMark, type ChitMarkHandle } from "@/components/shared/ChitMark";

export type AskLarderIconState = "idle" | "listening" | "thinking" | "answer-ready" | "fallback-given";

const FILL_MAP: Record<AskLarderIconState, string> = {
  idle: "none",
  listening: "var(--color-preserve-red)",
  thinking: "var(--color-saffron)",
  "answer-ready": "none",
  "fallback-given": "none",
};

const STROKE_MAP: Record<AskLarderIconState, string> = {
  idle: "var(--color-ink)",
  listening: "var(--color-preserve-red)",
  thinking: "var(--color-saffron)",
  "answer-ready": "var(--color-ink)",
  "fallback-given": "var(--color-ink)",
};

/**
 * The Ask Larder trigger's 5-state icon, extracted from AskLarderChat so
 * the Ask Larder Explainer (Beat 3) can play the exact same visual states
 * for its tap-and-hold demo rather than a one-off animation that only
 * looks similar.
 */
export function AskLarderTriggerIcon({
  state,
  countdownFraction = null,
  size = 64,
  chitMarkRef,
  micLevelRef,
}: {
  state: AskLarderIconState;
  countdownFraction?: number | null;
  size?: number;
  /** Block L6 -- lets the caller trigger the tap-activation MorphSVG beat right before opening the overlay. */
  chitMarkRef?: React.Ref<ChitMarkHandle>;
  /** Block L9 -- lets the caller drive the listening ripple's reach from real mic amplitude (--mic-level), not just its fixed rhythm. */
  micLevelRef?: React.Ref<HTMLSpanElement>;
}) {
  return (
    <span
      className="relative flex items-center justify-center rounded-full bg-parchment"
      style={{ height: size, width: size }}
    >
      {state === "listening" && (
        <span ref={micLevelRef} className="contents">
          <span
            className="animate-ask-larder-ripple absolute rounded-full border-2 border-preserve-red"
            style={{ height: size, width: size }}
          />
          <span
            className="animate-ask-larder-ripple absolute rounded-full border-2 border-preserve-red"
            style={{ height: size, width: size, animationDelay: "300ms" }}
          />
        </span>
      )}
      {countdownFraction !== null && (
        <svg className="absolute -rotate-90" style={{ height: size, width: size }} viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="30"
            fill="none"
            stroke="var(--color-preserve-red)"
            strokeWidth="2"
            strokeDasharray={2 * Math.PI * 30}
            strokeDashoffset={2 * Math.PI * 30 * (1 - countdownFraction)}
          />
        </svg>
      )}
      {state === "idle" ? (
        // Block J3 — the shared traveling-glow chit mark is the idle state
        // everywhere it appears; the other four states keep their own
        // spec'd treatment below, untouched.
        <ChitMark ref={chitMarkRef} size={size * 0.5} fillColor="var(--color-ink)" traceColor="var(--color-saffron)" />
      ) : (
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 72 72"
          role="img"
          aria-hidden="true"
          className={state === "thinking" ? "animate-ask-larder-thinking" : ""}
        >
          <path
            d={LARDER_MARK_PATH}
            fill={FILL_MAP[state]}
            stroke={STROKE_MAP[state]}
            strokeWidth={FILL_MAP[state] === "none" ? 3 : 0}
          />
        </svg>
      )}
      {(state === "answer-ready" || state === "fallback-given") && (
        <span
          className={`absolute top-1 right-1 h-3 w-3 rounded-full ${
            state === "answer-ready" ? "bg-bay-green" : "bg-clay-brown"
          }`}
        />
      )}
    </span>
  );
}
