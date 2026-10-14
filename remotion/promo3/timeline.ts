// Promo v3 timeline. Pure data, so the composition and scripts/make-promo2-sfx.mjs read the same frame numbers.
// Hook, home and Ask scenes are reused unchanged from promo2, so their local timings come from there.
// The explicit .ts extension lets node run this file from scripts/make-promo2-sfx.mjs; the bundler accepts it too.
// @ts-ignore TS5097 (allowImportingTsExtensions is not enabled for this repo)
import { ASK, HOME, HOOK_LINES, HOOK_TIMES, Q1, Q2, charTimes } from "../promo2/timeline.ts";

export { charTimes };
export const FPS = 30;

// Scene windows (absolute frames). Each scene starts while the one before is still finishing.
export const SCENES = {
  hook: { from: 0, dur: 170 },
  home: { from: 152, dur: 178 },
  ask: { from: 316, dur: 414 },
  station: { from: 716, dur: 330 },
  forms: { from: 1032, dur: 300 },
  cert: { from: 1318, dur: 300 },
  train: { from: 1604, dur: 270 },
  owner: { from: 1860, dur: 240 },
  close: { from: 2082, dur: 124 },
} as const;
export type SceneKey = keyof typeof SCENES;
export const TOTAL_FRAMES = 2206; // 73.5 s

// ---- scene local timings (frames local to each scene) ----------------------
export const STATION = {
  push: 6, // camera pushes toward the sticker
  focusFrom: 40, focusTo: 98, // soft focus resolves
  bracketsIn: 54, lock: 104,
  hubIn: 118, // the hub arrives over the camera view
  subSwap: 124,
  tapFrom: 170, tapTo: 200, tapClick: 206,
};

export const FORMS = {
  clipStart: 359, // real recording: first tap is at clip frame 409, then 520, then 618
  taps: [50, 161, 259],
  tapPos: [{ x: 0.309, y: 0.5 }, { x: 0.786, y: 0.354 }, { x: 0.792, y: 0.947 }],
  pushIn: 128, pullBack: 196, saveIn: 232,
};

export const CERT_DATE = "16/12/2025";
export const CERT_DUE = "16 Dec 2028 (3 year(s) from the issued date)";
export const CERT = {
  fileFrom: 10, fileTo: 34, fileClick: 40, fileShown: 44,
  dateFrom: 54, dateTo: 76, dateClick: 82,
  typeStart: 90, dateTimes: charTimes(CERT_DATE, 90, 31, 3.2),
  dueIn: 140,
  saveFrom: 150, saveTo: 172, saveClick: 178,
  done: 204, stamp: 210,
  push: 126, pull: 176,
};

export const SIGN_NAME = "Leila Mercer";
export const TRAIN = {
  cursorFrom: 14, cursorTo: 44, quizClick: 52,
  signIn: 84,
  nameStart: 100, nameTimes: charTimes(SIGN_NAME, 100, 41, 3),
  confirmFrom: 148, confirmTo: 176, confirmClick: 182,
  done: 200, stamp: 206,
};

export const OWNER = { camEnd: 22, highlight: 70, swap: 118 };

// ---- sound cues (frames local to each scene) -------------------------------
export type CueKind = "key" | "tick" | "thud" | "wipe" | "beep";
export type Cue = { frame: number; kind: CueKind };

const keysFor = (text: string, times: number[]): Cue[] =>
  [...text].flatMap((ch, i) => (ch === " " ? [] : [{ frame: times[i], kind: "key" as const }]));

export const SCENE_CUES: Record<SceneKey, Cue[]> = {
  hook: [...keysFor(HOOK_LINES.join(" "), HOOK_TIMES), { frame: 150, kind: "wipe" }],
  home: [{ frame: HOME.click, kind: "tick" }],
  ask: [
    ...keysFor(Q1, ASK.q1Times),
    ...keysFor(Q2, ASK.q2Times),
    { frame: ASK.submit1, kind: "tick" },
    { frame: ASK.submit2, kind: "tick" },
  ],
  station: [{ frame: STATION.lock, kind: "beep" }, { frame: STATION.hubIn, kind: "wipe" }, { frame: STATION.tapClick, kind: "tick" }],
  forms: FORMS.taps.map((f) => ({ frame: f, kind: "tick" as const })),
  cert: [
    { frame: CERT.fileClick, kind: "tick" },
    { frame: CERT.dateClick, kind: "tick" },
    ...keysFor(CERT_DATE, CERT.dateTimes),
    { frame: CERT.saveClick, kind: "tick" },
    { frame: CERT.stamp + 3, kind: "thud" },
  ],
  train: [
    { frame: TRAIN.quizClick, kind: "tick" },
    ...keysFor(SIGN_NAME, TRAIN.nameTimes),
    { frame: TRAIN.confirmClick, kind: "tick" },
    { frame: TRAIN.stamp + 3, kind: "thud" },
  ],
  owner: [{ frame: OWNER.swap, kind: "wipe" }],
  close: [{ frame: 0, kind: "wipe" }],
};

// ---- the 30 second cutdown: the same scenes, entered part way through --------
export type Seg = { scene: SceneKey; offset: number; dur: number };
const CUT_SEGS: Seg[] = [
  { scene: "hook", offset: 0, dur: 140 },
  { scene: "station", offset: 0, dur: 230 },
  { scene: "ask", offset: 226, dur: 172 },
  { scene: "forms", offset: 30, dur: 270 },
  { scene: "train", offset: 156, dur: 100 },
  { scene: "close", offset: 0, dur: 90 },
];
const CUT_OVERLAP = 16;
export const CUT: (Seg & { from: number })[] = (() => {
  let at = 0;
  return CUT_SEGS.map((s) => {
    const placed = { ...s, from: at };
    at += s.dur - CUT_OVERLAP;
    return placed;
  });
})();
export const CUT_FRAMES = CUT[CUT.length - 1].from + CUT[CUT.length - 1].dur;

/** Absolute frame cue lists for the full film and for the cutdown. */
export function cuesFull(): { frame: number; kind: CueKind }[] {
  return (Object.keys(SCENES) as SceneKey[])
    .flatMap((k) => SCENE_CUES[k].map((c) => ({ frame: SCENES[k].from + c.frame, kind: c.kind })))
    .sort((a, b) => a.frame - b.frame);
}
export function cuesCut(): { frame: number; kind: CueKind }[] {
  return CUT.flatMap((s) =>
    SCENE_CUES[s.scene].filter((c) => c.frame >= s.offset && c.frame < s.offset + s.dur).map((c) => ({ frame: s.from + c.frame - s.offset, kind: c.kind })),
  ).sort((a, b) => a.frame - b.frame);
}
