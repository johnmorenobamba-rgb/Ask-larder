// remotion/promo4/fx/Subtract.tsx
import React from 'react';
import { E, prog, rand, clamp, mix } from '../lib/anim';

export type Piece = { id: string; x: number; y: number; w: number; h: number; node: React.ReactNode }; // world px, centre at x + w/2

export const Subtract: React.FC<{
  frame: number; at: number; pieces: Piece[]; hero: { x: number; y: number }; dur?: number; reach?: number;
}> = ({ frame: f, at, pieces, hero, dur = 16, reach = 2600 }) => {
  const order = pieces.map((p) => Math.hypot(p.x + p.w / 2 - hero.x, p.y + p.h / 2 - hero.y));
  const maxD = Math.max(...order, 1);
  return (
    <>
      {pieces.map((p, i) => {
        const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
        let dx = cx - hero.x, dy = cy - hero.y;
        const len = Math.hypot(dx, dy) || 1;
        if (len < 1) { dx = 0; dy = -1; } // a piece on the centre leaves upward
        dx /= len; dy /= len;
        const start = at + Math.round((order[i] / maxD) * 6) + Math.floor(rand(`sub${p.id}`) * 4); // nearest first, 0 to 3 f jitter
        const q = prog(f, start, start + dur, E.exit);
        const qPrev = prog(f - 1, start, start + dur, E.exit);
        const v = (q - qPrev) * reach; // px per frame along the ray
        const stretch = 1 + clamp(v / 60, 0, 1) * 0.35; // up to +35 % along travel at 60 px/f
        const ang = Math.atan2(dy, dx);
        const spin = (rand(`spin${p.id}`) - 0.5) * 14 * q; // a few degrees of tumble, seeded
        if (q >= 1) return null;
        return (
          <div key={p.id} style={{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, transformOrigin: '50% 50%',
            transform: `translate3d(${(p.x + dx * reach * q).toFixed(2)}px, ${(p.y + dy * reach * q).toFixed(2)}px, 0) rotate(${ang}rad) scale(${stretch.toFixed(4)}, ${(1 / Math.sqrt(stretch)).toFixed(4)}) rotate(${-ang}rad) rotate(${spin.toFixed(2)}deg)`,
            opacity: 1 - prog(f, start + dur * 0.6, start + dur, E.smooth) }}>
            {p.node}
          </div>
        );
      })}
    </>
  );
};
