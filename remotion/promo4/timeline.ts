// Promo v4: the only place timing lives. Picture, the audio build (scripts/make-promo4-audio.mjs), the
// grid check and the A/V audit all import this file. No React, no CSS. Every cue is a frame computed from
// bars and beats on the 112.5 BPM grid (beat 16 f, 16th 4 f, bar 64 f at 30 fps).
// The explicit .ts extensions let node run this file directly; the bundler accepts them too.
// @ts-ignore TS5097 (allowImportingTsExtensions is not enabled for this repo)
import { BAR, BEAT, FPS, b } from "./grid.ts";
// @ts-ignore TS5097
import { ASK, CONTACT, FORMS, Q } from "./data.ts";

export { BAR, BEAT, FPS, b };
export const TAIL = 30;

// ---- acts: contiguous, bar aligned, absolute frames -----------------------------------------------
export const ACT = {
  hook: { from: b(1), dur: b(7) - b(1) }, // bars 1 to 6: three questions, the pull back to the phone, the day off message
  ask: { from: b(7), dur: b(13) - b(7) }, // bars 7 to 12: Ask Larder, the fryer answer, the safe goes to a supervisor
  pain2: { from: b(13), dur: b(15) - b(13) }, // bars 13 to 14: the forms, every shift, every day, every week
  forms: { from: b(15), dur: b(22) - b(15) }, // bars 15 to 21: three taps, the out of range note, the dashboard (the payoff gets 7 bars)
  stations: { from: b(22), dur: b(28) - b(22) }, // bars 22 to 27: the cellar, scan, station page, the real fix
  urgency: { from: b(28), dur: b(31) - b(28) }, // bars 28 to 30: tonight, someone closes without you
  close: { from: b(31), dur: b(35) + TAIL - b(31) }, // bars 31 to 34 and the tail: book a walk through
};
export type ActKey = keyof typeof ACT;
export const TOTAL = b(35) + TAIL; // 2206 f = 73.5 s

// ---- cues (absolute frames on the 16th grid) ---------------------------------------------------------
export const CUE = {
  // hook
  bubble1: b(1, 0, 2), // first bubble already moving on frame 0, lands here
  bubble2: b(1, 3),
  bubble3: b(2, 2),
  hookLine: b(2, 3),
  pullFrom: b(3, 3, 2), // offgrid: starts 8 f early so its velocity peak sits near b(4)
  pullTo: b(5),
  notify: b(5, 1),
  pain1Line: b(5, 2),
  pushPhone: b(6),
  lift1: b(7),
  // ask
  tapAsk1: b(7, 3),
  answer1: b(8),
  askLine1: b(8, 2),
  tapAnother: b(9, 3),
  typeSafe: b(10),
  tapAsk2: b(10, 2),
  answer2: b(10, 3),
  askLine2: b(10, 3, 1),
  holdFrom: b(11, 1),
  holdTo: b(12, 2),
  whipFrom: b(12, 3),
  // pain 2
  pain2: b(13),
  roll1: b(13, 1),
  roll2: b(13, 3),
  roll3: b(14, 1),
  // forms (payoff)
  lift2: b(15),
  tapForm: b(15, 2),
  tapMarkRest: b(16),
  formsLine: b(16, 1),
  tapSave: b(16, 3),
  formsSub: b(16, 3),
  slideTemp: b(18),
  tapField: b(18, 1),
  noteLine: b(18, 2),
  tapNote: b(19),
  tapSaveReading: b(19, 2),
  dashboard: b(20, 1),
  dashLine: b(20, 2),
  // pain 3 and stations
  pain3: b(22),
  bubble4: b(22, 0, 2),
  pain3Line: b(22, 1),
  brackets: b(23),
  scanLine: b(23, 3), // the caption rolls from pain3Line into this one
  lift3: b(24), // the QR lock and the lift
  tapTrouble: b(25),
  troublePage: b(25, 1),
  fixLine: b(25, 3),
  escalation: b(26, 2),
  // urgency
  disc: b(27, 2), // the horizon disc starts rising; its core fills the frame on b(28)
  urgency: b(28),
  urgLine1: b(28, 2),
  emptyBubble: b(29),
  urgLine2: b(29, 2),
  musicStop: b(30, 3, 2), // one 8th of air before the close
  // close
  close: b(31),
  phone: b(31, 2),
  url: b(32),
  email: b(32, 2),
  morph: b(33),
  wordmark: b(33, 2), // the resolve lands when the wordmark is readable (after the morph lands)
};

