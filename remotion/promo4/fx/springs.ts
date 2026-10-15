// remotion/promo4/fx/springs.ts. Measured at 30 fps: 97 % / contact / overshoot / settled.
import type { Spr } from '../lib/anim';
export const SPX = {
  bubble: { damping: 22, stiffness: 120, mass: 0.9 }, // 14 f / 26 f / 0 / 20 f: hook chits, message bubbles. Calm.
  chip: { damping: 28, stiffness: 220, mass: 0.8 }, // 10 f / 19 f / 0 / 14 f: pins, small UI. Calm.
  pin: { damping: 26, stiffness: 300, mass: 0.7 }, // 7 f / 9 f / 0.2 % / 8 f: pin drop settle after contact
  glide: { damping: 20, stiffness: 80, mass: 1 }, // 18 f / 34 f / 0 / 25 f: camera follow, slow lifts
  landCalm: { damping: 13, stiffness: 110, mass: 1 }, // 8 f / 9 f / 8.3 % / 26 f: THE landing at 30 fps
} satisfies Record<string, Spr>;
