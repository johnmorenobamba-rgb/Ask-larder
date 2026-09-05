import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ChitMark } from "@/components/shared/ChitMark";
import { BentoGrid } from "@/components/staff/BentoGrid";
import { ChatDemo } from "./ChatDemo";
import { MegaType, GrowFill, Marquee, ScrollList } from "./primitives";
import twoFiresHome from "../data/two-fires-home.json";

// Block N3 v4 -- 2026-09-05: John asked to cut the NSW $220/$1,100
// comparison (beat 12), animate the dashboard tiles individually rather
// than as one rigid falling unit, and shorten the whole thing by ~7s.
// Removing beat 12 outright saved ~2.5s; the remaining ~4.5s came from
// re-running onset detection across the FULL track (previously only
// analyzed to ~39s -- scratch/n3-research/analyze-full.mjs) and re-
// snapping every boundary after beat 11 to the nearest real onset in that
// extended list, same discipline as v3's retiming, not round numbers.
// Beats 1-11 are byte-for-byte unchanged from v3 (they sit before the cut
// point). Locked content ($12,546 / 15.5% and the ChatDemo Q&A) is
// unchanged.
const FPS = 30;
const B = [0, 60, 107, 167, 220, 287, 353, 413, 467, 540, 593, 653, 727, 753, 800, 880, 933, 1047, 1113, 1173, 1247, 1400, 1480, 1527, 1580, 1680];
const dur = (i: number) => B[i + 1] - B[i];

const PARCHMENT = "var(--color-parchment)";
const SAFFRON = "var(--color-saffron)";
const RED = "var(--color-preserve-red)";

function useLocalFrame() {
  return useCurrentFrame();
}