/** Designed near still hold on the key claim (the supervisor line), under a music thinning. */
export const HOLD = { from: CUE.holdFrom, to: CUE.holdTo };

// ---- typing schedules (absolute frames each character appears) --------------------------------------
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Characters spread over [start, end) with a human rhythm: quick spaces, a breath after punctuation. */
export function typeSchedule(text: string, start: number, end: number, seed: number): number[] {
  const r = seeded(seed);
  const w = [...text].map((ch, i) => {
    let x = 0.75 + r() * 0.6;
    if (ch === " ") x *= 0.7;
    if (i > 0 && /[.,?]/.test(text[i - 1])) x += 1.6;
    return x;
  });
  const total = w.reduce((p, q) => p + q, 0);
  let acc = 0;
  return w.map((x) => Math.round(start + ((acc += x) / total - x / total) * (end - start)));
}
export const TYPE = {
  safe: typeSchedule(ASK.safeQuestion, CUE.typeSafe, CUE.typeSafe + 30, 7),
  reading: [CUE.tapField + 6], // the single key "8"
};

/** Answer words streamed into the Ask Larder box: one word every 3 f, layout fixed from the first frame. */
export const STREAM = { fryer: { start: CUE.answer1, every: 3, words: ASK.fryerAnswer.split(" ").length } };

// ---- copy: every caption, with its read window ---------------------------------------------------
export type Copy = { id: string; text: string; in: number; resolved: number; out: number };
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const line = (id: string, text: string, inF: number, out: number, stagger = 4, dur = 14): Copy => ({
  id,
  text,
  in: inF,
  resolved: inF + (words(text) - 1) * stagger + dur,
  out,
});
export const COPY: Copy[] = [
  line("hookLine", "Every shift, the same questions.", CUE.hookLine - 1, CUE.pullFrom + 30),
  line("pain1Line", "Your day off. Their question.", CUE.pain1Line - 1, CUE.lift1 + 4),
  line("askLine1", "From procedures you approved.", CUE.askLine1 - 1, CUE.tapAnother + 16),
  line("askLine2", "Keys and safes go to a supervisor.", CUE.askLine2 - 1, CUE.whipFrom),
  // a word roll: one line that mutates; its read check uses the last state, "Every week."
  { id: "roll", text: "Every shift. Every day. Every week.", in: CUE.roll1 - 1, resolved: CUE.roll3 + 14, out: CUE.lift2 + 14 },
  line("formsLine", "Three taps. Nothing typed.", CUE.formsLine - 1, CUE.slideTemp),
  line("formsSub", "When everything passes.", CUE.formsSub - 1, CUE.slideTemp),
  line("noteLine", "No note, no save.", CUE.noteLine - 1, CUE.dashboard),
  line("dashLine", "Flagged on your dashboard.", CUE.dashLine - 1, CUE.pain3),
  line("pain3Line", "First shift in the cellar.", CUE.pain3Line - 1, CUE.scanLine),
  line("scanLine", "Scan the station.", CUE.scanLine - 1, CUE.tapTrouble),
  line("fixLine", "Its own fixes, at the station.", CUE.fixLine - 1, CUE.disc + 24),
  line("urgLine1", "Tonight, someone closes without you.", CUE.urgLine1 - 1, CUE.close),
  line("urgLine2", "Who do they call?", CUE.urgLine2 - 1, CUE.close),
  line("cta", CONTACT.cta, CUE.close - 1, TOTAL),
  line("phone", CONTACT.phone, CUE.phone - 1, TOTAL),
  line("url", CONTACT.url, CUE.url - 1, TOTAL),
  line("email", CONTACT.email, CUE.email - 1, TOTAL),
];
export const copy = (id: string): Copy => {
  const c = COPY.find((x) => x.id === id);
  if (!c) throw new Error(`timeline: no COPY entry "${id}"`);
  return c;
};

