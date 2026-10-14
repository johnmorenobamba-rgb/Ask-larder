// Promo v2 timeline. Pure data and functions, no imports, so both the Remotion
// composition and scripts/make-promo2-sfx.mjs read the same frame numbers.

export const FPS = 30;

// Scene windows in absolute frames. Each scene starts while the one before is
// still finishing; the incoming scene sits on top and brings its own transition.
export const SCENES = {
  hook: { from: 0, dur: 170 },
  home: { from: 152, dur: 178 },
  ask: { from: 316, dur: 414 },
  train: { from: 716, dur: 180 },
  owner: { from: 882, dur: 166 },
  close: { from: 1030, dur: 120 },
} as const;
export const TOTAL_FRAMES = 1150;
export const WIPE_FRAMES = 18;
export const FADE_FRAMES = 14;

// ---- deterministic typing -------------------------------------------------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Frame (local to the scene) at which each character appears. */
export function charTimes(text: string, start: number, seed: number, base = 2): number[] {
  const r = rng(seed);
  const out: number[] = [];
  let t = start;
  for (const ch of text) {
    out.push(Math.round(t));
    let step = base * (0.7 + 0.7 * r());
    if (ch === "." || ch === "," || ch === "?") step += 5;
    else if (ch === " ") step += 0.6;
    t += step;
  }
  return out;
}

export const countAt = (times: number[], frame: number) => times.filter((t) => frame >= t).length;

/** Frame at which each word appears (streamed answers). */
export function wordTimes(words: string[], start: number, seed: number, base: number): number[] {
  const r = rng(seed);
  const out: number[] = [];
  let t = start;
  for (const w of words) {
    out.push(Math.round(t));
    let step = base * (0.6 + 0.8 * r());
    if (/[.:,?]$/.test(w)) step += 3;
    t += step;
  }
  return out;
}

// ---- copy -----------------------------------------------------------------
export const HOOK_LINES = ["Closing alone", "for the first time."];
export const HOOK_START = 14;
export const HOOK_TIMES = charTimes(HOOK_LINES.join(" "), HOOK_START, 3, 2.1);

export const Q1 = "How do I change the fryer oil?";
export const A1 =
  "Here's how to change the fryer oil. 1. Let the oil cool for at least one hour. 2. Drain it into the oil tub. 3. Wipe the tank, wash it and dry it fully. 4. Fill to the line with fresh oil. 5. Write the date on the fryer log.";
export const Q2 = "Where is the key to the safe?";
// Locked fallback wording, verified against src/app/api/staff/ask-larder/route.ts
export const A2 = "Ask your supervisor for assistance, as they have access to the safe.";

// Ask scene: turn 1 runs from local frame 0, turn 2 from TURN2 (local frames of the ask scene)
export const TURN2 = 240;
export const ASK = {
  q1Start: 24,
  q1Times: charTimes(Q1, 24, 11, 2),
  submit1: 92,
  a1Words: A1.split(" "),
  a1Times: wordTimes(A1.split(" "), 104, 5, 2.1),
  q2Start: TURN2 + 14,
  q2Times: charTimes(Q2, TURN2 + 14, 21, 2),
  submit2: TURN2 + 86,
  a2Words: A2.split(" "),
  a2Times: wordTimes(A2.split(" "), TURN2 + 98, 9, 3.6),
  push: TURN2 + 96,
};

export const HOME = { click: 104, cursorFrom: 62, cursorTo: 98, exit: 108 };
export const TRAIN = { cursorFrom: 22, cursorTo: 50, click: 56, swap: 80, stamp: 94 };

// ---- sound cue list (absolute frames) --------------------------------------
export type Cue = { frame: number; kind: "key" | "tick" | "thud" | "wipe" };
export function buildCues(): Cue[] {
  const cues: Cue[] = [];
  const at = (scene: keyof typeof SCENES, local: number) => SCENES[scene].from + local;
  const chars = (scene: keyof typeof SCENES, text: string, times: number[]) =>
    [...text].forEach((ch, i) => ch !== " " && cues.push({ frame: at(scene, times[i]), kind: "key" }));
  chars("hook", HOOK_LINES.join(" "), HOOK_TIMES);
  chars("ask", Q1, ASK.q1Times);
  chars("ask", Q2, ASK.q2Times);
  cues.push({ frame: at("hook", 150), kind: "wipe" }); // hook to home wipe starts as home begins
  cues.push({ frame: at("home", HOME.click), kind: "tick" });
  cues.push({ frame: at("ask", ASK.submit1), kind: "tick" });
  cues.push({ frame: at("ask", ASK.submit2), kind: "tick" });
  cues.push({ frame: at("train", TRAIN.click), kind: "tick" });
  cues.push({ frame: at("train", TRAIN.stamp + 3), kind: "thud" });
  cues.push({ frame: at("close", 0), kind: "wipe" });
  return cues.sort((a, b) => a.frame - b.frame);
}