// ---------- Beat 1 ----------
function Beat1() {
  const f = useLocalFrame();
  const opacity = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(f, [0, 10], [12, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-ink px-20">
      <p className="text-center font-display text-6xl font-bold text-parchment" style={{ opacity, transform: `translateY(${y}px)` }}>
        Your new hire starts <span className="text-saffron">Friday.</span>
      </p>
    </AbsoluteFill>
  );
}

// ---------- Beat 2: MEGA word-per-word ----------
function Beat2() {
  const f = useLocalFrame();
  const words = ["Who", "trains", "them?"];
  const perWord = 15;
  const activeIndex = Math.min(words.length - 1, Math.floor(f / perWord));
  const localF = f - activeIndex * perWord;
  const scale = interpolate(localF, [0, 3], [1.04, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-ink">
      <div style={{ transform: `scale(${scale})` }}>
        <MegaType color={PARCHMENT}>{words[activeIndex]}</MegaType>
      </div>
    </AbsoluteFill>
  );
}

// ---------- Beat 3: alternating slide fragments ----------
function Beat3() {
  const f = useLocalFrame();
  const fragments = ["You do.", "On the pass.", "Mid service."];
  const per = 20;
  const idx = Math.min(fragments.length - 1, Math.floor(f / per));
  const localF = f - idx * per;
  const fromSide = idx % 2 === 0 ? -1 : 1;
  const x = interpolate(localF, [0, 8], [40 * fromSide, 0], { extrapolateRight: "clamp" });
  const opacity = interpolate(localF, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-ink">
      <p style={{ transform: `translateX(${x}px)`, opacity, fontSize: 140 }} className="font-display font-bold text-parchment">
        {fragments[idx]}
      </p>
    </AbsoluteFill>
  );
}

// ---------- Beat 4: MEGA number, staggered reveal then still ----------
function Beat4() {
  const f = useLocalFrame();
  const value = "15.5%";
  return (
    <AbsoluteFill className="items-center justify-center bg-ink">
      <MegaType color={SAFFRON} className="font-mono">
        {value.split("").map((ch, i) => {
          const chDelay = i * 2;
          const chOpacity = interpolate(f - chDelay, [0, 8], [0, 1], { extrapolateRight: "clamp" });
          return (
            <span key={i} style={{ opacity: Math.max(0.15, chOpacity) }}>
              {ch}
            </span>
          );
        })}
      </MegaType>
    </AbsoluteFill>
  );
}

// ---------- Beat 5 ----------
function Beat5() {
  const f = useLocalFrame();
  const line1 = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const line2 = interpolate(f, [6, 14], [0, 1], { extrapolateRight: "clamp" });
  const credit = interpolate(f, [22, 30], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-ink px-20 text-center">
      <div>
        <p className="font-display text-5xl font-bold text-parchment" style={{ opacity: line1 }}>
          Highest staff turnover
        </p>
        <p className="mt-2 font-display text-5xl font-bold text-parchment" style={{ opacity: line2 }}>
          of any industry in Australia.
        </p>
        <p className="mt-6 font-mono text-xs text-parchment/40" style={{ opacity: credit }}>
          Ai Group, ABS-derived, year to Feb 2025
        </p>
      </div>
    </AbsoluteFill>
  );
}

// ---------- Beat 6: marquee ----------
function Beat6() {
  const f = useLocalFrame();
  const total = dur(5);
  const topOpacity = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center gap-8 bg-ink">
      <p className="px-10 text-center font-display text-4xl font-bold text-parchment" style={{ opacity: topOpacity }}>
        So you train them
      </p>
      <Marquee text="AND AGAIN &middot;" frame={f} totalFrames={total} color={SAFFRON} />
    </AbsoluteFill>
  );
}

// ---------- Beat 7: blur fade, darken (bleeds into beat 8, no cut) ----------
function Beat7() {
  const f = useLocalFrame();
  const total = dur(6);
  const blur = interpolate(f, [0, 22], [3, 0], { extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 10], [0, 0.45], { extrapolateRight: "clamp" });
  const darken = interpolate(f, [0, total], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, var(--color-ink) 100%, black ${darken * 100}%)` }}>
      <p className="px-20 text-center font-display text-5xl font-bold text-parchment" style={{ opacity, filter: `blur(${blur}px)` }}>
        Then there&rsquo;s the part you can&rsquo;t see.
      </p>
    </AbsoluteFill>
  );
}

// ---------- Beat 8 ----------
function Beat8() {
  const f = useLocalFrame();
  const opacity = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const redOpacity = interpolate(f, [6, 14], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-black px-20 text-center">
      <p className="font-display text-5xl font-bold text-parchment" style={{ opacity }}>
        One staff member pours{" "}
        <span className="text-preserve-red" style={{ opacity: redOpacity }}>
          without a current RSA.
        </span>
      </p>
    </AbsoluteFill>
  );
}

// ---------- Beat 9: GrowFill number with flash ----------
function Beat9() {
  const f = useLocalFrame();
  return (
    <AbsoluteFill className="items-center justify-center bg-ink">
      {f < 1 && <AbsoluteFill className="bg-parchment" />}
      <GrowFill color={RED} frame={f} className="font-mono">
        $12,546
      </GrowFill>
    </AbsoluteFill>
  );
}

// ---------- Beat 10: word stack, sets up size jump ----------
function Beat10() {
  const f = useLocalFrame();
  const words = ["That's", "the", "licensee."];
  const perWord = 15;
  const activeIndex = Math.min(words.length - 1, Math.floor(f / perWord));
  return (
    <AbsoluteFill className="items-center justify-center bg-ink">
      <div className="relative flex flex-col items-center">
        {words.slice(0, activeIndex + 1).map((w, i) => (
          <p key={i} style={{ fontSize: 120, opacity: i === activeIndex ? 1 : 0.3 }} className="font-display font-bold text-parchment">
            {w}
          </p>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ---------- Beat 11: GrowFill payoff + stillness ----------
function Beat11() {
  const f = useLocalFrame();
  const total = dur(10);
  return (
    <AbsoluteFill className="items-center justify-center bg-ink">
      <GrowFill color={SAFFRON} frame={f}>
        That&rsquo;s you.
      </GrowFill>
    </AbsoluteFill>
  );
}

// ---------- Beat 13: scrolling cert list + typewriter overlay ----------
const CERT_ROWS = Array.from({ length: 8 }).flatMap((_, i) => [
  { label: "Food Handling", sub: "Valid" },
  { label: "RSA", sub: "Valid" },
  { label: "First Aid", sub: "Valid" },
  { label: "WWCC", sub: "Valid" },
]);
function Beat13() {
  const f = useLocalFrame();
  const total = dur(11);
  const flipAtFrame = Math.floor(total * 0.55);
  const text = "Certificates expire quietly. Nothing tells you.";
  const chars = Math.min(text.length, Math.floor((f / FPS) * 28));
  const done = chars >= text.length;
  const caretOn = Math.floor(f / 6) % 2 === 0;
  const fadeStart = total - 16;
  const opacity = done ? interpolate(f, [fadeStart, fadeStart + 8], [1, 0.15], { extrapolateRight: "clamp" }) : 1;
  const strike = done ? interpolate(f, [fadeStart, fadeStart + 6], [0, 1], { extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill className="items-center justify-center bg-ink">
      <div className="absolute inset-0 opacity-30">
        <ScrollList rows={CERT_ROWS} frame={f} flipAtRowIndex={1} flipAtFrame={flipAtFrame} />
      </div>
      <div className="relative rounded-3xl bg-ink/80 px-10 py-8 text-center backdrop-blur-sm">
        <p className="font-display text-4xl font-bold text-parchment" style={{ opacity }}>
          {text.slice(0, chars)}
          {!done && caretOn && <span className="text-saffron">|</span>}
        </p>
        <div className="absolute left-10 right-10 top-1/2 h-[3px] bg-preserve-red" style={{ width: `${strike * 85}%`, transform: "translateY(-50%)" }} />
      </div>
    </AbsoluteFill>
  );
}

// ---------- Beat 14: fade then scroll off (a fast one-line beat -- timing scales to whatever total it's given) ----------
function Beat14() {
  const f = useLocalFrame();
  const total = dur(12);
  const fadeIn = Math.max(2, Math.round(total * 0.3));
  const opacity = interpolate(f, [0, fadeIn], [0, 1], { extrapolateRight: "clamp" });
  const pushStart = Math.max(fadeIn, total - Math.min(20, Math.round(total * 0.65)));
  const y = interpolate(f, [pushStart, total], [0, 40], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(f, [pushStart, total], [1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-ink px-20 text-center">
      <p
        className="font-display text-5xl font-bold text-parchment"
        style={{ opacity: f < pushStart ? opacity : fadeOut, transform: `translateY(${y}px)` }}
      >
        And inspectors don&rsquo;t read your filing cabinet.
      </p>
    </AbsoluteFill>
  );
}

// ---------- Beat 15: fastest word stack + fade to black (act break) ----------
function Beat15() {
  const f = useLocalFrame();
  const total = dur(13);
  const words = ["They", "ask", "the", "19 year old", "on shift."];
  const perWord = 9;
  const activeIndex = Math.min(words.length - 1, Math.floor(f / perWord));
  const fadeStart = total - 8;
  const blackOpacity = interpolate(f, [fadeStart, total], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-ink">
      <p className="font-display text-6xl font-bold" style={{ color: activeIndex === 3 ? SAFFRON : PARCHMENT }}>
        {words[activeIndex]}
      </p>
      <AbsoluteFill className="bg-black" style={{ opacity: blackOpacity }} />
    </AbsoluteFill>
  );
}

// ---------- Beats 16-17 combined: trace reveal then camera push-in zoom (one continuous shot, no cut) ----------
function RevealAndZoom() {
  const f = useLocalFrame();
  const traceEnd = dur(14); // local frame where phase 1 (trace + wordmark) ends and zoom begins
  const zoomTotal = dur(15); // however many frames the zoom phase actually has -- everything below scales to it, not a hardcoded 60
  const wordmarkOp = interpolate(f, [50, 62], [0, 1], { extrapolateRight: "clamp" });
  const zoomStart = traceEnd;
  const zoomLocal = Math.max(0, f - zoomStart);
  const zoomP = interpolate(zoomLocal, [0, zoomTotal], [0, 1], { extrapolateRight: "clamp" });
  // slow-in/slow-out cubic-bezier-ish easing via a hand ease curve
  const eased = zoomP < 0.5 ? 4 * zoomP * zoomP * zoomP : 1 - Math.pow(-2 * zoomP + 2, 3) / 2;
  const scale = interpolate(eased, [0, 1], [1, 9]);
  const wordmarkFadeOut = interpolate(zoomLocal, [0, Math.min(15, zoomTotal * 0.3)], [1, 0], { extrapolateRight: "clamp" });
  const fillOpacity = interpolate(zoomLocal, [zoomTotal * 0.65, zoomTotal], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-ink">
      <div className="flex flex-col items-center gap-3" style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        <ChitMark size={200} fillColor={PARCHMENT} traceColor={SAFFRON} driveFrameSeconds={f / FPS} />
        <p className="font-display text-4xl font-bold text-parchment" style={{ opacity: Math.min(wordmarkOp, wordmarkFadeOut) }}>
          Larder
        </p>
      </div>
      {/* the mark's own parchment interior becomes the next beat's ground as it fills frame */}
      <AbsoluteFill className="bg-parchment" style={{ opacity: fillOpacity }} />
    </AbsoluteFill>
  );
}

// ---------- Beat 18: tiles falling into place, each cell independently (BentoGrid's own remotionFrame prop -- real per-cell stagger, not one rigid unit) ----------
function Beat18() {
  const f = useLocalFrame();
  const total = dur(16);
  const captions = ["your SOPs", "your photos", "your venue"];
  const perCap = total / captions.length;
  const capIdx = Math.min(captions.length - 1, Math.floor(f / perCap));
  const localCapF = f - capIdx * perCap;
  const capOp = interpolate(localCapF, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-clay-brown/10 p-10">
      <div className="overflow-hidden rounded-[2rem] border-[8px] border-ink bg-parchment shadow-2xl" style={{ width: 780, height: 780 }}>
        <div style={{ transform: "scale(0.72)", transformOrigin: "top left", width: `${100 / 0.72}%`, height: `${100 / 0.72}%` }}>
          {/* @ts-expect-error -- JSON import loses certRows status union type */}
          <BentoGrid {...twoFiresHome} remotionFrame={f} />
        </div>
      </div>
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
        <p className="font-mono text-2xl font-bold text-ink" style={{ opacity: capOp }}>
          {captions[capIdx]}
        </p>
      </div>
    </AbsoluteFill>
  );
}

// ---------- Beat 19: push-in on certs ----------
function Beat19() {
  const f = useLocalFrame();
  const total = dur(17);
  const scale = interpolate(f, [0, total], [1, 1.4], { extrapolateRight: "clamp" });
  const line2Opacity = interpolate(f, [20, 28], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-parchment">
      <div style={{ transform: `scale(${scale})` }} className="flex flex-col items-center gap-2">
        <div className="rounded-2xl border-2 border-saffron bg-parchment px-8 py-6 text-center">
          <p className="font-mono text-sm uppercase tracking-wide text-clay-brown">Certificates</p>
          <p className="mt-2 font-display text-2xl text-ink">First Aid</p>
          <p className="font-mono text-saffron">Expires in 9d</p>
        </div>
      </div>
      <div className="absolute bottom-20 px-16 text-center">
        <p className="font-sans text-2xl text-ink">Every certificate tracked.</p>
        <p className="font-sans text-2xl text-preserve-red" style={{ opacity: line2Opacity }}>
          You get told before it expires, not after.
        </p>
      </div>
    </AbsoluteFill>
  );
}

// ---------- Beat 20: ask larder tile alone ----------
function Beat20() {
  const f = useLocalFrame();
  const total = dur(18);
  const opacity = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(f, [total - 10, total], [1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-parchment" style={{ opacity: Math.min(opacity, exitOpacity) }}>
      <div className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-3xl bg-ink">
        <ChitMark size={44} fillColor={PARCHMENT} traceColor={SAFFRON} driveFrameSeconds={f / FPS} />
      </div>
      <p className="mt-8 px-20 text-center font-sans text-2xl text-ink">And when someone gets stuck mid service, they ask.</p>
    </AbsoluteFill>
  );
}

// ---------- Beats 21-23 combined: chat demo (continuous) ----------
function ChatDemoBeats() {
  const f = useLocalFrame();
  const questionEndFrame = B[20] - B[19];
  const answerEndFrame = B[21] - B[19];
  const totalFrames = B[22] - B[19];
  // Real layout width, not a manual transform -- the flex row's own
  // `justify-center` recenters the whole pair as this grows, so the card
  // never fights a second, independent shift (that double-shift was the
  // spacing bug: the card had its own translateX AND the row was
  // recentering around the newly-mounted copy panel at the same time).
  const shiftFrame = Math.max(0, f - answerEndFrame);
  const revealWidth = interpolate(shiftFrame, [0, 18], [0, 320], { extrapolateRight: "clamp" });
  const copyOpacity = interpolate(f, [answerEndFrame + 10, answerEndFrame + 22], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center bg-parchment">
      <div className="flex items-center gap-10">
        <ChatDemo frame={f} questionEndFrame={questionEndFrame} answerEndFrame={answerEndFrame} totalFrames={totalFrames} />
        {f >= answerEndFrame && (
          <div style={{ width: revealWidth, overflow: "hidden" }}>
            <div className="w-[320px]" style={{ opacity: copyOpacity }}>
              <p className="font-sans text-2xl text-ink">
                It answers from <span className="font-bold text-bay-green">your approved content only.</span>
              </p>
              <p className="mt-4 font-sans text-xl text-clay-brown">If it doesn&rsquo;t know, it says ask your supervisor.</p>
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

// ---------- Beat 24: word-per-word payoff setup ----------
function Beat24() {
  const f = useLocalFrame();
  const words = ["Your", "venue", "trains", "itself."];
  const perWord = 11;
  const activeIndex = Math.min(words.length - 1, Math.floor(f / perWord));
  return (
    <AbsoluteFill className="items-center justify-center bg-parchment">
      <p style={{ fontSize: 130 }} className="font-display font-bold text-ink">
        {words[activeIndex]}
      </p>
    </AbsoluteFill>
  );
}

// ---------- Beat 25: GrowFill payoff ----------
function Beat25() {
  const f = useLocalFrame();
  return (
    <AbsoluteFill className="items-center justify-center bg-parchment">
      <GrowFill color={RED} frame={f}>
        Get your time back.
      </GrowFill>
    </AbsoluteFill>
  );
}

// ---------- Beat 26: close ----------
function Beat26() {
  const f = useLocalFrame();
  const wordmarkOp = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const ctaScale = interpolate(f, [14, 19], [0, 1.08], { extrapolateRight: "clamp" });
  const ctaSettle = interpolate(f, [19, 24], [1.08, 1], { extrapolateRight: "clamp" });
  const supportOp = interpolate(f, [26, 34], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="items-center justify-center gap-5 bg-ink px-16 text-center">
      <div className="flex items-center gap-3" style={{ opacity: wordmarkOp }}>
        <ChitMark size={64} fillColor={PARCHMENT} traceColor={SAFFRON} driveFrameSeconds={f / FPS} />
        <p className="font-display text-3xl font-bold text-parchment">Larder</p>
      </div>
      <p
        className="rounded-full bg-saffron px-10 py-4 font-display text-3xl font-bold text-ink"
        style={{ transform: `scale(${f < 19 ? ctaScale : ctaSettle})` }}
      >
        Book a walkthrough
      </p>
      <p className="font-sans text-base text-parchment/70" style={{ opacity: supportOp }}>
        Your SOPs, always on shift.
      </p>
    </AbsoluteFill>
  );
}

// Beat 12 (the NSW $220/$1,100 comparison) was removed 2026-09-05 at
// John's direction -- the $12,546 VIC figure and 15.5% stat stay, this
// specific comparison doesn't. See docs/n3-turnover-cost-sources.md for
// the citation record (kept, flagged as no longer applied, not deleted).
const SIMPLE_BEATS: (() => React.JSX.Element)[] = [
  Beat1, Beat2, Beat3, Beat4, Beat5, Beat6, Beat7, Beat8, Beat9, Beat10, Beat11, Beat13, Beat14, Beat15,
];

export function Explainer() {
  return (
    <AbsoluteFill>
      <Audio
        src={staticFile("indie-rock-food-review.mp3")}
        volume={(f) => {
          // Duck under the two strategic-stillness moments: end of "That's
          // you." (beat 11) and the act-break fade to black (beat 15).
          const duckWindows: [number, number][] = [
            [B[11] - 15, B[11]],
            [B[14] - 10, B[14]],
          ];
          for (const [start, end] of duckWindows) {
            if (f >= start && f <= end) return 0.35;
          }
          return 0.85;
        }}
      />
      {SIMPLE_BEATS.map((Beat, i) => (
        <Sequence key={i} from={B[i]} durationInFrames={B[i + 1] - B[i]}>
          <Beat />
        </Sequence>
      ))}
      <Sequence from={B[14]} durationInFrames={B[16] - B[14]}>
        <RevealAndZoom />
      </Sequence>
      <Sequence from={B[16]} durationInFrames={B[17] - B[16]}>
        <Beat18 />
      </Sequence>
      <Sequence from={B[17]} durationInFrames={B[18] - B[17]}>
        <Beat19 />
      </Sequence>
      <Sequence from={B[18]} durationInFrames={B[19] - B[18]}>
        <Beat20 />
      </Sequence>
      <Sequence from={B[19]} durationInFrames={B[22] - B[19]}>
        <ChatDemoBeats />
      </Sequence>
      <Sequence from={B[22]} durationInFrames={B[23] - B[22]}>
        <Beat24 />
      </Sequence>
      <Sequence from={B[23]} durationInFrames={B[24] - B[23]}>
        <Beat25 />
      </Sequence>
      <Sequence from={B[24]} durationInFrames={B[25] - B[24]}>
        <Beat26 />
      </Sequence>
    </AbsoluteFill>
  );
}

export const EXPLAINER_DURATION_FRAMES = B[B.length - 1];
export const EXPLAINER_FPS = FPS;
