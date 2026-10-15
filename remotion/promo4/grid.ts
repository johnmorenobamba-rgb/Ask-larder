// The beat grid for promo v4. Pure numbers, no imports, so Node scripts (the audio build, the grid
// check, the A/V audit) can load it directly. timeline.ts builds the acts, cues and copy on top of it.
export const FPS = 30;
export const BPM = 112.5;
export const W = 1920;
export const H = 1080;
/** Frames per beat. Must be whole, or the kick and the picture drift a frame apart. */
export const BEAT = (60 / BPM) * FPS; // 16 f at 112.5 BPM, 30 fps
export const BAR = BEAT * 4; // 64 f = 2.133 s
/** Frame of a bar (1 based), a beat inside it (0 to 3) and a 16th inside that beat (0 to 3, fractions allowed). */
export const b = (bar: number, beat = 0, sub = 0) => Math.round(((bar - 1) * 4 + beat) * BEAT + sub * (BEAT / 4));
/** A duration written in 60 fps frames (the Cinetic defaults), converted to this film's fps. */
export const f60 = (frames: number) => Math.round((frames * FPS) / 60);
