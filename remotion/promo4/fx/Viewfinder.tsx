// remotion/promo4/fx/Viewfinder.tsx
import React from 'react';
import { C } from '../brand';
import { spr, SPR, prog, E, mix, hitPulse, rand } from '../lib/anim';
import { mixColor } from '../lib/color';

/** Hand held wobble in px at frame f: three seeded sines, 0.3 to 1.1 Hz, amplitude `amp`. Pure, repeatable. */
export const handheld = (f: number, amp: number, seed = 'hh') => {
  const s = (i: number, axis: string) => Math.sin((f / 30) * Math.PI * 2 * (0.3 + 0.4 * i + rand(`${seed}${axis}${i}f`) * 0.2) + rand(`${seed}${axis}${i}p`) * 6.283);
  return { x: amp * (0.6 * s(0, 'x') + 0.3 * s(1, 'x') + 0.1 * s(2, 'x')), y: amp * (0.6 * s(0, 'y') + 0.3 * s(1, 'y') + 0.1 * s(2, 'y')) };
};

export const Viewfinder: React.FC<{ frame: number; lockAt: number; target: { x: number; y: number; w: number; h: number } /* screen px */ }> = ({ frame: f, lockAt, target }) => {
  const s = spr(f, lockAt - 6, { ...SPR.detent, overshootClamping: true }); // clamped: brackets never cross the code
  const loose = { w: target.w * 1.35, h: target.h * 1.35 };
  const w = mix(loose.w, target.w + 24, s), h = mix(loose.h, target.h + 24, s);
  const cx = target.x + target.w / 2, cy = target.y + target.h / 2;
  const col = mixColor(C.parchment, C.saffron, prog(f, lockAt - 1, lockAt + 4, E.ui));
  const pulse = 1 + 0.04 * hitPulse(f - lockAt, 2, 5);
  const L = 54, T = 6;
  const corner = (sx: number, sy: number) => (
    <div style={{ position: 'absolute', left: 0, top: 0, width: L, height: L, transformOrigin: '0 0',
      transform: `translate3d(${(cx + sx * w * pulse / 2).toFixed(2)}px, ${(cy + sy * h * pulse / 2).toFixed(2)}px, 0) scale(${sx}, ${sy})`,
      borderLeft: `${T}px solid ${col}`, borderTop: `${T}px solid ${col}`, borderTopLeftRadius: 14 }} />
  );
  const scan = prog(f, lockAt + 2, lockAt + 14, E.smooth);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: mix(0.6, 1, s) }}>
      {corner(-1, -1)}{corner(1, -1)}{corner(-1, 1)}{corner(1, 1)}
      {scan > 0 && scan < 1 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: target.w, height: 3, background: C.saffron, opacity: Math.sin(Math.PI * scan),
          transform: `translate3d(${target.x}px, ${(target.y + target.h * scan).toFixed(2)}px, 0)` }} />
      )}
    </div>
  );
};
