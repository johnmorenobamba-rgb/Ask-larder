import { interpolate } from "remotion";
import { ChitMark } from "@/components/shared/ChitMark";

// Block N3 v2 -- beats 19-21's typed Ask Larder demo. One continuous
// component (no cut between question -> answer -> two-column reveal, per
// the motion spec) driven entirely by local frame math -- no wall-clock
// timers, so it renders deterministically like everything else in this
// composition.

const QUESTION = "Table 6 is coeliac. What do I check before the burger goes?";
const ANSWER =
  "Gluten free bun from the sealed container. Fresh gloves, clean board on the far bench. Fries go in the dedicated GF fryer, not the main one. Call it to the pass so it plates marked.";

const QUESTION_CPS = 32; // chars/sec, per spec
const ANSWER_CPS = 46;
const FPS = 30;

function typedLength(frame: number, cps: number) {
  return Math.max(0, Math.floor((frame / FPS) * cps));
}

function AnswerText({ text }: { text: string }) {
  const idx = text.indexOf("dedicated GF fryer");
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-saffron">{text.slice(idx, idx + "dedicated GF fryer".length)}</span>
      {text.slice(idx + "dedicated GF fryer".length)}
    </>
  );
}

/** frame is LOCAL to this component's own Sequence (starts at 0). */
export function ChatDemo({ frame, questionEndFrame, answerEndFrame, totalFrames }: {
  frame: number;
  questionEndFrame: number;
  answerEndFrame: number;
  totalFrames: number;
}) {
  const questionChars = typedLength(frame, QUESTION_CPS);
  const questionDone = questionChars >= QUESTION.length;
  const questionText = QUESTION.slice(0, questionChars);

  const answerFrame = Math.max(0, frame - questionEndFrame);
  const answerChars = typedLength(answerFrame, ANSWER_CPS);
  const answerStarted = frame > questionEndFrame;
  const answerText = ANSWER.slice(0, answerChars);
  const answerDone = answerChars >= ANSWER.length;

  const shiftFrame = Math.max(0, frame - answerEndFrame);
  const shiftProgress = interpolate(shiftFrame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const cardScale = interpolate(shiftProgress, [0, 1], [1, 0.68]);

  const showTypingDots = questionDone && !answerStarted;
  const caretOn = Math.floor(frame / 8) % 2 === 0;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[2rem] border border-clay-brown/30 bg-ink"
      style={{
        width: 620,
        height: 640,
        transform: `scale(${cardScale})`,
      }}
    >
      <div className="flex items-center gap-2 border-b border-parchment/10 px-5 py-4">
        <ChitMark size={26} fillColor="var(--color-parchment)" traceColor="var(--color-saffron)" driveFrameSeconds={frame / FPS} />
        <p className="font-mono text-xs uppercase tracking-wide text-parchment/60">Ask Larder</p>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-4 px-5 py-5">
        {questionChars > 0 && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-parchment px-4 py-3">
              <p className="font-sans text-base text-ink">
                {questionText}
                {!questionDone && caretOn && <span className="text-saffron">|</span>}
              </p>
            </div>
          </div>
        )}
        {showTypingDots && (
          <div className="flex gap-1 px-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-saffron"
                style={{ opacity: 0.4 + 0.6 * Math.abs(Math.sin(frame / 6 + i)) }}
              />
            ))}
          </div>
        )}
        {answerChars > 0 && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-clay-brown/40 border-l-4 border-l-saffron bg-parchment/95 px-4 py-3">
              <p className="font-sans text-base text-ink">
                <AnswerText text={answerText} />
                {!answerDone && caretOn && <span className="text-saffron">|</span>}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
