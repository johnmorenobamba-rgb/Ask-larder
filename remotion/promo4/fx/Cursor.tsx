// remotion/promo4/fx/Cursor.tsx
import React from 'react';
import { C } from '../brand';
import { mix, prog, E, clamp } from '../lib/anim';
import { toScreen, type Shot } from '../lib/camera';

type Pt = { x: number; y: number };
export const arc = (a: Pt, b: Pt, t: number, bow = 0.2): Pt => {
  const cx = (a.x + b.x) / 2 - (b.y - a.y) * bow, cy = (a.y + b.y) / 2 + (b.x - a.x) * bow;
  return { x: mix(mix(a.x, cx, t), mix(cx, b.x, t), t), y: mix(mix(a.y, cy, t), mix(cy, b.y, t), t) };
};
/** 0..1: down over 2 f, recoil over 4 f (the 4 / 8 f of the 60 fps reference). */
export const press = (f: number, at: number) => { const t = f - at; return t <= 0 || t >= 6 ? 0 : t < 2 ? t / 2 : 1 - (t - 2) / 4; };

export const Pointer: React.FC<{ x: number; y: number; scale?: number; down?: number; opacity?: number }> = ({ x, y, scale = 1.6, down = 0, opacity = 1 }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, opacity, transformOrigin: '0 0', transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale * (1 - 0.12 * down)})`,
    filter: 'drop-shadow(0 3px 5px rgba(31,27,22,0.28))' }}>
    <svg width={30} height={42} viewBox="0 0 30 42" style={{ position: 'absolute', left: -3, top: -2 }}>
      <path d="M3 2 L3 33 L10.2 26.4 L15 38 L20.2 35.8 L15.4 24.4 L25 24.4 Z" fill={C.ink} stroke={C.parchment} strokeWidth={2.4} strokeLinejoin="round" />
    </svg>
  </div>
);

/** Ripple pinned to a WORLD point: drawn in screen space, radius scales with the shot so it matches the button. */
export const Ripple: React.FC<{ frame: number; at: number; shot: Shot; p: Pt; r?: number; color?: string }> = ({ frame: f, at, shot, p, r = 46, color = C.red }) => {
  const t = prog(f, at, at + 14, E.out);
  if (f < at || t >= 1) return null;
  const s = toScreen(shot, p), R = r * shot.k * mix(0.35, 1, t);
  return <div style={{ position: 'absolute', left: 0, top: 0, width: 2 * R, height: 2 * R, borderRadius: '50%',
    transform: `translate3d(${(s.x - R).toFixed(2)}px, ${(s.y - R).toFixed(2)}px, 0)`,
    boxShadow: `inset 0 0 0 ${Math.max(1.5, 2.5 * (1 - t))}px ${color}`, opacity: 0.55 * (1 - prog(f, at + 4, at + 14, E.smooth)) }} />;
};

/** One gesture: enter, travel on a bow, hover, press, then leave once the product acts on its own. */
export const useGesture = (f: number, shot: Shot, g: { from: Pt; target: Pt /* world */; move: [number, number]; click: number; leaveAfter?: number }) => {
  const tgt = toScreen(shot, g.target); // re projected every frame
  const t = prog(f, g.move[0], g.move[1], E.out);
  const pos = arc(g.from, tgt, t, 0.18);
  const leave = g.leaveAfter ?? 12;
  return {
    pos, tgt,
    hover: clamp(prog(f, g.click - 4, g.click - 1, E.ui)), // hover state ~3 f before the press (6 f at 60)
    down: press(f, g.click),
    opacity: prog(f, g.move[0] - 4, g.move[0], E.smooth) * (1 - prog(f, g.click + leave, g.click + leave + 6, E.smooth)),
  };
};
