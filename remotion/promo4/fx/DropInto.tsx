// remotion/promo4/fx/DropInto.tsx
import React from 'react';
import { E, prog, mix, lmix, spr, squash, fd } from '../lib/anim';
import { toScreen, type Shot } from '../lib/camera';
import { mixColor } from '../lib/color';
import { SPX } from './springs';
import { C } from '../brand';

/**
 * from: the chit's screen rect at `lift` (from shot A). slot: the question slot in WORLD px of the
 * panel, projected through shotB(frame) so the landing tracks a moving camera. The fall is two
 * phases: lift and travel on E.glide, then the last 22 % drops on E.contact (arrives with speed),
 * then landCalm settles it (8 % overshoot, one of the film's two landings) with a squash at the
 * bottom edge.
 */
export const DropInto: React.FC<{
  frame: number; lift: number; contact: number; from: { x: number; y: number; w: number };
  slot: { x: number; y: number; w: number }; shotB: (f: number) => Shot; children: (fill: string, ink: string) => React.ReactNode;
}> = ({ frame: f, lift, contact, from, slot, shotB, children }) => {
  const sB = shotB(f);
  const tl = toScreen(sB, { x: slot.x, y: slot.y });
  const to = { x: tl.x, y: tl.y, w: slot.w * sB.k };
  const hover = { x: to.x, y: to.y - 120 * sB.k, w: to.w }; // 120 world px above the slot
  const t1 = prog(f, lift, contact - 7, E.glide); // travel to the hover point
  const t2 = prog(f, contact - 7, contact, E.contact); // drop into the slot, with speed
  const settle = f >= contact ? spr(f, contact, SPX.landCalm) : 0; // 0 -> ~1.083 -> 1
  const base = { x: mix(from.x, hover.x, t1), y: mix(from.y, hover.y, t1), w: lmix(from.w, hover.w, t1) };
  const yDrop = mix(base.y, to.y, t2) + (f >= contact ? (1 - settle) * -14 * sB.k : 0); // the overshoot reads as a 1 px class rebound
  const sq = squash(f - contact); // along 0.9, across 1.08 at contact, back over ~4 f at 30 fps
  const k = base.w / from.w;
  const fill = mixColor(C.saffron, C.paper, prog(f, contact - 2, contact + 10, E.smooth)); // device colour hands over to the panel's question style
  const ink = C.ink;
  if (fd(f) > contact + 24) return null; // the panel's own element has taken over (identical transform)
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 100%',
      transform: `translate3d(${base.x.toFixed(2)}px, ${yDrop.toFixed(2)}px, 0) scale(${(k * sq.across).toFixed(4)}, ${(k * sq.along).toFixed(4)})` }}>
      {children(fill, ink)}
    </div>
  );
};
