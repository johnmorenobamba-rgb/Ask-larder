// remotion/promo4/fx/Morph.ts: rect morph for "grows from" moves (notification to thread, pin to page)
import { mix, lmix } from '../lib/anim';
export type Rect = { x: number; y: number; w: number; h: number; r: number };
/** Position linear, size in log space (no apparent acceleration), radius linear. */
export const morphRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), w: lmix(a.w, b.w, t), h: lmix(a.h, b.h, t), r: mix(a.r, b.r, t),
});
/** Children of a morphing shell: content fades in only after the shell is 60 % there (shell first, then contents). */
export const contentIn = (t: number) => Math.max(0, (t - 0.6) / 0.4);