// ---- reserved voiceover windows (Version B in research/video-v3/script.md, retimed to the bars) ---------
// No voice ships yet. The audio build ducks the music inside these windows so a recording can drop in later
// without moving the picture. Times are the planned line starts and ends at about 140 words a minute.
export type VoLine = { id: string; text: string; from: number; to: number };
export const VO: VoLine[] = [
  { id: "vo1", text: "Every shift starts with the same questions.", from: b(2, 2), to: b(2, 2) + 90 },
  { id: "vo2", text: "And when you're not there, they still come to you.", from: b(4, 2), to: b(4, 2) + 129 },
  { id: "vo3", text: "Ask Larder answers them from your own procedures, the ones you approved.", from: b(7, 2), to: b(7, 2) + 153 },
  { id: "vo4", text: "Keys and safes, it hands to a supervisor.", from: b(10, 3), to: b(10, 3) + 102 },
  { id: "vo5", text: "Then the forms. Every shift. Every day. Every week.", from: b(13) + 2, to: b(15) - 2 },
  { id: "vo6", text: "Three taps, nothing typed, when everything passes.", from: b(15, 2), to: b(15, 2) + 90 },
  { id: "vo7", text: "An out of range reading needs a note before it saves.", from: b(18), to: b(18) + 141 },
  { id: "vo8", text: "And it's flagged on your dashboard.", from: b(20, 2), to: b(20, 2) + 60 },
  { id: "vo9", text: "And new staff, at a station they've never used.", from: b(22, 1), to: b(22, 1) + 117 },
  { id: "vo10", text: "They scan the station. Its training, answers and troubleshooting.", from: b(24, 1), to: b(24, 1) + 130 },
  { id: "vo11", text: "Tonight, someone closes without you.", from: b(28, 2), to: b(28, 2) + 63 },
  { id: "vo12", text: "Who do they call?", from: b(29, 2), to: b(29, 2) + 51 },
  { id: "vo13", text: "Book a walk through. Call oh four seven seven, one two oh, six two four.", from: b(31), to: b(31) + 192 },
];

// ---- sound effect cues (absolute frames; the audio build places each on its exact sample) ------------
export type SfxKind = "ping" | "buzz" | "key" | "tick" | "whoosh" | "scan" | "confirm" | "roll" | "resolve";
export type Sfx = { frame: number; kind: SfxKind; pitch?: number; gain?: number };
export function sfxCues(): Sfx[] {
  const c: Sfx[] = [
    { frame: CUE.bubble1, kind: "ping", pitch: 0 },
    { frame: CUE.bubble2, kind: "ping", pitch: 2 },
    { frame: CUE.bubble3, kind: "ping", pitch: 4 },
    { frame: CUE.notify, kind: "buzz" },
    { frame: CUE.notify + 2, kind: "ping", pitch: 5, gain: 0.8 },
    { frame: CUE.tapAsk1, kind: "tick" },
    { frame: CUE.tapAnother, kind: "tick" },
    ...TYPE.safe.filter((_, i) => ASK.safeQuestion[i] !== " ").map((f: number) => ({ frame: f, kind: "key" as const })),
    { frame: CUE.tapAsk2, kind: "tick" },
    { frame: CUE.roll1, kind: "roll" },
    { frame: CUE.roll2, kind: "roll" },
    { frame: CUE.roll3, kind: "roll" },
    { frame: CUE.tapForm, kind: "tick" },
    { frame: CUE.tapMarkRest, kind: "tick" },
    { frame: CUE.tapSave, kind: "tick" },
    { frame: CUE.tapSave + 6, kind: "confirm" }, // after the tap tick has released, so the two never blur
    { frame: CUE.tapField, kind: "tick" },
    { frame: TYPE.reading[0], kind: "key" },
    { frame: CUE.tapNote, kind: "tick" },
    { frame: CUE.tapSaveReading, kind: "tick" },
    { frame: CUE.tapSaveReading + 6, kind: "confirm" },
    { frame: CUE.lift3, kind: "scan" },
    { frame: CUE.tapTrouble, kind: "tick" },
    { frame: CUE.wordmark, kind: "resolve" },
  ];
  return c.sort((p, q) => p.frame - q.frame);
}
/** Whoosh apexes sit on the velocity peaks the acts compute; the acts export them and the audio build adds them. */
export const WHOOSH_APEX = { pull: b(4), whip: b(13) };

// ---- self checks (grid-check, as in the Cinetic method) ----------------------------------------------
const assert = (ok: boolean, m: string) => {
  if (!ok) throw new Error(`timeline: ${m}`);
};
assert(Number.isInteger(BEAT), "beat must be a whole number of frames");
const acts = Object.values(ACT);
acts.forEach((a, i) => {
  if (i > 0) assert(a.from === acts[i - 1].from + acts[i - 1].dur, "acts must be contiguous");
  assert(a.from % BAR === 0, "acts start on bar lines");
});
assert(acts[acts.length - 1].from + acts[acts.length - 1].dur === TOTAL, "the last act absorbs the tail");
export const HOLD_FAILS: string[] = [];
for (const c of COPY) {
  const need = 36 + 6 * (c.id === "roll" ? 2 : words(c.text));
  if (!(c.out - c.resolved >= need || c.out === TOTAL)) HOLD_FAILS.push(`${c.id} holds ${c.out - c.resolved} f, needs ${need}`);
}
assert(HOLD_FAILS.length === 0, `captions too short: ${HOLD_FAILS.join("; ")}`);
const onScreenWords = COPY.reduce((n, c) => n + words(c.text), 0);
export const WORD_COUNT = onScreenWords;
void FORMS;
void Q;
void FPS;

// ---- the 30 s cutdown: three source ranges, bar or beat aligned, played back to back --------------------
// Ask Larder (the day off message, the fryer answer, the safe goes to a supervisor), the checklist from the
// cascade to the save, then the empty question bubble answering "Book a walk through" and the close. The
// urgency lines are hidden in the cut (they need their own two bars to be read). Each splice keeps the beat
// phase (source minus destination is a whole number of beats), so the music stays on the grid across it.
const CUT_SRC = [
  { id: "ask", from: b(5), to: b(12) },
  { id: "forms", from: b(16), to: b(17, 3) }, // ends a beat before the slide to the temperature log, so it never flashes
  { id: "close", from: b(30, 2), to: TOTAL },
];
export const CUT = CUT_SRC.reduce<{ id: string; from: number; to: number; at: number }[]>((acc, s) => {
  const at = acc.length ? acc[acc.length - 1].at + (acc[acc.length - 1].to - acc[acc.length - 1].from) : 0;
  return [...acc, { ...s, at }];
}, []);
export const CUT_TOTAL = CUT.reduce((n, s) => n + s.to - s.from, 0); // 878 f = 29.3 s
for (const s of CUT) if ((s.from - s.at) % BEAT !== 0) throw new Error(`cut ${s.id} breaks the beat phase`);
if (CUT_TOTAL > 30 * FPS) throw new Error(`cutdown runs ${CUT_TOTAL} f, over 30 s`);
